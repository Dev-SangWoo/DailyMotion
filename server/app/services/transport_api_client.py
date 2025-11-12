"""
대중교통 API 클라이언트
Odsay API, Kakao Map API와의 통합을 담당합니다.

v3.0 명세서:
- Logic 2.1.1: 대중교통 API 응답 파싱
- Logic 2.1.2: 실시간 대중교통 정보 연동
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import httpx
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class TransportAPIClient:
    """
    대중교통 실시간 정보 클라이언트

    Odsay API를 사용하여 버스/지하철 도착 정보 조회
    응답 캐싱을 통해 API 호출 최소화
    """

    def __init__(self):
        """TransportAPIClient 초기화"""
        self.odsay_key = settings.ODSAY_API_KEY
        self.odsay_base_url = settings.ODSAY_BASE_URL
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl_seconds = 30  # 캐시 유효 시간: 30초

    # ========================================
    # Phase 2.1.1: API 응답 파싱
    # ========================================

    def parse_bus_arrivals(self, odsay_response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Odsay API 버스 도착 정보 응답 파싱

        Args:
            odsay_response: Odsay API /bus/{stationId}/real 응답

        Returns:
            파싱된 버스 정보 리스트:
            [
                {
                    "number": "123",
                    "arrival_minutes": 3,
                    "station_name": "강남역",
                    "type": "일반"
                }
            ]
        """
        buses = []

        try:
            bus_list = odsay_response.get("result", {}).get("busArrivalList", [])

            for bus in bus_list:
                buses.append({
                    "number": bus.get("busNum", ""),
                    "arrival_minutes": bus.get("arrivalMin", 0),
                    "station_name": bus.get("stationName", ""),
                    "type": bus.get("type", "일반"),
                    "route_id": bus.get("busRouteId", "")
                })

            logger.info(f"✅ Odsay 버스 응답 파싱 완료: {len(buses)}개 버스")

        except Exception as e:
            logger.error(f"❌ 버스 응답 파싱 오류: {str(e)}")
            return []

        return buses

    def parse_subway_arrivals(self, odsay_response: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Odsay API 지하철 도착 정보 응답 파싱

        Args:
            odsay_response: Odsay API /subway/{stationId}/real 응답

        Returns:
            파싱된 지하철 정보 리스트:
            [
                {
                    "line": "2호선",
                    "direction": "강남역 방면",
                    "arrival_minutes": 3
                }
            ]
        """
        subways = []

        try:
            subway_list = odsay_response.get("result", {}).get("realtimeReimburseRailList", [])

            for subway in subway_list:
                # "3분" 형식의 문자열에서 숫자만 추출
                arrival_str = subway.get("arvlMsg3", "0분")
                arrival_min = int(arrival_str.replace("분", "").strip())

                subways.append({
                    "line": subway.get("line", ""),
                    "direction": subway.get("trainName", ""),
                    "arrival_minutes": arrival_min
                })

            logger.info(f"✅ Odsay 지하철 응답 파싱 완료: {len(subways)}개 열차")

        except Exception as e:
            logger.error(f"❌ 지하철 응답 파싱 오류: {str(e)}")
            return []

        return subways

    # ========================================
    # Phase 2.1.2: 실제 API 호출
    # ========================================

    async def get_next_bus_arrivals(self, bus_stop_id: str) -> Dict[str, Any]:
        """
        다음 버스 도착 정보 조회 (Odsay API)

        Args:
            bus_stop_id: 버스 정류장 ID (예: 208000143)

        Returns:
            {
                "buses": [
                    {
                        "number": "123",
                        "arrival_minutes": 3,
                        "message": "123번 버스가 3분 뒤 도착합니다."
                    }
                ]
            }
        """
        # 1️⃣ 캐시 확인
        cache_key = f"bus_{bus_stop_id}"
        if self._is_cache_valid(cache_key):
            logger.info(f"💾 캐시 히트: {cache_key}")
            return self.cache[cache_key]["data"]

        # 2️⃣ API 호출
        url = f"{self.odsay_base_url}/bus/{bus_stop_id}/real"

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    url,
                    params={"key": self.odsay_key}
                )
                response.raise_for_status()
                odsay_response = response.json()

        except httpx.HTTPError as e:
            logger.error(f"❌ Odsay API 호출 실패: {str(e)}")
            return {"buses": [], "error": "API 호출 실패"}

        # 3️⃣ 응답 파싱
        buses = self.parse_bus_arrivals(odsay_response)

        # 4️⃣ 메시지 생성
        result = {
            "buses": [
                {
                    **bus,
                    "message": f"{bus['number']}번 버스가 {bus['arrival_minutes']}분 뒤 도착합니다."
                }
                for bus in buses
            ]
        }

        # 5️⃣ 캐시 저장
        self._set_cache(cache_key, result)

        return result

    async def get_subway_info(self, station_id: str) -> Dict[str, Any]:
        """
        지하철 도착 정보 조회 (Odsay API)

        Args:
            station_id: 지하철 역 ID (예: 208)

        Returns:
            {
                "subways": [
                    {
                        "line": "2호선",
                        "direction": "강남역 방면",
                        "arrival_minutes": 3,
                        "message": "2호선 강남역 방면 열차가 3분 뒤 도착합니다."
                    }
                ]
            }
        """
        # 1️⃣ 캐시 확인
        cache_key = f"subway_{station_id}"
        if self._is_cache_valid(cache_key):
            logger.info(f"💾 캐시 히트: {cache_key}")
            return self.cache[cache_key]["data"]

        # 2️⃣ API 호출
        url = f"{self.odsay_base_url}/subway/{station_id}/real"

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    url,
                    params={"key": self.odsay_key}
                )
                response.raise_for_status()
                odsay_response = response.json()

        except httpx.HTTPError as e:
            logger.error(f"❌ Odsay API 호출 실패: {str(e)}")
            return {"subways": [], "error": "API 호출 실패"}

        # 3️⃣ 응답 파싱
        subways = self.parse_subway_arrivals(odsay_response)

        # 4️⃣ 메시지 생성
        result = {
            "subways": [
                {
                    **subway,
                    "message": f"{subway['line']} {subway['direction']} 열차가 {subway['arrival_minutes']}분 뒤 도착합니다."
                }
                for subway in subways
            ]
        }

        # 5️⃣ 캐시 저장
        self._set_cache(cache_key, result)

        return result

    # ========================================
    # 캐싱 전략
    # ========================================

    def _is_cache_valid(self, key: str) -> bool:
        """
        캐시 유효성 검사

        Args:
            key: 캐시 키

        Returns:
            캐시가 유효한지 여부
        """
        if key not in self.cache:
            return False

        cache_entry = self.cache[key]
        timestamp = cache_entry.get("timestamp")
        now = datetime.now()

        if (now - timestamp).total_seconds() > self.cache_ttl_seconds:
            del self.cache[key]
            logger.info(f"🗑️  캐시 만료: {key}")
            return False

        return True

    def _set_cache(self, key: str, data: Dict[str, Any]) -> None:
        """
        캐시 저장

        Args:
            key: 캐시 키
            data: 캐시할 데이터
        """
        self.cache[key] = {
            "data": data,
            "timestamp": datetime.now()
        }
        logger.info(f"💾 캐시 저장: {key} (TTL: {self.cache_ttl_seconds}초)")

    def clear_cache(self) -> None:
        """전체 캐시 초기화"""
        self.cache.clear()
        logger.info("🗑️  전체 캐시 초기화")


# 전역 인스턴스
transport_client = TransportAPIClient()
