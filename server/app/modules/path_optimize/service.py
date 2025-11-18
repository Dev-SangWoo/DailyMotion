"""
경로 최적화 서비스
최적의 경로를 계산하는 비즈니스 로직입니다.

v3.0 명세서:
- Logic 1.1: 출발 알림
- Logic 1.2: 마지노선 경고 (출근 모드 & 퇴근 모드)
- Logic 2.1: 자동 모드 전환 (Context Awareness)
- Logic 2.2: 고신뢰 대안 경로 제안
- Logic 2.3: 탑승/환승 최적화 가이드
- Logic 3.1: 돌발상황 감지 (지연 감지)
- Logic 3.2: 최종 대안 제시 (택시 제안)
- Logic 4.1: 퇴근 모드 사용자 목표 설정 (Phase 9)
- Logic 4.2: 퇴근 목표별 경로 제안 (Phase 9)
- Logic 4.3: 배터리 최적화 폴링 전략 (Phase 10)

✨ NEW: 실시간/통계 데이터 완전 통합 (Phase 14+)
- 실시간 지하철 도착 정보 (서울시 realtimeStationArrival API)
- 실시간 버스 도착 정보 (국토부/서울 버스 API)
- 평균 시간표 · 평균 소요시간 (statistical_data_map / delay_detector 기반)
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, time, timedelta
import logging
import requests
import xml.etree.ElementTree as ET
import os

from app.core.config import settings
from app.services.context_detector import context_detector
from app.services.gate_validator import gate_validator
from app.services.seating_optimizer import seating_optimizer
from app.services.delay_detector import delay_detector
from app.services.taxi_suggester import taxi_suggester
from app.services.retreat_mode_handler import retreat_mode_handler
from app.services.route_selector_by_goal import route_selector_by_goal
from app.services.polling_scheduler import (
    polling_scheduler,
    PollingFrequency,
    UserLocation,
    TransitState,
    AlertState,
)
from app.modules.path_optimize.last_bus_schedule_repository import (
    get_minutes_until_last_bus,
)
from app.modules.path_optimize.models import (
    UserContextData,
    SystemMode,
    TransportType
)
from app.modules.path_optimize.clients.ai_pattern_client import (
    AIPatternService,
    MockAIPatternService
)
from app.modules.path_optimize.clients.risk_manage_client import (
    RiskManageService,
    MockRiskManageService
)
from app.modules.path_optimize.seoul_subway_congestion_repository import (
    get_subway_congestion,
)

logger = logging.getLogger(__name__)

# =====================================================
# 상수 정의 (Magic Numbers 제거)
# =====================================================

# Logic 1.1 & 1.2: 출발/막차 알림 상수
COMFORTABLE_BUFFER_MINUTES = 10  # v3.0 명세서: 여유 시간 기준 (분)
DEFAULT_FIRST_MILE_DURATION = 5  # First Mile 도보 시간 기본값 (분)
DEFAULT_LAST_MILE_DURATION = 7   # Last Mile 도보 시간 기본값 (분)

# Logic 2.2: 3가지 Gate 검증 상수
MIN_TRANSFER_TIME_MINUTES = 3    # Gate 2: 환승 확정성 (최소 여유 시간)
MAX_CONGESTION_THRESHOLD = 0.80  # Gate 3: 경험의 질 (혼잡도 임계값 80%)
TIME_BENEFIT_THRESHOLD_COMMUTE = 7  # Gate 1: 출근 모드 시간 이득 기준 (분)
SEATING_POSSIBILITY_THRESHOLD = 0.50  # Gate 1: 퇴근 모드 착석 가능성 기준 (50%)

# 에러 코드
ERROR_MISSING_REQUIRED_KEY = "E001"
ERROR_INVALID_TYPE = "E002"
ERROR_INTERNAL_SERVER_ERROR = "E500"

# =====================================================
# 실시간 API 상수 (Phase 14+)
# =====================================================

# 서울시 지하철 실시간 도착 정보 API
SEOUL_SUBWAY_API_KEY = settings.SEOUL_SUBWAY_API_KEY or os.getenv("SEOUL_SUBWAY_API_KEY", "sample")
SEOUL_SUBWAY_API_URL = (
    f"http://swopenapi.seoul.go.kr/api/subway/{SEOUL_SUBWAY_API_KEY}/xml/realtimeStationArrival"
)

# 서울 버스 실시간 도착 정보 API
SEOUL_BUS_API_KEY = settings.SEOUL_BUS_API_KEY or os.getenv("SEOUL_BUS_API_KEY", "sample")
SEOUL_BUS_API_URL = "http://ws.bus.go.kr/api/rest/arrive/getArrInfoByRoute"

# API 타임아웃
API_TIMEOUT_SECONDS = 3

# 지하철 노선 코드 매핑 (ODSay lane.subwayCode → 서울시 API subwayId)
SUBWAY_CODE_MAP = {
    1: "1001",   # 1호선
    2: "1002",   # 2호선
    3: "1003",   # 3호선
    4: "1004",   # 4호선
    5: "1005",   # 5호선
    6: "1006",   # 6호선
    7: "1007",   # 7호선
    8: "1008",   # 8호선
    9: "1009",   # 9호선
}

# 상/하행 매핑 (서울시 API updnLine)
DIRECTION_MAP = {
    1: "상행",  # ODSay wayCode 1 = 상행/내선
    2: "하행",  # ODSay wayCode 2 = 하행/외선
}


def _build_congestion_suffix(transport: Optional[Dict[str, Any]]) -> str:
    """
    추천 교통수단에 포함된 혼잡도 정보를
    사용자 메시지에 붙일 텍스트로 변환합니다.
    """
    if not transport:
        return ""

    congestion_value = transport.get("congestionValue")
    congestion_level = transport.get("congestionLevel")

    if congestion_value is None or not congestion_level:
        return ""

    label_map = {
        "LOW": "여유",
        "MEDIUM": "보통",
        "HIGH": "혼잡",
        "VERY_HIGH": "매우 혼잡",
    }

    label = label_map.get(str(congestion_level), str(congestion_level))

    try:
        value_int = int(round(float(congestion_value)))
    except (TypeError, ValueError):
        return ""

    return f" (현재 열차 혼잡도: {label} ({value_int}%))"


# =====================================================
# 실시간 데이터 클라이언트 클래스 (Phase 14+)
# =====================================================

class SeoulSubwayRealtimeClient:
    """
    서울시 지하철 실시간 도착 정보 API 클라이언트

    API 응답 예시 (XML):
    <row>
        <subwayId>1001</subwayId>
        <updnLine>상행</updnLine>
        <trainLineNm>의정부행</trainLineNm>
        <statnNm>온수</statnNm>
        <barvlDt>300</barvlDt>  <!-- 도착 예정 시간(초) -->
        <arvlMsg2>5분 후 (부천종합운동장)</arvlMsg2>
    </row>
    """

    def __init__(self, api_key: str = SEOUL_SUBWAY_API_KEY, api_url: str = SEOUL_SUBWAY_API_URL):
        self.api_key = api_key
        self.api_url = api_url

    def get_arrival_info(
        self,
        station_name: str,
        subway_line: str,  # "1호선", "2호선", ...
        direction: str = "상행"  # "상행" or "하행"
    ) -> Optional[Dict[str, Any]]:
        """
        지하철 실시간 도착 정보 조회

        Args:
            station_name: 역명 (예: "온수")
            subway_line: 노선명 (예: "1호선", "7호선")
            direction: 상/하행 (예: "상행", "하행")

        Returns:
            {
                "arrivalMinutes": 5,  # 도착까지 남은 시간(분)
                "arrivalSeconds": 300,  # 도착까지 남은 시간(초)
                "trainDirection": "의정부행 - 오류동방면",
                "message": "5분 후 (부천종합운동장)"
            }
            또는 None (실패 시)
        """
        try:
            # 1️⃣ API 호출
            url = f"{self.api_url}/1/50/{station_name}"
            logger.info(f"🚇 지하철 실시간 API 호출: {url}")

            response = requests.get(url, timeout=API_TIMEOUT_SECONDS)
            response.raise_for_status()

            # 2️⃣ XML 파싱
            root = ET.fromstring(response.content)

            # 3️⃣ 노선 코드 매핑 (예: "1호선" → "1001")
            line_number = int(subway_line.replace("호선", ""))
            target_subway_id = SUBWAY_CODE_MAP.get(line_number)

            if not target_subway_id:
                logger.warning(f"⚠️ 지하철 노선 매핑 실패: {subway_line}")
                return None

            # 4️⃣ 필터링: stationName, subwayId, updnLine 일치하는 열차 찾기
            trains = []
            for row in root.findall(".//row"):
                row_subway_id = row.findtext("subwayId")
                row_updn_line = row.findtext("updnLine")
                row_station = row.findtext("statnNm")

                # 기본 조건: 노선/역 일치
                if not (row_subway_id == target_subway_id and row_station == station_name):
                    continue

                # 4-1️⃣ 2호선(1002) 예외 처리: 내선/외선 ↔ 상행/하행 매핑
                direction_match = False
                if line_number == 2:
                    if direction == "상행" and row_updn_line in ("내선", "상행"):
                        direction_match = True
                    elif direction == "하행" and row_updn_line in ("외선", "하행"):
                        direction_match = True
                else:
                    direction_match = (row_updn_line == direction)

                if direction_match:

                    barvl_dt = row.findtext("barvlDt")  # 도착 예정 시간(초)
                    if barvl_dt and barvl_dt.isdigit():
                        trains.append({
                            "arrivalSeconds": int(barvl_dt),
                            "trainDirection": row.findtext("trainLineNm", ""),
                            "message": row.findtext("arvlMsg2", ""),
                            "arvlCd": row.findtext("arvlCd", "99"),  # 0=진입, 1=도착, 99=진입전
                        })

            # 5️⃣ 가장 임박한 열차 선택 (barvlDt 최소값)
            if not trains:
                logger.warning(f"⚠️ 실시간 열차 정보 없음: {station_name} {subway_line} {direction}")
                return None

            best_train = min(trains, key=lambda x: x["arrivalSeconds"])

            result = {
                "arrivalMinutes": best_train["arrivalSeconds"] // 60,
                "arrivalSeconds": best_train["arrivalSeconds"],
                "trainDirection": best_train["trainDirection"],
                "message": best_train["message"],
            }

            logger.info(f"✅ 지하철 실시간 정보: {station_name} {subway_line} - {result['arrivalMinutes']}분 후")
            return result

        except requests.RequestException as e:
            logger.warning(f"⚠️ 지하철 실시간 API 호출 실패: {str(e)}")
            return None
        except ET.ParseError as e:
            logger.warning(f"⚠️ 지하철 XML 파싱 실패: {str(e)}")
            return None
        except Exception as e:
            logger.warning(f"⚠️ 지하철 실시간 정보 조회 실패: {str(e)}")
            return None


class SeoulBusRealtimeClient:
    """
    서울 버스 실시간 도착 정보 API 클라이언트

    API 응답 예시 (XML):
    <itemList>
        <busRouteId>100100578</busRouteId>
        <rtNm>3321</rtNm>
        <stId>124000414</stId>
        <staOrd>29</staOrd>
        <arrmsg1>10분1초후[6번째 전]</arrmsg1>
        <exps1>594</exps1>  <!-- 첫 번째 버스 도착 예정 시간(초) -->
        <arrmsg2>28분57초후[14번째 전]</arrmsg2>
        <exps2>1701</exps2>  <!-- 두 번째 버스 도착 예정 시간(초) -->
    </itemList>
    """

    def __init__(self, api_key: str = SEOUL_BUS_API_KEY, api_url: str = SEOUL_BUS_API_URL):
        self.api_key = api_key
        self.api_url = api_url
        # busNo → busRouteId 매핑 캐시 (메모리 캐싱)
        self._route_id_cache: Dict[str, Optional[str]] = {}

    def get_arrival_info(
        self,
        bus_route_id: str,  # 예: "100100578"
        station_ord: Optional[int] = None  # 정류소 순번 (검증용, 선택)
    ) -> Optional[Dict[str, Any]]:
        """
        버스 실시간 도착 정보 조회

        Args:
            bus_route_id: 버스 노선 ID
            station_ord: 정류소 순번 (선택)

        Returns:
            {
                "arrivalMinutes": 10,  # 도착까지 남은 시간(분)
                "arrivalSeconds": 594,  # 도착까지 남은 시간(초)
                "busNumber": "3321",
                "message": "10분1초후[6번째 전]"
            }
            또는 None (실패 시)
        """
        try:
            # 1️⃣ API 호출
            params = {
                "serviceKey": self.api_key,
                "busRouteId": bus_route_id,
            }

            logger.info(f"🚌 버스 실시간 API 호출: {bus_route_id}")

            response = requests.get(self.api_url, params=params, timeout=API_TIMEOUT_SECONDS)
            response.raise_for_status()

            # 2️⃣ XML 파싱
            root = ET.fromstring(response.content)

            # 3️⃣ itemList 찾기
            buses = []
            for item in root.findall(".//itemList"):
                item_route_id = item.findtext("busRouteId")

                if item_route_id == bus_route_id:
                    # 첫 번째 버스
                    exps1 = item.findtext("exps1")
                    if exps1 and exps1.isdigit():
                        buses.append({
                            "arrivalSeconds": int(exps1),
                            "busNumber": item.findtext("rtNm", ""),
                            "message": item.findtext("arrmsg1", ""),
                        })

                    # 두 번째 버스
                    exps2 = item.findtext("exps2")
                    if exps2 and exps2.isdigit():
                        buses.append({
                            "arrivalSeconds": int(exps2),
                            "busNumber": item.findtext("rtNm", ""),
                            "message": item.findtext("arrmsg2", ""),
                        })

            # 4️⃣ 가장 임박한 버스 선택 (exps 최소값)
            if not buses:
                logger.warning(f"⚠️ 실시간 버스 정보 없음: {bus_route_id}")
                return None

            best_bus = min(buses, key=lambda x: x["arrivalSeconds"])

            result = {
                "arrivalMinutes": best_bus["arrivalSeconds"] // 60,
                "arrivalSeconds": best_bus["arrivalSeconds"],
                "busNumber": best_bus["busNumber"],
                "message": best_bus["message"],
            }

            logger.info(f"✅ 버스 실시간 정보: {bus_route_id} - {result['arrivalMinutes']}분 후")
            return result

        except requests.RequestException as e:
            logger.warning(f"⚠️ 버스 실시간 API 호출 실패: {str(e)}")
            return None
        except ET.ParseError as e:
            logger.warning(f"⚠️ 버스 XML 파싱 실패: {str(e)}")
            return None
        except Exception as e:
            logger.warning(f"⚠️ 버스 실시간 정보 조회 실패: {str(e)}")
            return None

    def search_bus_route_id(self, bus_no: str) -> Optional[str]:
        """
        버스 노선 번호로 서울 API의 busRouteId 조회 (캐싱 적용)

        Args:
            bus_no: 버스 노선 번호 (예: "5615")

        Returns:
            서울 API busRouteId (예: "100100272") 또는 None
        """
        # 1️⃣ 캐시 확인
        if bus_no in self._route_id_cache:
            cached_id = self._route_id_cache[bus_no]
            if cached_id:
                logger.info(f"🔍 버스 노선 ID 캐시 히트: {bus_no} → {cached_id}")
            return cached_id

        # 2️⃣ API 호출
        try:
            route_list_url = "http://ws.bus.go.kr/api/rest/busRouteInfo/getBusRouteList"
            params = {
                "serviceKey": self.api_key,
                "strSrch": bus_no,
            }

            logger.info(f"🔍 버스 노선 ID 검색: {bus_no}")

            response = requests.get(route_list_url, params=params, timeout=API_TIMEOUT_SECONDS)
            response.raise_for_status()

            # 3️⃣ XML 파싱
            root = ET.fromstring(response.content)
            items = root.findall(".//itemList")

            if not items:
                logger.warning(f"⚠️ 버스 노선 검색 결과 없음: {bus_no}")
                self._route_id_cache[bus_no] = None
                return None

            # 4️⃣ 첫 번째 매칭 결과 사용
            first_item = items[0]
            bus_route_id = first_item.findtext("busRouteId", "").strip()
            bus_route_nm = first_item.findtext("busRouteNm", "").strip()

            if not bus_route_id:
                logger.warning(f"⚠️ busRouteId 없음: {bus_no}")
                self._route_id_cache[bus_no] = None
                return None

            # 5️⃣ 캐싱 후 반환
            self._route_id_cache[bus_no] = bus_route_id
            logger.info(f"✅ 버스 노선 ID 발견: {bus_no} ({bus_route_nm}) → {bus_route_id}")

            return bus_route_id

        except requests.RequestException as e:
            logger.warning(f"⚠️ 버스 노선 검색 API 호출 실패: {str(e)}")
            return None
        except ET.ParseError as e:
            logger.warning(f"⚠️ 버스 노선 검색 XML 파싱 실패: {str(e)}")
            return None
        except Exception as e:
            logger.warning(f"⚠️ 버스 노선 검색 실패: {str(e)}")
            return None


# =====================================================
# 헬퍼 함수들 (Phase 14+)
# =====================================================

def _map_direction(way_code: int) -> str:
    """
    ODSay wayCode를 서울시 API updnLine으로 매핑

    Args:
        way_code: ODSay 상/하행 코드 (1=상행/내선, 2=하행/외선)

    Returns:
        "상행" or "하행"
    """
    return DIRECTION_MAP.get(way_code, "상행")


def extract_target_subway_segment(routes_data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    ODSay routes_data에서 첫 번째 지하철 구간 추출

    Args:
        routes_data: ODSay API 응답 (parse_route_info로 파싱된 데이터)

    Returns:
        {
            "startName": "온수",
            "endName": "을지로입구",
            "subwayCode": 1,  # 1호선
            "wayCode": 1,  # 상행
            "lane": {...}  # 원본 lane 정보
        }
        또는 None
    """
    if not routes_data or "paths" not in routes_data:
        return None

    paths = routes_data.get("paths", [])
    if not paths:
        return None

    fastest_path = paths[0]
    sub_path = fastest_path.get("subPath", [])

    for segment in sub_path:
        if segment.get("trafficType") == 1:  # 1=지하철
            lane_list = segment.get("lane", [])
            if not lane_list:
                continue

            lane = lane_list[0]

            return {
                "startName": segment.get("startName"),
                "endName": segment.get("endName"),
                "subwayCode": lane.get("subwayCode"),  # 1, 2, 3, ...
                "wayCode": segment.get("wayCode", 1),  # 1=상행, 2=하행
                "lane": lane,
                "segment": segment,
            }

    return None


def extract_target_bus_segment(routes_data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    ODSay routes_data에서 첫 번째 버스 구간 추출

    Args:
        routes_data: ODSay API 응답

    Returns:
        {
            "startName": "굽은다리사거리",
            "endName": "고덕그라시움",
            "busRouteId": "100100578",
            "busNo": "3321",
            "lane": {...}
        }
        또는 None
    """
    if not routes_data or "paths" not in routes_data:
        return None

    paths = routes_data.get("paths", [])
    if not paths:
        return None

    fastest_path = paths[0]
    sub_path = fastest_path.get("subPath", [])

    for segment in sub_path:
        if segment.get("trafficType") == 2:  # 2=버스
            lane_list = segment.get("lane", [])
            if not lane_list:
                continue

            lane = lane_list[0]

            return {
                "startName": segment.get("startName"),
                "endName": segment.get("endName"),
                "busRouteId": lane.get("busID"),  # "100100578"
                "busNo": lane.get("busNo"),  # "3321"
                "lane": lane,
                "segment": segment,
            }

    return None


def select_best_realtime_train(trains: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    실시간 열차 목록에서 가장 임박한 열차 선택

    Args:
        trains: 실시간 열차 정보 리스트

    Returns:
        가장 임박한 열차 정보 또는 None
    """
    if not trains:
        return None

    return min(trains, key=lambda x: x.get("arrivalSeconds", float("inf")))


def select_best_realtime_bus(buses: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    실시간 버스 목록에서 가장 임박한 버스 선택

    Args:
        buses: 실시간 버스 정보 리스트

    Returns:
        가장 임박한 버스 정보 또는 None
    """
    if not buses:
        return None

    return min(buses, key=lambda x: x.get("arrivalSeconds", float("inf")))


class PathOptimizeService:
    """
    경로 최적화 서비스 클래스

    Phase 13: 타 모듈과의 통신을 위해 Service Layer Interface 패턴 도입
    - ai_pattern_service: AI Pattern 모듈과의 통신
    - risk_manage_service: Risk Manage 모듈과의 통신

    Phase 14+: 실시간/통계 데이터 완전 통합
    - SeoulSubwayRealtimeClient: 지하철 실시간 API
    - SeoulBusRealtimeClient: 버스 실시간 API
    - statistical_data_map: 평균 시간표/소요시간

    의존성 주입(Dependency Injection) 패턴을 사용하여 느슨한 결합 구현
    """

    def __init__(
        self,
        ai_pattern_service: Optional[AIPatternService] = None,
        risk_manage_service: Optional[RiskManageService] = None
    ):
        """
        PathOptimizeService 초기화

        Args:
            ai_pattern_service: AI Pattern Service (None이면 MockAIPatternService 사용)
            risk_manage_service: Risk Manage Service (None이면 MockRiskManageService 사용)
        """
        # 의존성 주입: 실제 구현 또는 Mock 사용
        self.ai_pattern_service = ai_pattern_service or MockAIPatternService()
        self.risk_manage_service = risk_manage_service or MockRiskManageService()

        # 실시간 데이터 클라이언트 초기화
        self.subway_client = SeoulSubwayRealtimeClient()
        self.bus_client = SeoulBusRealtimeClient()

        logger.info(
            f"PathOptimizeService initialized with "
            f"ai_pattern={type(self.ai_pattern_service).__name__}, "
            f"risk_manage={type(self.risk_manage_service).__name__}"
        )

    # =====================================================
    # 핵심 메서드: 실시간/통계 데이터 통합 (Phase 14+)
    # =====================================================

    @staticmethod
    def _calc_departure_in_minutes(
        departure_time_str: str,
        current_time: datetime,
    ) -> Optional[int]:
        """
        '08:35' 또는 '0835' 같은 문자열을 받아서
        현재 시간(current_time) 기준으로 몇 분 뒤인지 계산

        ⚠️ Phase 14+: 예외 없이 안전하게 int 반환 (실패 시 None)

        Args:
            departure_time_str: 출발 시간 문자열 ("HH:MM" or "HHMM")
            current_time: 현재 시간

        Returns:
            출발까지 남은 시간(분) 또는 None (파싱 실패 시)
        """
        try:
            # "HH:MM" 형식 지원
            if ":" in departure_time_str:
                hour_str, minute_str = departure_time_str.split(":")
                hour = int(hour_str)
                minute = int(minute_str)
            else:
                # "HHMM" 형식 지원 (예: "0835")
                if len(departure_time_str) != 4 or not departure_time_str.isdigit():
                    logger.warning(f"⚠️ 잘못된 출발 시간 형식: {departure_time_str}")
                    return None
                hour = int(departure_time_str[:2])
                minute = int(departure_time_str[2:])

            departure_dt = current_time.replace(
                hour=hour,
                minute=minute,
                second=0,
                microsecond=0,
            )

            diff_minutes = int((departure_dt - current_time).total_seconds() // 60)
            return diff_minutes
        except Exception as e:
            logger.warning(f"⚠️ 출발 시간 계산 실패: {str(e)}")
            return None

    def _extract_recommended_transport(
        self,
        routes_data: Optional[Dict[str, Any]],
        current_time: datetime,
        commute_settings: Optional[Dict[str, Any]] = None,
        statistical_data_map: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        ODSAY routes_data에서 추천 교통수단 추출 (실시간/통계 데이터 통합)

        ✨ Phase 14+ 핵심 로직:
        우선순위 1: 실시간 데이터 (지하철/버스 API)
        우선순위 2: 통계 데이터 (statistical_data_map)
        우선순위 3: ODSAY 기본 데이터

        Args:
            routes_data: ODSAY API 응답 (parse_route_info로 파싱된 데이터)
            current_time: 현재 시간
            commute_settings: 사용자 출퇴근 설정 (선택)
            statistical_data_map: 평균 시간표/소요시간 데이터 (선택)

        Returns:
            {
                "type": "BUS" | "SUBWAY",
                "name": "146번" | "2호선",
                "departureInMinutes": 5,
                "transitTimeMinutes": 28,  # 실시간 or 평균 or ODSay
                "isRealtime": True  # 실시간 데이터 사용 여부
            }
            또는 None (데이터 없을 때)
        """
        if not routes_data or "paths" not in routes_data or not routes_data["paths"]:
            logger.warning("⚠️ ODSAY routes_data 없음")
            return None

        try:
            # 가장 빠른 경로 선택 (첫 번째)
            fastest_path = routes_data["paths"][0]
            sub_path = fastest_path.get("subPath", [])
            logger.info(
                "📊 ODSAY 최적 경로 요약: "
                f"totalTimeMinutes={fastest_path.get('totalTimeMinutes')}, "
                f"busCount={fastest_path.get('busCount')}, "
                f"subwayCount={fastest_path.get('subwayCount')}, "
                f"transferCount={fastest_path.get('transferCount')}"
            )

            if not sub_path:
                logger.warning("⚠️ subPath 정보 없음")
                return None

            # ========================================
            # Step 1: 첫 번째 대중교통 찾기
            # ========================================
            for segment in sub_path:
                traffic_type = segment.get("trafficType")
                if traffic_type not in (1, 2):  # 1=지하철, 2=버스
                    continue

                lane_list = segment.get("lane") or []
                lane = lane_list[0] if lane_list else {}

                # ODSay 기본 정보
                departure_time_str = segment.get("departureTime") or segment.get("startTime")
                departure_in_minutes_odsay = None
                if departure_time_str:
                    departure_in_minutes_odsay = self._calc_departure_in_minutes(
                        departure_time_str, current_time
                    )

                # ========================================
                # Step 2: 지하철인 경우 → 실시간 API 시도
                # ========================================
                if traffic_type == 1:  # 지하철
                    name = (
                        lane.get("name")
                        or lane.get("subwayName")
                        or segment.get("startName")
                        or "지하철"
                    )

                    # ✅ BUG FIX 2: lineNumber & destination 추출
                    subway_code = lane.get("subwayCode")  # 1, 2, 3, ...
                    way_code = segment.get("wayCode", 1)  # 1=상행, 2=하행

                    line_number = f"{subway_code}호선" if subway_code else name
                    destination = _map_direction(way_code)  # "상행" or "하행"

                    # 혼잡도(서울교통공사 평균) 조회 시도 - Phase C-1.2
                    congestion_info = None
                    try:
                        start_station_id = segment.get("startID") or segment.get("startStationID")
                        if start_station_id is not None and subway_code:
                            congestion_info = get_subway_congestion(
                                odsay_station_id=int(start_station_id),
                                subway_code=int(subway_code),
                                way_code=int(way_code),
                                now=current_time,
                            )
                            if congestion_info:
                                logger.info(
                                    "🚇 평균 혼잡도 조회: "
                                    f"{congestion_info.station_name} "
                                    f"{congestion_info.line_name} "
                                    f"{congestion_info.congestion_value:.1f}% "
                                    f"({congestion_info.congestion_level})"
                                )
                    except Exception as e:
                        logger.warning(f"⚠️ 지하철 혼잡도 조회 실패: {str(e)}")

                    # 실시간 데이터 조회 시도
                    realtime_info = None
                    try:
                        station_name = segment.get("startName")

                        if subway_code and station_name:
                            subway_line = f"{subway_code}호선"
                            direction = destination

                            logger.info(f"🚇 지하철 실시간 조회 시도: {station_name} {subway_line} {direction}")
                            realtime_info = self.subway_client.get_arrival_info(
                                station_name=station_name,
                                subway_line=subway_line,
                                direction=direction
                            )
                    except Exception as e:
                        logger.warning(f"⚠️ 지하철 실시간 API 호출 예외: {str(e)}")

                    # 혼잡도 페이로드 (있으면 추천 교통수단에 함께 포함)
                    congestion_payload: Dict[str, Any] = {}
                    if congestion_info:
                        congestion_payload = {
                            "congestionValue": congestion_info.congestion_value,
                            "congestionLevel": congestion_info.congestion_level,
                        }

                    # 실시간 성공 시
                    if realtime_info:
                        logger.info(f"✅ 지하철 실시간 데이터 사용: {name} - {realtime_info['arrivalMinutes']}분 후")
                        return {
                            "type": "SUBWAY",
                            "name": name,
                            "lineNumber": line_number,
                            "destination": destination,
                            "departureInMinutes": realtime_info["arrivalMinutes"],
                            "transitTimeMinutes": fastest_path.get("totalTimeMinutes", 30),
                            "isRealtime": True,
                            **congestion_payload,
                        }

                    # 통계 데이터 확인
                    if statistical_data_map:
                        key = f"SUBWAY_{name}_{segment.get('startName')}_{segment.get('endName')}"
                        stat_data = statistical_data_map.get(key)
                        if stat_data:
                            logger.info(f"✅ 지하철 통계 데이터 사용: {name}")
                            return {
                                "type": "SUBWAY",
                                "name": name,
                                "lineNumber": line_number,
                                "destination": destination,
                                "departureInMinutes": stat_data.get("avgDepartureInterval", 5),
                                "transitTimeMinutes": stat_data.get("avgTransitTime", 30),
                                "isRealtime": False,
                                **congestion_payload,
                            }

                    # ✅ BUG FIX 1: departureInMinutes Null 방지 - Fallback 기본값 사용
                    # Fallback: ODSay 데이터
                    logger.info(f"✅ 지하철 ODSay 데이터 사용 (Fallback): {name}")
                    return {
                        "type": "SUBWAY",
                        "name": name,
                        "lineNumber": line_number,
                        "destination": destination,
                        "departureInMinutes": departure_in_minutes_odsay or DEFAULT_FIRST_MILE_DURATION,
                        "transitTimeMinutes": fastest_path.get("totalTimeMinutes", 30),
                        "isRealtime": False,
                        **congestion_payload,
                    }

                # ========================================
                # Step 3: 버스인 경우 → 실시간 API 시도
                # ========================================
                elif traffic_type == 2:  # 버스
                    name = (
                        lane.get("busNo")
                        or lane.get("name")
                        or segment.get("startName")
                        or "버스"
                    )

                    # 디버깅용: ODSAY 버스 lane 원본 데이터 전체 로깅
                    logger.info(f"🚌 ODSAY 버스 lane raw: {lane}")

                    # ✅ BUG FIX 2: lineNumber & destination 추출
                    bus_no = lane.get("busNo") or name
                    line_number = f"{bus_no}번" if bus_no and not bus_no.endswith("번") else bus_no

                    # 버스 방면 정보 추출 (ODSay의 way 필드 또는 기본값)
                    way_info = segment.get("way") or lane.get("type") or "종점"
                    destination = f"{way_info} 방면"

                    # 실시간 데이터 조회 시도
                    realtime_info = None
                    try:
                        # ✅ FIX: 버스 번호로 먼저 busRouteId 검색 후 실시간 정보 조회
                        # ODSAY의 busLocalBlID는 서울 API busRouteId와 매핑이 안 되므로
                        # busNo (예: "5615")로 먼저 검색해서 올바른 busRouteId를 찾는다.
                        bus_no = lane.get("busNo", "").strip()

                        if bus_no:
                            logger.info(
                                f"🚌 버스 실시간 조회 시도: "
                                f"busNo={bus_no}, "
                                f"ODSAY_busLocalBlID={lane.get('busLocalBlID')}, "
                                f"ODSAY_busID={lane.get('busID')}"
                            )

                            # 1단계: 버스 번호로 busRouteId 검색 (캐싱 적용)
                            bus_route_id = self.bus_client.search_bus_route_id(bus_no)

                            # 2단계: 찾은 busRouteId로 실시간 도착 정보 조회
                            if bus_route_id:
                                realtime_info = self.bus_client.get_arrival_info(
                                    bus_route_id=bus_route_id
                                )
                            else:
                                logger.warning(f"⚠️ 버스 노선 ID를 찾을 수 없음: {bus_no}")
                    except Exception as e:
                        logger.warning(f"⚠️ 버스 실시간 API 호출 예외: {str(e)}")

                    # 실시간 성공 시
                    if realtime_info:
                        # 실시간 응답에 노선 번호가 있으면 우선 사용
                        realtime_bus_no = realtime_info.get("busNumber") or name
                        if realtime_bus_no:
                            name = realtime_bus_no
                            line_number = (
                                f"{realtime_bus_no}번"
                                if not str(realtime_bus_no).endswith("번")
                                else str(realtime_bus_no)
                            )

                        logger.info(f"✅ 버스 실시간 데이터 사용: {name} - {realtime_info['arrivalMinutes']}분 후")
                        return {
                            "type": "BUS",
                            "name": name,
                            "lineNumber": line_number,
                            "destination": destination,
                            "departureInMinutes": realtime_info["arrivalMinutes"],
                            "transitTimeMinutes": fastest_path.get("totalTimeMinutes", 30),
                            "isRealtime": True
                        }

                    # 통계 데이터 확인
                    if statistical_data_map:
                        key = f"BUS_{name}_{segment.get('startName')}_{segment.get('endName')}"
                        stat_data = statistical_data_map.get(key)
                        if stat_data:
                            logger.info(f"✅ 버스 통계 데이터 사용: {name}")
                            return {
                                "type": "BUS",
                                "name": name,
                                "lineNumber": line_number,
                                "destination": destination,
                                "departureInMinutes": stat_data.get("avgDepartureInterval", 5),
                                "transitTimeMinutes": stat_data.get("avgTransitTime", 30),
                                "isRealtime": False
                            }

                    # ✅ BUG FIX 1: departureInMinutes Null 방지 - Fallback 기본값 사용
                    # Fallback: ODSay 데이터
                    logger.info(f"✅ 버스 ODSay 데이터 사용 (Fallback): {name}")
                    return {
                        "type": "BUS",
                        "name": name,
                        "lineNumber": line_number,
                        "destination": destination,
                        "departureInMinutes": departure_in_minutes_odsay or DEFAULT_FIRST_MILE_DURATION,
                        "transitTimeMinutes": fastest_path.get("totalTimeMinutes", 30),
                        "isRealtime": False
                    }

            logger.warning("⚠️ subPath에서 대중교통 정보 없음")
            return None

        except (KeyError, IndexError, TypeError) as e:
            logger.warning(f"⚠️ ODSAY 데이터 파싱 오류: {str(e)}")
            return None

    # ========================================
    # Logic 2.4: 환승 리마인더 & 실시간 환승 열차 안내
    # ========================================

    def get_transfer_reminder(
        self,
        current_latitude: float,
        current_longitude: float,
        transfer_points: List[Dict[str, Any]],
        current_time: datetime,
        radius_meters: float = 500.0,
    ) -> Dict[str, Any]:
        """
        Logic 2.4 - 환승 리마인더 & 실시간 환승 열차 안내

        Args:
            current_latitude: 사용자 현재 위도
            current_longitude: 사용자 현재 경도
            transfer_points: 환승 지점 목록
                [
                    {
                        "stationName": "온수",
                        "latitude": 37.4923,
                        "longitude": 126.8234,
                        "transportType": "SUBWAY" | "BUS",
                        "subwayLine": "7호선",
                        "direction": "상행"  # 선택
                    },
                    ...
                ]
            current_time: 현재 시각
            radius_meters: 환승역 반경 (기본값: 500m)

        Returns:
            {
                "data": {
                    "action": "TRANSFER_REMINDER" | "NO_ACTION",
                    "stationName": str | None,
                    "line": str | None,
                    "arrivalMinutes": int | None,
                    "isRealtime": bool,
                    "message": str,
                    "timestamp": "ISO 8601"
                }
            }
        """
        try:
            if not transfer_points:
                logger.info("ℹ️ 환승 지점 정보 없음")
                return {
                    "data": {
                        "action": "NO_ACTION",
                        "stationName": None,
                        "line": None,
                        "arrivalMinutes": None,
                        "isRealtime": False,
                        "message": "환승 지점 정보가 없습니다.",
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                }

            # 1️⃣ 현재 위치와 가장 가까운 환승 지점 탐색 (반경 내)
            nearest_point = None
            nearest_distance = float("inf")

            for point in transfer_points:
                lat = point.get("latitude")
                lon = point.get("longitude")
                if lat is None or lon is None:
                    continue

                distance = context_detector.calculate_distance(
                    current_latitude,
                    current_longitude,
                    lat,
                    lon,
                )

                if distance < nearest_distance:
                    nearest_distance = distance
                    nearest_point = point

            if nearest_point is None or nearest_distance > radius_meters:
                logger.info(
                    f"ℹ️ 환승 지점 반경 밖: 최소 거리 {nearest_distance:.0f}m (임계값: {radius_meters}m)"
                )
                return {
                    "data": {
                        "action": "NO_ACTION",
                        "stationName": None,
                        "line": None,
                        "arrivalMinutes": None,
                        "isRealtime": False,
                        "message": "근처 환승역이 없습니다.",
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                }

            station_name = nearest_point.get("stationName", "")
            transport_type = nearest_point.get("transportType", "SUBWAY")
            line = None
            arrival_minutes = None
            is_realtime = False

            # 2️⃣ 실시간 도착 정보 조회 (지하철/버스)
            if transport_type == "SUBWAY":
                subway_line = nearest_point.get("subwayLine", "")
                direction = nearest_point.get("direction", "상행")
                line = subway_line

                try:
                    realtime_info = self.subway_client.get_arrival_info(
                        station_name=station_name,
                        subway_line=subway_line,
                        direction=direction,
                    )
                    if realtime_info:
                        arrival_minutes = realtime_info.get("arrivalMinutes")
                        is_realtime = True
                except Exception as e:
                    logger.warning(f"⚠️ 지하철 실시간 정보 조회 실패 (Logic 2.4): {str(e)}")

            elif transport_type == "BUS":
                bus_number = nearest_point.get("busNumber")
                bus_route_id = nearest_point.get("busRouteId")
                line = bus_number

                try:
                    if bus_route_id:
                        realtime_info_bus = self.bus_client.get_arrival_info(
                            bus_route_id=str(bus_route_id)
                        )
                        if realtime_info_bus:
                            arrival_minutes = realtime_info_bus.get("arrivalMinutes")
                            is_realtime = True
                except Exception as e:
                    logger.warning(f"⚠️ 버스 실시간 정보 조회 실패 (Logic 2.4): {str(e)}")

            # 3️⃣ 메시지 생성
            if transport_type == "SUBWAY":
                line_label = line or "지하철"
            elif transport_type == "BUS":
                line_label = f"{line}번 버스" if line else "버스"
            else:
                line_label = "대중교통"

            if arrival_minutes is not None:
                arrival_text = f"약 {arrival_minutes}분 후 도착 예정입니다."
            else:
                arrival_text = "곧 도착 예정입니다."

            message = (
                f"다음 역인 [{station_name}]에서 [{line_label}]으로 환승하셔야 합니다. "
                f"{arrival_text}"
            )

            logger.info(
                f"✅ 환승 리마인더 생성: {station_name} ({nearest_distance:.0f}m, {line_label})"
            )

            return {
                "data": {
                    "action": "TRANSFER_REMINDER",
                    "stationName": station_name,
                    "line": line,
                    "arrivalMinutes": arrival_minutes,
                    "isRealtime": is_realtime,
                    "message": message,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            }

        except Exception as e:
            logger.error(f"❌ 환승 리마인더 계산 실패: {str(e)}")
            return {
                "data": {
                    "action": "NO_ACTION",
                    "stationName": None,
                    "line": None,
                    "arrivalMinutes": None,
                    "isRealtime": False,
                    "message": f"환승 정보를 계산할 수 없습니다: {str(e)}",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            }

    def optimize_path(
        self,
        start_point: Dict[str, Any],
        end_point: Dict[str, Any],
        constraints: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        경로를 최적화합니다.

        Args:
            start_point: 시작 지점
            end_point: 종료 지점
            constraints: 제약 조건 (예: 위험 지역 회피)

        Returns:
            최적화된 경로
        """
        # TODO: 실제 경로 최적화 로직 구현
        # - PostGIS를 사용한 공간 쿼리
        # - 위험 지역 회피
        # - 최단 경로 계산
        return {
            "optimized_path": [],
            "distance": 0,
            "estimated_time": 0,
            "risk_score": 0.0
        }

    def get_optimization_history(self, user_id: int) -> List[Dict[str, Any]]:
        """
        최적화 이력을 조회합니다.

        Args:
            user_id: 사용자 ID

        Returns:
            최적화 이력 목록
        """
        # TODO: 데이터베이스에서 이력 조회
        return []

    def calculate_risk_score(self, path: List[Dict[str, Any]]) -> float:
        """
        경로의 위험도를 계산합니다.

        Args:
            path: 경로 좌표 리스트

        Returns:
            위험도 점수 (0.0 ~ 1.0)
        """
        # TODO: 위험 지역과의 거리 계산
        # TODO: 리포트 데이터 기반 위험도 계산
        return 0.0

    def get_commute_briefing(
        self,
        commute_settings: Dict[str, Any],
        current_time: datetime,
        routes_data: Optional[Dict[str, Any]] = None,
        statistical_data_map: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        출근 브리핑 조회 (실시간/통계 데이터 완전 통합)

        v3.0 명세서 [Logic 1.1] 출발 알림 + [Logic 1.2] 마지노선 경고 구현
        ✨ Phase 14+: 슬랙(Slack) 기반 정확한 판단 로직 강화

        Args:
            commute_settings: 사용자 출퇴근 설정
                - homeAddress: 집 주소
                - workAddress: 회사 주소
                - targetArrivalTime: 목표 도착 시간 (time 객체)
                - firstMileDefaultDuration: First Mile 도보 시간 (분)
                - lastMileDefaultDuration: Last Mile 도보 시간 (분)
            current_time: 현재 시간 (datetime 객체)
            routes_data: ODSAY API 응답 데이터 (선택)
            statistical_data_map: 평균 시간표/소요시간 데이터 (선택)

        Returns:
            OpenAPI 스펙 준수 응답 구조:
            {
                "data": {
                    "alertType": "GO_NOW" | "LAST_CHANCE" | "NO_ACTION",
                    "message": "사용자 메시지",
                    "recommendedTransport": {
                        "type": "BUS" | "SUBWAY" | "WALK" | "TAXI",
                        "name": "교통수단 이름",
                        "departureInMinutes": 출발까지 남은 시간 (분),
                        "transitTimeMinutes": 예상 소요 시간 (분),
                        "isRealtime": True/False
                    }
                }
            }
        """
        try:
            # 1️⃣ 입력 검증
            if "targetArrivalTime" not in commute_settings:
                logger.error("❌ targetArrivalTime 필수 필드 누락")
                return {
                    "error": {
                        "code": ERROR_MISSING_REQUIRED_KEY,
                        "message": "targetArrivalTime is required"
                    }
                }

            if not isinstance(commute_settings["targetArrivalTime"], time):
                logger.error("❌ targetArrivalTime은 time 객체여야 함")
                return {
                    "error": {
                        "code": ERROR_INVALID_TYPE,
                        "message": "targetArrivalTime must be a time object"
                    }
                }

            # 2️⃣ 목표 도착 시간을 datetime으로 변환 (오늘 날짜 기준)
            target_arrival = datetime.combine(
                current_time.date(),
                commute_settings["targetArrivalTime"]
            )

            # 3️⃣ First Mile 도보 시간
            first_mile_duration = commute_settings.get(
                "firstMileDefaultDuration",
                DEFAULT_FIRST_MILE_DURATION
            )

            # ✅ BUG FIX 3: Last Mile 도보 시간 추출 (Door-to-Door 완성)
            last_mile_duration = commute_settings.get(
                "lastMileDefaultDuration",
                DEFAULT_LAST_MILE_DURATION
            )

            # 4️⃣ 실시간/통계 데이터 통합 교통수단 추출
            recommended_transport = self._extract_recommended_transport(
                routes_data=routes_data,
                current_time=current_time,
                commute_settings=commute_settings,
                statistical_data_map=statistical_data_map,
            )

            # ========================================
            # Phase 14+ 핵심 로직: 슬랙(Slack) 기반 판단
            # ========================================

            # (A) 실질 출발 가능 시간 & 소요 시간 결정
            if recommended_transport:
                # recommendedTransport.departureInMinutes (내부)는
                # "정류장/역 기준 차량 도착까지 남은 시간"으로 사용한다.
                wait_until_vehicle_minutes = (
                    recommended_transport.get("departureInMinutes")
                    or DEFAULT_FIRST_MILE_DURATION
                )
                effective_transit_time = recommended_transport.get("transitTimeMinutes", 30)
            else:
                # 추천 교통수단이 없으면 보수적으로 대기시간을 First Mile 기본값으로 가정
                wait_until_vehicle_minutes = DEFAULT_FIRST_MILE_DURATION
                effective_transit_time = 30  # 기본값

            # ✅ BUG FIX 3: Door-to-Door 완전 계산
            # (B) 슬랙(Slack) 계산 - First Mile + 대중교통 대기 + Transit + Last Mile
            expected_arrival = current_time + timedelta(
                minutes=first_mile_duration
                + wait_until_vehicle_minutes
                + effective_transit_time
                + last_mile_duration
            )
            slack_delta = target_arrival - expected_arrival
            slack_minutes = int(slack_delta.total_seconds() / 60)

            logger.info(
                f"🚪 Door-to-Door 계산: First Mile({first_mile_duration}분) + "
                f"대중교통 대기({wait_until_vehicle_minutes}분) + "
                f"Transit({effective_transit_time}분) + "
                f"Last Mile({last_mile_duration}분) = 총 {first_mile_duration + wait_until_vehicle_minutes + effective_transit_time + last_mile_duration}분"
            )

            logger.info(
                f"📊 슬랙 계산: 목표={target_arrival.strftime('%H:%M')}, "
                f"예상={expected_arrival.strftime('%H:%M')}, "
                f"슬랙={slack_minutes}분"
            )

            # Door-to-Door 총 예상 소요시간 (분)
            total_duration_minutes = (
                first_mile_duration
                + wait_until_vehicle_minutes
                + effective_transit_time
                + last_mile_duration
            )

            # (C) 판정 규칙
            target_time_str = commute_settings["targetArrivalTime"].strftime("%H:%M")

            # ❌ 이미 늦은 경우
            if slack_minutes < 0:
                logger.warning(f"⚠️ 지각 확정: 슬랙 {slack_minutes}분")
                return {
                    "data": {
                        "alertType": "NO_ACTION",
                        "message": f"{target_time_str} 도착은 불가능합니다. 택시를 고려하세요.",
                        "recommendedTransport": None
                    }
                }

            # ✅ 충분한 여유 있음 → GO_NOW
            if slack_minutes >= COMFORTABLE_BUFFER_MINUTES:
                # 집 기준으로 차량을 타기까지 남은 시간 = 걷기 + 정류장 대기
                departure_total_minutes = first_mile_duration + wait_until_vehicle_minutes

                if recommended_transport:
                    transport_name = recommended_transport["name"]
                    realtime_tag = " (실시간)" if recommended_transport.get("isRealtime") else ""
                    message = (
                        f"{target_time_str} 도착을 위해, 지금 집에서 출발하셔서 "
                        f"{departure_total_minutes}분 후 도착하는 [{transport_name}]를 타세요.{realtime_tag}"
                    )
                    # 혼잡도 정보가 있으면 메시지에 붙인다.
                    message += _build_congestion_suffix(recommended_transport)
                else:
                    transport_name = "지금 출발 가능한 교통수단"
                    message = (
                        f"{target_time_str} 도착을 위해, 지금 집에서 출발하세요. "
                        f"(여유: {slack_minutes}분)"
                    )

                logger.info(f"✅ Logic 1.1 GO_NOW 알림: 슬랙 {slack_minutes}분")
                return {
                    "data": {
                        "alertType": "GO_NOW",
                        "message": message,
                        "totalDurationMinutes": total_duration_minutes,
                        "recommendedTransport": (
                            {
                                **recommended_transport,
                                "departureInMinutes": departure_total_minutes,
                            }
                            if recommended_transport
                            else {
                                "type": "BUS",
                                "name": transport_name,
                                "departureInMinutes": departure_total_minutes,
                                "transitTimeMinutes": effective_transit_time,
                                "isRealtime": False,
                            }
                        ),
                    }
                }

            # ⚠️ 마지노선 → LAST_CHANCE
            if 0 <= slack_minutes < COMFORTABLE_BUFFER_MINUTES:
                # 집 기준으로 차량을 타기까지 남은 시간 = 걷기 + 정류장 대기
                departure_total_minutes = first_mile_duration + wait_until_vehicle_minutes

                if recommended_transport:
                    last_bus_number = recommended_transport["name"]
                    transport_type = recommended_transport.get("type", "BUS")
                else:
                    last_bus_number = "마지막 교통수단"
                    transport_type = "BUS"

                # 교통수단 타입에 따라 문구 분기
                if transport_type == "SUBWAY":
                    last_transport_label = "마지막 지하철"
                elif transport_type == "BUS":
                    last_transport_label = "마지막 버스"
                else:
                    last_transport_label = "마지막 교통수단"

                message = (
                    f"⚠️지각 주의! {target_time_str} 도착을 위한 {last_transport_label}[{last_bus_number}]가 "
                    f"{departure_total_minutes}분 뒤 도착합니다. 지금 출발하세요! (여유: {slack_minutes}분)"
                )
                # 혼잡도 정보가 있으면 메시지에 붙인다.
                if recommended_transport:
                    message += _build_congestion_suffix(recommended_transport)

                logger.warning(f"⚠️ Logic 1.2 LAST_CHANCE 경고: 슬랙 {slack_minutes}분")
                return {
                    "data": {
                        "alertType": "LAST_CHANCE",
                        "message": message,
                        "totalDurationMinutes": total_duration_minutes,
                        "recommendedTransport": (
                            {
                                **recommended_transport,
                                "departureInMinutes": departure_total_minutes,
                            }
                            if recommended_transport
                            else {
                                "type": "BUS",
                                "name": last_bus_number,
                                "departureInMinutes": departure_total_minutes,
                                "transitTimeMinutes": effective_transit_time,
                                "isRealtime": False,
                            }
                        ),
                    }
                }

            # 기본 응답 (예상치 못한 경우)
            logger.warning(f"⚠️ 예상치 못한 슬랙 조건: {slack_minutes}분")
            return {
                "data": {
                    "alertType": "NO_ACTION",
                    "message": f"{target_time_str} 도착을 위해 계획을 재조정하세요.",
                    "totalDurationMinutes": total_duration_minutes,
                    "recommendedTransport": None,
                }
            }

        except KeyError as e:
            logger.error(f"❌ 필드 누락: {str(e)}")
            return {
                "error": {
                    "code": ERROR_MISSING_REQUIRED_KEY,
                    "message": f"Missing required field: {str(e)}"
                }
            }
        except TypeError as e:
            logger.error(f"❌ 타입 오류: {str(e)}")
            return {
                "error": {
                    "code": ERROR_INVALID_TYPE,
                    "message": f"Type error: {str(e)}"
                }
            }
        except Exception as e:
            logger.error(f"❌ 예상치 못한 오류: {str(e)}")
            return {
                "error": {
                    "code": ERROR_INTERNAL_SERVER_ERROR,
                    "message": f"Internal server error: {str(e)}"
                }
            }

    def get_retreat_mode_last_bus_alert(
        self,
        retreat_settings: Dict[str, Any],
        current_time: datetime
    ) -> Dict[str, Any]:
        """
        퇴근 모드 막차 알림 조회
        v3.0 명세서 [Logic 1.2 퇴근모드] 막차 알림 (Last Bus Alert in Retreat Mode) 구현

        Args:
            retreat_settings: 사용자 퇴근 설정
                - homeAddress: 집 주소
                - workAddress: 회사 주소
                - targetArrivalTime: None (퇴근 모드는 시간 제약 없음)
                - firstMileDefaultDuration: First Mile 도보 시간 (분)
                - lastMileDefaultDuration: Last Mile 도보 시간 (분)
                - mode: "RETREAT" (퇴근 모드 표시)
                - userSelectedRoute: "A" | "B" | "C" (사용자 선택 경로)
            current_time: 현재 시간 (datetime 객체)

        Returns:
            OpenAPI 스펙 준수 응답 구조:
            {
                "data": {
                    "message": "선택하신 [B. 편안한 경로]의 막차가 30분 뒤입니다.",
                    "recommendedTransport": {
                        "type": "BUS" | "SUBWAY",
                        "name": "막차 정보",
                        "departureInMinutes": 막차까지 남은 시간 (분)
                    }
                }
            }
        """
        # 사용자 선택 경로
        user_selected_route = retreat_settings.get("userSelectedRoute", "C")

        # 1️⃣ DB에서 막차 시간 조회 시도
        try:
            # current_day_of_week: Python weekday()는 월=0, 일=6이므로,
            # 기존 day_of_week(0=월, 6=일) 규칙과 동일하게 사용 가능
            current_day_of_week = current_time.weekday()
            minutes_until_last_bus = get_minutes_until_last_bus(
                route_choice=user_selected_route,
                current_time=current_time,
                current_day_of_week=current_day_of_week,
            )
        except Exception as e:
            logger.warning(
                f"⚠️ 막차 시간 DB 조회 실패, 하드코딩 값 사용: {str(e)}"
            )
            minutes_until_last_bus = None

        # 2️⃣ DB에 데이터가 없거나 조회 실패 시 하드코딩 값 사용
        if minutes_until_last_bus is None:
            # v3.0 명세서 예시에 따른 기본값
            last_bus_times = {
                "A": 10,    # A. 가장 빠르게: 막차 10분 뒤
                "B": 30,    # B. 편안하게: 막차 30분 뒤
                "C": 25,    # C. 평소 경로: 막차 25분 뒤
            }
            minutes_until_last_bus = last_bus_times.get(user_selected_route, 25)

        # 경로별 한글 이름
        route_names = {
            "A": "A. 가장 빠르게",
            "B": "B. 편안하게(착석)",
            "C": "C. 평소 경로",
        }

        route_name = route_names.get(user_selected_route, "C. 평소 경로")

        # v3.0 명세서 예시 메시지 형식
        message = f"선택하신 [{route_name}]의 막차가 {minutes_until_last_bus}분 뒤입니다."

        return {
            "data": {
                "alertType": "LAST_CHANCE",  # 막차 알림은 LAST_CHANCE로 분류
                "message": message,
                "recommendedTransport": {
                    "type": "BUS",  # 실제로는 선택 경로에 따라 결정됨
                    "name": f"막차 ({user_selected_route})",
                    "departureInMinutes": minutes_until_last_bus
                }
            }
        }

    def get_auto_mode_switch_action(
        self,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        자동 모드 전환 (Logic 2.1 - Context Awareness)
        v3.0 명세서 [Logic 2.1] 자동 모드 전환 구현

        GPS 기반 사용자 상태 감지:
        - WAITING: 집/회사 근처 대기 (화면 전환 없음)
        - WALKING: 도보 이동 중 (화면 전환 없음)
        - ON_TRIP: 버스/지하철 탑승 중 (화면 전환 → 최종 목적지 ETA 표시)

        Args:
            user_context: {
                "currentGPS": { "latitude": 37.4979, "longitude": 127.0276, "accuracy": 5.0 },
                "commute_settings": { ... },
                "mode": "COMMUTE"
            }

        Returns:
            화면 전환 응답 또는 NO_ACTION:
            {
                "data": {
                    "action": "AUTO_SWITCH_TO_ETA",
                    "destinationArrivalTime": "08:45:00",
                    "estimatedMinutes": 15,
                    "currentLocation": { "latitude": 37.4979, "longitude": 127.0276 },
                    "destination": { "address": "...", "latitude": 37.5662, "longitude": 126.9778 }
                }
            }
            또는
            {
                "data": {
                    "action": "NO_ACTION"
                }
            }
        """
        try:
            # 1️⃣ UserContextData 모델로 변환
            context = UserContextData(
                currentGPS=user_context["currentGPS"],
                commute_settings=user_context["commute_settings"],
                mode=user_context.get("mode", "COMMUTE")
            )

            # 2️⃣ Context Awareness 분석
            analysis_result = context_detector.analyze_context(context)

            # 3️⃣ 화면 전환 응답 생성
            if analysis_result.screenSwitchNeeded:
                switch_response = context_detector.generate_screen_switch_response(
                    context,
                    analysis_result
                )
                if switch_response:
                    return {"data": switch_response}

            # 4️⃣ 화면 전환 불필요
            return {
                "data": {
                    "action": "NO_ACTION",
                    "state": analysis_result.state.value,
                    "message": f"현재 상태: {analysis_result.state.value}"
                }
            }

        except Exception as e:
            logger.error(f"❌ 자동 모드 전환 오류: {str(e)}")
            return {
                "data": {
                    "action": "NO_ACTION",
                    "error": str(e)
                }
            }

    def get_alternative_route_suggestion(
        self,
        current_route_time: int,
        alternative_route_time: int,
        mode: SystemMode,
        current_bus_arrival_minutes: int,
        current_bus_duration_minutes: int,
        transfer_bus_arrival_minutes: int,
        transfer_bus_congestion: int,
        transfer_location: str,
        transfer_line: str,
        congestion_level: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        고신뢰 대안 경로 제안 (Logic 2.2)
        v3.0 명세서 [Logic 2.2] 고신뢰 대안 경로 제안 구현

        3가지 엄격한 조건(Gate)을 통과한 경로만 제안:
        1. Gate 1: 확실한 이득 (출근: 7분 이상 단축, 퇴근: 착석 가능성 높음)
        2. Gate 2: 환승 확정성 (최소 3분 환승 여유)
        3. Gate 3: 경험의 질 (혼잡도 80% 미만)

        Args:
            current_route_time: 현재 경로 소요 시간 (분)
            alternative_route_time: 대안 경로 소요 시간 (분)
            mode: 시스템 모드 (COMMUTE/RETREAT)
            current_bus_arrival_minutes: 현재 버스 도착까지 시간 (분)
            current_bus_duration_minutes: 현재 버스 정차 + 하차 시간 (분)
            transfer_bus_arrival_minutes: 환승 버스 도착까지 시간 (분)
            transfer_bus_congestion: 환승 버스 혼잡도 (백분율)
            transfer_location: 환승 지점 (예: "A역")
            transfer_line: 환승 노선 (예: "9호선 급행")
            congestion_level: 혼잡도 (퇴근 모드)

        Returns:
            OpenAPI 스펙 준수 응답:
            모든 Gate 통과 시:
            {
                "data": {
                    "suggestAlternativeRoute": True,
                    "message": "더 빠른 경로 발견! (8분 단축) / 다음 'A역' [9호선 급행] 환승하세요. (단, 현재 혼잡도 '보통')",
                    "timeBenefit": 8,
                    "transferLocation": "A역",
                    "transferLine": "9호선 급행",
                    "transferCongestion": 45
                }
            }

            Gate 실패 시:
            {
                "data": {
                    "suggestAlternativeRoute": False,
                    "reasons": ["Gate 1 실패: 시간 단축이 3분으로 7분 미만", ...]
                }
            }
        """
        # 1️⃣ 모든 Gate 검증
        validation_result = gate_validator.validate_all_gates(
            current_route_time=current_route_time,
            alternative_route_time=alternative_route_time,
            mode=mode,
            current_bus_arrival_minutes=current_bus_arrival_minutes,
            current_bus_duration_minutes=current_bus_duration_minutes,
            transfer_bus_arrival_minutes=transfer_bus_arrival_minutes,
            transfer_bus_congestion=transfer_bus_congestion,
            congestion_level=congestion_level
        )

        # 2️⃣ Gate 통과 여부에 따른 응답
        if validation_result["all_pass"]:
            # 모든 Gate 통과 → 경로 제안
            message = gate_validator.generate_route_suggestion_message(
                time_benefit=validation_result["time_benefit"],
                transfer_location=transfer_location,
                transfer_line=transfer_line,
                transfer_bus_congestion=transfer_bus_congestion
            )

            return {
                "data": {
                    "suggestAlternativeRoute": True,
                    "message": message,
                    "timeBenefit": validation_result["time_benefit"],
                    "transferLocation": transfer_location,
                    "transferLine": transfer_line,
                    "transferCongestion": transfer_bus_congestion,
                    "transferTime": validation_result["transfer_time"]
                }
            }
        else:
            # Gate 실패 → 제안하지 않음
            logger.warning(
                f"❌ 대안 경로 제안 거절: {', '.join(validation_result['reasons'])}"
            )

            return {
                "data": {
                    "suggestAlternativeRoute": False,
                    "reasons": validation_result["reasons"],
                    "timeBenefit": validation_result["time_benefit"],
                    "failedGates": {
                        "gate_1": not validation_result["gate_1_pass"],
                        "gate_2": not validation_result["gate_2_pass"],
                        "gate_3": not validation_result["gate_3_pass"]
                    }
                }
            }

    def get_seating_optimization(
        self,
        guidance_type: str,
        current_vehicle: Optional[TransportType] = None,
        transfer_station: Optional[str] = None,
        transfer_line: Optional[str] = None,
        exit_location: Optional[str] = None,
        congestion_data: Optional[Dict[str, int]] = None,
        transfer_steps: Optional[List[Dict[str, Any]]] = None,
        has_transfer: bool = False
    ) -> Dict[str, Any]:
        """
        탑승/환승 최적화 가이드 제공
        v3.0 명세서 [Logic 2.3] 탑승/환승 최적화 가이드 구현

        Args:
            guidance_type: 안내 유형
                - "TRANSFER": 환승을 위한 최적 탑승 칸
                - "COMFORTABLE": 혼잡도 기반 여유 있는 칸
                - "EXIT": 하차역 위치 기반 탑승 칸
                - "MULTI_TRANSFER": 복합 환승 경로
            current_vehicle: 현재 교통수단
            transfer_station: 환승역 (예: "B역")
            transfer_line: 환승 노선 (예: "9호선")
            exit_location: 출입구 위치 (예: "FRONT", "CENTER", "REAR")
            congestion_data: 각 칸별 혼잡도 (예: {"1-2": 85, "3": 30})
            transfer_steps: 복합 환승 경로 데이터
            has_transfer: 환승 여부

        Returns:
            탑승/환승 최적화 정보:
            {
                "data": {
                    "action": "SEATING_OPTIMIZATION",
                    "type": "TRANSFER_GUIDANCE" | "CONGESTION_BASED_GUIDANCE" | "EXIT_GUIDANCE" | "MULTI_TRANSFER_GUIDANCE",
                    "message": "안내 메시지",
                    "optimalCar": "칸 정보" (type별로 다름),
                    "availableCars": [...] (type이 CONGESTION_BASED_GUIDANCE일 때만 포함),
                    "steps": [...] (type이 MULTI_TRANSFER_GUIDANCE일 때만 포함),
                    "priority": "HIGH" | "MEDIUM" | "LOW"
                }
            }
        """
        logger.info(f"🎯 탑승/환승 최적화 가이드 제공: {guidance_type}")

        if guidance_type == "TRANSFER":
            # 환승을 위한 최적 탑승 칸 추천
            result = seating_optimizer.recommend_car_for_transfer(
                transfer_station=transfer_station,
                transfer_line=transfer_line,
                exit_location=exit_location,
                current_vehicle=current_vehicle
            )
            return {"data": {**result, "action": "SEATING_OPTIMIZATION"}}

        elif guidance_type == "COMFORTABLE":
            # 혼잡도 기반 여유 있는 칸 추천
            if not congestion_data:
                logger.warning("⚠️ 혼잡도 데이터 없음")
                return {
                    "data": {
                        "action": "SEATING_OPTIMIZATION",
                        "type": "CONGESTION_BASED_GUIDANCE",
                        "availableCars": [],
                        "message": "혼잡도 정보를 불러올 수 없습니다.",
                        "priority": "LOW"
                    }
                }

            result = seating_optimizer.recommend_comfortable_cars(congestion_data)
            return {"data": {**result, "action": "SEATING_OPTIMIZATION"}}

        elif guidance_type == "EXIT":
            # 하차역 위치 기반 탑승 칸 추천
            result = seating_optimizer.recommend_car_for_exit(
                exit_station=transfer_station,
                exit_location=exit_location
            )
            return {"data": {**result, "action": "SEATING_OPTIMIZATION"}}

        elif guidance_type == "MULTI_TRANSFER":
            # 복합 환승 경로 안내
            if not transfer_steps:
                logger.warning("⚠️ 환승 경로 데이터 없음")
                return {
                    "data": {
                        "action": "SEATING_OPTIMIZATION",
                        "type": "MULTI_TRANSFER_GUIDANCE",
                        "steps": [],
                        "message": "환승 경로 정보를 불러올 수 없습니다.",
                        "totalSteps": 0
                    }
                }

            result = seating_optimizer.generate_multi_transfer_guidance(transfer_steps)
            return {"data": {**result, "action": "SEATING_OPTIMIZATION"}}

        else:
            logger.warning(f"⚠️ 알 수 없는 안내 유형: {guidance_type}")
            # 최적화 점수 계산 (기본값)
            score = seating_optimizer.calculate_optimization_score(
                current_vehicle=current_vehicle,
                has_transfer=has_transfer,
                transfer_station=transfer_station
            )

            return {
                "data": {
                    "action": "SEATING_OPTIMIZATION",
                    "type": "OPTIMIZATION_SCORE",
                    "optimizationScore": score,
                    "message": "탑승/환승 최적화 점수 계산 완료",
                    "priority": "LOW" if score < 0.5 else "MEDIUM" if score < 0.8 else "HIGH"
                }
            }

    # ========================================
    # Logic 3.1: 돌발상황 감지 (Delay Detection)
    # ========================================

    def get_exception_alert(
        self,
        segments: List[Dict[str, Any]],
        current_hour: int,
        current_day_of_week: int,
        statistical_data_map: Optional[Dict[str, Dict[str, Any]]] = None,
        real_time_data_map: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        경로의 지연 감지 (Logic 3.1)

        Args:
            segments: 구간 정보 리스트
                예: [
                    {
                        "segment_id": "SEG_001",
                        "segment_name": "A정류장 → B정류장",
                        "from_station": "A정류장",
                        "to_station": "B정류장"
                    },
                    ...
                ]
            current_hour: 현재 시간 (0-23)
            current_day_of_week: 현재 요일 (0=일, 1=월, ...)
            statistical_data_map: 구간별 평균 소요시간 데이터 (선택)
            real_time_data_map: 구간별 실시간 예상 데이터 (선택)

        Returns:
            {
                "action": "EXCEPTION_DETECTED" or "NO_ACTION",
                "totalSegments": 3,
                "delayedCount": 1,
                "delayedSegments": [
                    {
                        "segmentId": "SEG_001",
                        "segmentName": "A정류장 → B정류장",
                        "isDelayed": True,
                        "delayMinutes": 5,
                        "type": "DELAY_WARNING",
                        "message": "⚠️지연 감지! [A정류장] 부근이...",
                        "priority": "HIGH"
                    }
                ],
                "mostCritical": {...},
                "hasCritical": False
            }
        """
        logger.info(f"🚨 지연 감지 시작: {len(segments)}개 구간")

        # 빈 리스트 체크
        if not segments:
            logger.warning("⚠️ 구간 정보 없음")
            return {
                "action": "NO_ACTION",
                "totalSegments": 0,
                "delayedCount": 0,
                "delayedSegments": [],
                "mostCritical": None,
                "hasCritical": False
            }

        # DelayDetector를 사용한 경로 지연 분석
        route_analysis = delay_detector.detect_delays_on_route(
            segments=segments,
            current_hour=current_hour,
            current_day_of_week=current_day_of_week,
            statistical_data_map=statistical_data_map or {},
            real_time_data_map=real_time_data_map or {}
        )

        # 응답 구조 변환 (camelCase)
        delayed_segments_response = []
        for segment in route_analysis["delayed_segments"]:
            delayed_segments_response.append({
                "segmentId": segment["segment_id"],
                "segmentName": segment["segment_name"],
                "isDelayed": segment["is_delayed"],
                "delayMinutes": segment["delay_minutes"],
                "type": segment["type"],
                "message": segment["message"],
                "priority": segment["priority"],
                "dataSource": segment["data_source"],
                "confidence": segment["confidence"]
            })

        # 가장 심각한 구간 응답
        most_critical_response = None
        if route_analysis["most_critical"]:
            most_critical = route_analysis["most_critical"]
            most_critical_response = {
                "segmentId": most_critical["segment_id"],
                "segmentName": most_critical["segment_name"],
                "delayMinutes": most_critical["delay_minutes"],
                "priority": most_critical["priority"],
                "message": most_critical["message"]
            }

        # 결과 반환
        result = {
            "action": "EXCEPTION_DETECTED" if delayed_segments_response else "NO_ACTION",
            "totalSegments": route_analysis["total_segments"],
            "delayedCount": route_analysis["delayed_count"],
            "delayedSegments": delayed_segments_response,
            "mostCritical": most_critical_response,
            "hasCritical": route_analysis["has_critical"]
        }

        logger.info(
            f"✅ 지연 감지 완료: {route_analysis['delayed_count']}개 구간 지연 감지"
        )

        return {"data": result}

    # ========================================
    # Logic 3.2: 최종 대안 제시 - 택시 제안
    # ========================================

    def get_taxi_suggestion(
        self,
        mode: SystemMode,
        current_time: datetime,
        target_arrival_time: Optional[datetime] = None,
        transit_arrival_time: Optional[datetime] = None,
        taxi_arrival_time: Optional[datetime] = None,
        selected_route_choice: Optional[str] = None,
        selected_route_name: Optional[str] = None,
        last_bus_time: Optional[datetime] = None,
        first_mile_duration: int = 5,
        home_location: Optional[Dict[str, float]] = None,
        taxi_available: bool = True
    ) -> Dict[str, Any]:
        """
        택시 제안 (Logic 3.2)

        Args (Commute Mode):
            mode: SystemMode.COMMUTE
            current_time: 현재 시각
            target_arrival_time: 목표 도착 시간
            transit_arrival_time: 대중교통 예상 도착 시간
            taxi_arrival_time: 택시 예상 도착 시간
            home_location: 위치 정보 (위도, 경도)
            taxi_available: 택시 가용성

        Args (Retreat Mode):
            mode: SystemMode.RETREAT
            current_time: 현재 시각
            selected_route_choice: 선택 경로 ("A", "B", "C")
            selected_route_name: 선택 경로명
            last_bus_time: 막차 시간
            first_mile_duration: First Mile 도보 시간
            home_location: 위치 정보
            taxi_available: 택시 가용성

        Returns:
            {
                "action": "TAXI_SUGGESTED" or "NO_ACTION",
                "type": "TAXI_COMMUTE_LATENESS_CONFIRMED" or "TAXI_RETREAT_LAST_BUS_MISSED",
                "message": "택시 제안 메시지",
                "priority": "CRITICAL" or "HIGH",
                ...
            }
        """
        logger.info(f"🚕 택시 제안 시작: {mode.value} 모드")

        # 출근 모드: 지각 확정 시 택시 제안
        if mode == SystemMode.COMMUTE:
            logger.info("📍 출근 모드 택시 제안")

            # 필수 파라미터 체크
            if not all([target_arrival_time, transit_arrival_time, taxi_arrival_time]):
                logger.warning("⚠️ 출근 모드 필수 데이터 부족")
                return {
                    "data": {
                        "action": "NO_ACTION",
                        "reason": "필수 데이터 부족"
                    }
                }

            # TaxiSuggester를 사용한 제안 로직
            should_suggest = taxi_suggester.should_suggest_taxi_commute(
                target_arrival_time=target_arrival_time,
                transit_arrival_time=transit_arrival_time,
                taxi_arrival_time=taxi_arrival_time,
                taxi_available=taxi_available
            )

            if not should_suggest:
                logger.info("✅ 택시 제안 불필요")
                return {
                    "data": {
                        "action": "NO_ACTION",
                        "reason": "택시 제안 필요 없음"
                    }
                }

            # 택시 제안 생성
            result = taxi_suggester.suggest_taxi_for_commute(
                current_time=current_time,
                target_arrival_time=target_arrival_time,
                transit_arrival_time=transit_arrival_time,
                taxi_arrival_time=taxi_arrival_time,
                home_location=home_location
            )

            return {"data": result}

        # 퇴근 모드: 막차 놓침 시 택시 제안
        elif mode == SystemMode.RETREAT:
            logger.info("📍 퇴근 모드 택시 제안")

            # 필수 파라미터 체크
            if not all([selected_route_choice, selected_route_name, last_bus_time]):
                logger.warning("⚠️ 퇴근 모드 필수 데이터 부족")
                return {
                    "data": {
                        "action": "NO_ACTION",
                        "reason": "필수 데이터 부족"
                    }
                }

            # TaxiSuggester를 사용한 제안 로직
            should_suggest = taxi_suggester.should_suggest_taxi_retreat(
                current_time=current_time,
                last_bus_time=last_bus_time,
                first_mile_duration=first_mile_duration,
                taxi_available=taxi_available
            )

            if not should_suggest:
                logger.info("✅ 택시 제안 불필요")
                return {
                    "data": {
                        "action": "NO_ACTION",
                        "reason": "택시 제안 필요 없음"
                    }
                }

            # 택시 제안 생성
            result = taxi_suggester.suggest_taxi_for_retreat(
                current_time=current_time,
                selected_route_choice=selected_route_choice,
                selected_route_name=selected_route_name,
                last_bus_time=last_bus_time,
                first_mile_duration=first_mile_duration,
                taxi_arrival_time=taxi_arrival_time or datetime.now(),
                home_location=home_location
            )

            return {"data": result}

        else:
            logger.warning(f"⚠️ 알 수 없는 모드: {mode}")
            return {
                "data": {
                    "action": "NO_ACTION",
                    "reason": "지원하지 않는 모드"
                }
            }

    # ========================================
    # Phase 9: Logic 4.1 - 퇴근 모드 사용자 목표 설정
    # ========================================

    def get_retreat_mode_goal_selection(
        self, user_id: str, user_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        퇴근 모드 사용자 목표 선택지 제시

        Args:
            user_id: 사용자 ID
            user_name: 사용자 이름 (선택)

        Returns:
            {
                "data": {
                    "action": "ASK_USER_GOAL",
                    "options": [
                        {
                            "choice": "A",
                            "label": "가장 빠르게",
                            "description": "최단 시간으로 집에 도착",
                            "icon": "🚀",
                            "priority": "SPEED"
                        },
                        ...
                    ],
                    "pushNotification": {...},
                    "timestamp": "..."
                }
            }
        """
        # 1️⃣ 퇴근 모드 핸들러 사용
        result = retreat_mode_handler.ask_user_retreat_goal(
            user_name=user_name, user_id=user_id
        )

        logger.info(f"✅ 퇴근 모드 목표 선택지 제시: {user_id}")
        return {"data": result}

    def save_retreat_mode_choice(
        self, user_id: str, selected_choice: str, session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        퇴근 모드 사용자 목표 선택 저장

        Args:
            user_id: 사용자 ID
            selected_choice: 선택 (A/B/C)
            session_id: 세션 ID (선택)

        Returns:
            {
                "data": {
                    "action": "CHOICE_SAVED",
                    "userId": "...",
                    "selectedChoice": "B",
                    "selectedLabel": "편안하게",
                    "nextAction": "GET_ROUTES_BY_GOAL",
                    "message": "..."
                }
            }
        """
        # 1️⃣ 선택 저장
        result = retreat_mode_handler.save_retreat_choice(
            user_id=user_id,
            selected_choice=selected_choice,
            session_id=session_id,
        )

        # 2️⃣ 세션에 유지
        if session_id:
            retreat_mode_handler.persist_choice_in_session(
                user_id=user_id,
                selected_choice=selected_choice,
                session_id=session_id,
            )

        logger.info(f"✅ 퇴근 모드 선택 저장: {user_id} -> {selected_choice}")
        return {"data": result}

    # ========================================
    # Phase 9: Logic 4.2 - 퇴근 목표별 경로 제안
    # ========================================

    def get_routes_by_retreat_goal(
        self, routes: List[Dict[str, Any]], user_goal: str
    ) -> Dict[str, Any]:
        """
        퇴근 모드 사용자 목표에 따른 경로 제안

        Args:
            routes: 사용 가능한 경로 목록
            user_goal: 사용자 목표 (A/B/C)

        Returns:
            {
                "data": {
                    "action": "GET_ROUTES_BY_GOAL",
                    "selectedGoal": "A|B|C",
                    "goalLabel": "...",
                    "routes": [
                        {
                            "routeId": "...",
                            "name": "...",
                            "estimatedDuration": number,
                            "seatingProbability": number,
                            "recommendation": "...",
                            "metadata": {...}
                        },
                        ...
                    ],
                    "message": "...",
                    "timestamp": "..."
                }
            }
        """
        # 1️⃣ 목표 유효성 검증
        valid_goals = ["A", "B", "C"]
        if user_goal not in valid_goals:
            logger.warning(f"⚠️ 유효하지 않은 목표: {user_goal}")
            return {
                "data": {
                    "action": "ERROR",
                    "error": f"Invalid goal: {user_goal}. Must be A, B, or C",
                }
            }

        # 2️⃣ 경로 선택 및 필터링
        result = route_selector_by_goal.get_routes_by_goal(
            routes=routes, goal=user_goal
        )

        logger.info(f"✅ 퇴근 목표별 경로 제안: {user_goal}")
        return {"data": result}

    # ========================================
    # Logic 4.3: 스마트 폴링 (Smart Polling)
    # ========================================

    def get_smart_polling_frequency(
        self,
        user_latitude: float,
        user_longitude: float,
        user_speed: float,
        transit_mode: str,
        distance_to_transfer: float = float("inf"),
        in_congestion_zone: bool = False,
        minutes_until_alert: int = float("inf"),
    ) -> Dict[str, Any]:
        """
        사용자 상태 기반 스마트 폴링 빈도 계산

        배터리/데이터 효율성을 위해 사용자 상태에 따라 폴링 빈도를 동적으로 조절한다.

        Args:
            user_latitude: 사용자 위도
            user_longitude: 사용자 경도
            user_speed: 사용자 속도 (km/h)
            transit_mode: 대중교통 모드 (SUBWAY, BUS, TRAIN, WALKING, WAITING)
            distance_to_transfer: 환승 지점까지 거리 (미터)
            in_congestion_zone: 정체 구간 여부
            minutes_until_alert: 알림까지 남은 시간 (분)

        Returns:
            {
                "data": {
                    "frequency": "HIGH" | "MEDIUM" | "LOW",
                    "intervalSeconds": 10 | 30 | 300,
                    "reason": "...",
                    "nextCheckTime": "ISO 8601 timestamp",
                    "metadata": {
                        "description": "...",
                        "useCases": [...],
                        "batteryImpact": "...",
                        "estimatedBatteryDrainPerHour": "..."
                    }
                }
            }
        """
        try:
            # 1️⃣ 사용자 상태 객체 생성
            location = UserLocation(
                latitude=user_latitude,
                longitude=user_longitude,
                speed=user_speed,
            )

            transit_state = TransitState(
                mode=transit_mode,
                distance_to_transfer=distance_to_transfer,
                in_congestion_zone=in_congestion_zone,
            )

            alert_state = AlertState(
                minutes_until_alert=minutes_until_alert,
            )

            # 2️⃣ 폴링 빈도 계산
            frequency_result = polling_scheduler.calculate_polling_frequency(
                location=location,
                transit_state=transit_state,
                alert_state=alert_state,
            )

            # 3️⃣ 메타데이터 추가
            frequency_obj = frequency_result["frequency"]
            metadata = polling_scheduler.get_frequency_metadata(frequency_obj)

            # 4️⃣ 응답 구성
            result = {
                "frequency": frequency_result["frequency"].name,
                "intervalSeconds": frequency_result["intervalSeconds"],
                "reason": frequency_result["reason"],
                "nextCheckTime": frequency_result["nextCheckTime"],
                "metadata": metadata,
                "timestamp": datetime.utcnow().isoformat(),
            }

            logger.info(
                f"✅ 스마트 폴링 빈도 계산: {result['frequency']} "
                f"({result['intervalSeconds']}초) - {result['reason']}"
            )
            return {"data": result}

        except Exception as e:
            logger.error(f"❌ 폴링 빈도 계산 실패: {str(e)}")
            return {
                "error": {
                    "code": "E010",
                    "message": f"Failed to calculate polling frequency: {str(e)}",
                }
            }

    def get_polling_status(
        self,
        current_frequency: str,  # "HIGH", "MEDIUM", "LOW"
        last_poll_timestamp: str,  # ISO 8601
        last_calc_timestamp: str,  # ISO 8601
    ) -> Dict[str, Any]:
        """
        현재 폴링 상태 조회

        Args:
            current_frequency: 현재 폴링 빈도 ("HIGH" | "MEDIUM" | "LOW")
            last_poll_timestamp: 마지막 폴링 시간 (ISO 8601)
            last_calc_timestamp: 마지막 빈도 재계산 시간 (ISO 8601)

        Returns:
            {
                "data": {
                    "currentFrequency": "HIGH" | "MEDIUM" | "LOW",
                    "intervalSeconds": 10 | 30 | 300,
                    "elapsedSincePoll": number,
                    "timeUntilNextPoll": number,
                    "elapsedSinceFrequencyRecalc": number,
                    "shouldPollNow": boolean,
                    "shouldRecalculateFrequency": boolean,
                    "timestamp": "ISO 8601"
                }
            }
        """
        try:
            # 1️⃣ 타임스탬프 파싱
            last_poll_time = datetime.fromisoformat(last_poll_timestamp)
            last_calc_time = datetime.fromisoformat(last_calc_timestamp)

            # 2️⃣ 빈도 변환
            frequency = PollingFrequency[current_frequency]

            # 3️⃣ 폴링 상태 조회
            status = polling_scheduler.get_polling_status(
                current_frequency=frequency,
                last_poll_time=last_poll_time,
                last_calc_time=last_calc_time,
            )

            logger.info(f"✅ 폴링 상태 조회: {status['currentFrequency']}")
            return {"data": status}

        except Exception as e:
            logger.error(f"❌ 폴링 상태 조회 실패: {str(e)}")
            return {
                "error": {
                    "code": "E011",
                    "message": f"Failed to get polling status: {str(e)}",
                }
            }
