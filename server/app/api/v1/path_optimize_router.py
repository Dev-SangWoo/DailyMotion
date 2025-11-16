"""
경로 최적화 관련 API 라우터

Phase 12: API Endpoint 구현 (Mock 기반)
- 출근 브리핑 조회
- 출퇴근 설정 저장/조회
- 퇴근 목표 선택 저장
- (추가) 환승 리마인더 조회 (Logic 2.4)
"""
from datetime import datetime, time
from typing import Optional, Dict, Any, List

import logging
import os
from fastapi import APIRouter, HTTPException, Query, Body

from app.common.response import Envelope
from app.modules.path_optimize.service import PathOptimizeService
from app.modules.path_optimize.models import (
    SystemMode,
    CommuteSettings,
    BriefingResponse,
    ErrorResponse,
)
from app.modules.path_optimize.mock_user_db import MockUserDB
from app.modules.path_optimize.average_duration_repository import (
    get_average_duration_map_for_segments,
)
from app.modules.path_optimize.optimization_history_repository import (
    log_optimization_history,
)
from app.services.odsay_client import OdsayAPIClient

logger = logging.getLogger(__name__)

# =====================================================
# 라우터 정의
# =====================================================

# 브리핑 관련 엔드포인트 (기존)
router = APIRouter(
    prefix="/briefings",
    tags=["Briefings"],
)

# 컨텍스트 인식 / 모드 전환 관련 엔드포인트 (Logic 2.1 등)
context_router = APIRouter(
    prefix="/context",
    tags=["Briefings"],
)


# =====================================================
# 서비스 인스턴스 초기화
# =====================================================

service = PathOptimizeService()


async def _get_routes_data_for_commute(commute_settings: dict) -> Optional[Dict[str, Any]]:
    """
    사용자 출퇴근 설정을 기반으로 ODSAY 경로 데이터를 조회합니다.

    Returns:
        OdsayAPIClient.parse_route_info() 결과 또는 None
    """
    api_key = os.getenv("ODSAY_API_KEY")
    if not api_key:
        logger.warning("⚠️ ODSAY_API_KEY 환경변수 없음 - routes_data 없이 진행")
        return None

    odsay_client = OdsayAPIClient(api_key=api_key)

    # 0️⃣ 좌표가 이미 있는 경우: 주소 지오코딩이 끝났다고 보고, 바로 좌표 기반 경로 검색
    home_lat = commute_settings.get("homeLatitude")
    home_lng = commute_settings.get("homeLongitude")
    work_lat = commute_settings.get("workLatitude")
    work_lng = commute_settings.get("workLongitude")

    if all(v is not None for v in (home_lat, home_lng, work_lat, work_lng)):
        try:
            logger.info(
                "📍 좌표 기반 경로 검색 사용: "
                f"home=({home_lng},{home_lat}) → work=({work_lng},{work_lat})"
            )
            route_response = await odsay_client.search_route(
                start_x=home_lng,
                start_y=home_lat,
                end_x=work_lng,
                end_y=work_lat,
                search_type=0,
            )

            if "error" in route_response:
                logger.warning(
                    f"⚠️ 좌표 기반 경로 검색 실패, station 검색으로 Fallback: "
                    f"{route_response.get('error') or route_response.get('message')}"
                )
            else:
                routes_data = odsay_client.parse_route_info(route_response)
                path_count = len(routes_data.get("paths", []))
                logger.info(f"✅ 좌표 기반 경로 검색 성공: {path_count}개 경로")
                return routes_data
        except Exception as e:
            logger.warning(f"⚠️ 좌표 기반 경로 검색 중 오류, station 검색으로 Fallback: {str(e)}")

    # 집 주소로 정류장 검색
    logger.info(f"🔍 집 주소로 정류장 검색: {commute_settings['homeAddress']}")
    home_station_response = await odsay_client.search_station(
        station_name=commute_settings["homeAddress"]
    )

    if "error" in home_station_response or "result" not in home_station_response:
        logger.warning("⚠️ 집 주소 정류장 검색 실패")
        return None

    home_stations = home_station_response.get("result", {}).get("station", [])
    if not home_stations:
        logger.warning("⚠️ 집 주소 정류장 결과 없음")
        return None

    home_station_data = home_stations[0]
    home_x = home_station_data["x"]
    home_y = home_station_data["y"]
    logger.info(f"✅ 집 정류장 발견: {home_station_data['stationName']} ({home_x}, {home_y})")

    # 회사 주소로 정류장 검색
    logger.info(f"🔍 회사 주소로 정류장 검색: {commute_settings['workAddress']}")
    work_station_response = await odsay_client.search_station(
        station_name=commute_settings["workAddress"]
    )

    if "error" in work_station_response or "result" not in work_station_response:
        logger.warning("⚠️ 회사 주소 정류장 검색 실패")
        return None

    work_stations = work_station_response.get("result", {}).get("station", [])
    if not work_stations:
        logger.warning("⚠️ 회사 주소 정류장 결과 없음")
        return None

    work_station_data = work_stations[0]
    work_x = work_station_data["x"]
    work_y = work_station_data["y"]
    logger.info(f"✅ 회사 정류장 발견: {work_station_data['stationName']} ({work_x}, {work_y})")

    # 좌표 기반 경로 검색
    logger.info(f"🔍 경로 검색: ({home_x},{home_y}) → ({work_x},{work_y})")
    route_response = await odsay_client.search_route(
        start_x=home_x,
        start_y=home_y,
        end_x=work_x,
        end_y=work_y,
        search_type=0,
    )

    if "error" in route_response:
        logger.warning(f"⚠️ 경로 검색 실패: {route_response['error']}")
        return None

    routes_data = odsay_client.parse_route_info(route_response)
    path_count = len(routes_data.get("paths", []))
    logger.info(f"✅ 경로 검색 성공: {path_count}개 경로")
    return routes_data


def _build_transfer_points_from_path(path: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    ODSAY 경로의 subPath에서 환승 지점 목록을 추출합니다.

    간단한 규칙:
    - trafficType 1/2(지하철/버스) 구간들 사이의 경계에서 환승이 발생했다고 간주
    - 앞 구간의 endName / endX,endY 또는 다음 구간의 startName / startX,startY를 사용
    """
    sub_path = path.get("subPath", []) or []
    # transit 구간 인덱스 (1=지하철, 2=버스)
    transit_indices = [
        idx for idx, segment in enumerate(sub_path) if segment.get("trafficType") in (1, 2)
    ]

    transfer_points: List[Dict[str, Any]] = []

    if len(transit_indices) <= 1:
        return transfer_points

    for first_idx, second_idx in zip(transit_indices, transit_indices[1:]):
        first_seg = sub_path[first_idx] or {}
        second_seg = sub_path[second_idx] or {}

        # 환승역 이름
        station_name = (
            first_seg.get("endName")
            or second_seg.get("startName")
            or first_seg.get("startName")
        )
        if not station_name:
            continue

        # 좌표 (endX/endY 또는 startX/startY)
        lon = first_seg.get("endX") or second_seg.get("startX")
        lat = first_seg.get("endY") or second_seg.get("startY")
        if lat is None or lon is None:
            continue

        # 다음 구간 기준 환승 교통수단/노선 정보
        second_type = second_seg.get("trafficType")
        if second_type == 1:
            transport_type = "SUBWAY"
            subway_line = (
                second_seg.get("subwayName")
                or (f"{second_seg.get('subwayCode')}호선" if second_seg.get("subwayCode") else None)
            )
            transfer_points.append(
                {
                    "stationName": station_name,
                    "latitude": lat,
                    "longitude": lon,
                    "transportType": transport_type,
                    "subwayLine": subway_line,
                    # 방향 정보는 현재 ODSAY 응답에서 직접 제공되지 않으므로 기본값 사용
                    "direction": "상행",
                }
            )
        elif second_type == 2:
            transport_type = "BUS"
            transfer_points.append(
                {
                    "stationName": station_name,
                    "latitude": lat,
                    "longitude": lon,
                    "transportType": transport_type,
                    "busNumber": second_seg.get("busNo"),
                    "busRouteId": second_seg.get("busID") or second_seg.get("busRouteId"),
                }
            )

    return transfer_points


# =====================================================
# Logic 2.1: 자동 모드 전환 엔드포인트
# =====================================================

@context_router.get(
    "/mode-switch",
    response_model=Envelope[Dict[str, Any]],
)
def get_auto_mode_switch_action(
    user_id: str = Query("user_001", alias="userId", description="사용자 ID"),
    current_latitude: float = Query(..., alias="currentLatitude", description="현재 위도"),
    current_longitude: float = Query(..., alias="currentLongitude", description="현재 경도"),
    current_accuracy: Optional[float] = Query(
        None,
        alias="currentAccuracy",
        description="GPS 정확도 (미터, 선택)",
    ),
    mode: str = Query("COMMUTE", alias="mode", description="현재 모드 (COMMUTE/RETREAT)"),
):
    """
    자동 모드 전환 (Logic 2.1 - Context Awareness)

    사용자의 현재 GPS 위치와 저장된 출퇴근 설정을 기반으로
    탑승 상태를 감지하고, 화면 전환이 필요한 경우 ETA 정보를 반환합니다.
    """
    try:
        commute_settings = MockUserDB.get_commute_settings(user_id)
        if not commute_settings:
            logger.error(f"❌ 사용자 없음: {user_id}")
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")

        user_context = {
            "currentGPS": {
                "latitude": current_latitude,
                "longitude": current_longitude,
                "accuracy": current_accuracy,
            },
            "commute_settings": commute_settings,
            "mode": mode,
        }

        result = service.get_auto_mode_switch_action(user_context=user_context)

        logger.info(
            "✅ 자동 모드 전환 결과: user=%s, action=%s",
            user_id,
            result.get("data", {}).get("action"),
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 자동 모드 전환 처리 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# Phase 12: API Endpoint 구현
# =====================================================

# 2.x / 3.x / 4.x 보조 엔드포인트 (Logic 2.2, 2.3, 3.1, 3.2, 4.2, 4.3)

@context_router.post("/routes/alternative", response_model=Envelope[Dict[str, Any]])
def get_alternative_route_suggestion(
    payload: Dict[str, Any] = Body(..., description="대안 경로 제안 입력 데이터"),
):
    """
    고신뢰 대안 경로 제안 (Logic 2.2)

    현재 경로 대비 대안 경로의 시간 이득, 환승 여유, 혼잡도를 검증하여
    모든 Gate를 통과한 경우에만 대안 경로를 제안합니다.
    """
    try:
        mode_value = payload.get("mode", "COMMUTE")
        try:
            mode = SystemMode(mode_value)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid mode: {mode_value}")

        result = service.get_alternative_route_suggestion(
            current_route_time=payload.get("currentRouteTime"),
            alternative_route_time=payload.get("alternativeRouteTime"),
            mode=mode,
            current_bus_arrival_minutes=payload.get("currentBusArrivalMinutes"),
            current_bus_duration_minutes=payload.get("currentBusDurationMinutes"),
            transfer_bus_arrival_minutes=payload.get("transferBusArrivalMinutes"),
            transfer_bus_congestion=payload.get("transferBusCongestion"),
            transfer_location=payload.get("transferLocation"),
            transfer_line=payload.get("transferLine"),
            congestion_level=payload.get("congestionLevel"),
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 대안 경로 제안 처리 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@context_router.get("/seating/optimize", response_model=Envelope[Dict[str, Any]])
def get_seating_optimization(
    guidance_type: str = Query(..., alias="guidanceType", description="안내 유형"),
    transfer_station: Optional[str] = Query(
        None, alias="transferStation", description="환승역 이름"
    ),
    transfer_line: Optional[str] = Query(
        None, alias="transferLine", description="환승 노선"
    ),
    exit_location: Optional[str] = Query(
        None, alias="exitLocation", description="출구 위치 (FRONT/CENTER/REAR 등)"
    ),
):
    """
    탑승/환승 최적화 가이드 조회 (Logic 2.3)
    """
    try:
        result = service.get_seating_optimization(
            guidance_type=guidance_type,
            transfer_station=transfer_station,
            transfer_line=transfer_line,
            exit_location=exit_location,
        )
        return result
    except Exception as e:
        logger.error(f"❌ 탑승/환승 최적화 처리 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@context_router.post("/exceptions/delays", response_model=Envelope[Dict[str, Any]])
def get_exception_alert(
    payload: Dict[str, Any] = Body(..., description="지연 감지 입력 데이터"),
):
    """
    돌발상황 지연 감지 (Logic 3.1)
    """
    try:
        segments_raw = payload.get("segments") or []
        segments: List[Dict[str, Any]] = []
        for seg in segments_raw:
            segments.append(
                {
                    "segment_id": seg.get("segmentId"),
                    "segment_name": seg.get("segmentName"),
                    "from_station": seg.get("fromStation"),
                    "to_station": seg.get("toStation"),
                }
            )

        current_hour = payload.get("currentHour")
        current_day_of_week = payload.get("currentDayOfWeek")

        # DB에서 통계 데이터 조회 (없으면 빈 dict)
        statistical_data_map = get_average_duration_map_for_segments(
            segments=segments,
            current_hour=current_hour,
            current_day_of_week=current_day_of_week,
        )

        result = service.get_exception_alert(
            segments=segments,
            current_hour=current_hour,
            current_day_of_week=current_day_of_week,
            statistical_data_map=statistical_data_map,
        )
        return result
    except Exception as e:
        logger.error(f"❌ 지연 감지 처리 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@context_router.post("/taxi/suggest", response_model=Envelope[Dict[str, Any]])
def get_taxi_suggestion(
    payload: Dict[str, Any] = Body(..., description="택시 제안 입력 데이터"),
):
    """
    택시 제안 (Logic 3.2)
    """
    try:
        mode_value = payload.get("mode", "COMMUTE")
        try:
            mode = SystemMode(mode_value)
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid mode: {mode_value}")

        current_time = datetime.fromisoformat(payload["currentTime"])

        def _parse_dt(key: str) -> Optional[datetime]:
            value = payload.get(key)
            return datetime.fromisoformat(value) if value else None

        result = service.get_taxi_suggestion(
            mode=mode,
            current_time=current_time,
            target_arrival_time=_parse_dt("targetArrivalTime"),
            transit_arrival_time=_parse_dt("transitArrivalTime"),
            taxi_arrival_time=_parse_dt("taxiArrivalTime"),
            selected_route_choice=payload.get("selectedRouteChoice"),
            selected_route_name=payload.get("selectedRouteName"),
            last_bus_time=_parse_dt("lastBusTime"),
        )
        return result
    except KeyError as e:
        logger.error(f"❌ 택시 제안 필수 필드 누락: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Missing field: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 택시 제안 처리 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@context_router.get("/routes/by-goal", response_model=Envelope[Dict[str, Any]])
def get_routes_by_goal(
    goal: str = Query(..., alias="goal", description="퇴근 목표 (A/B/C)"),
    routes_json: str = Query(..., alias="routesJson", description="경로 목록 JSON"),
):
    """
    퇴근 목표별 경로 조회 (Logic 4.2)

    현재는 경로 목록을 JSON 문자열로 받아 임시로 필터링합니다.
    클라이언트/DB 연동이 완성되면 별도 모델/소스를 사용할 수 있습니다.
    """
    import json

    try:
        try:
            routes = json.loads(routes_json)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid routesJson (must be JSON)")

        if not isinstance(routes, list):
            raise HTTPException(status_code=400, detail="routesJson must be a list")

        result = service.get_routes_by_retreat_goal(routes=routes, user_goal=goal)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 퇴근 목표별 경로 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@context_router.get("/polling/frequency", response_model=Envelope[Dict[str, Any]])
def get_smart_polling_frequency(
    user_latitude: float = Query(..., alias="userLatitude", description="사용자 위도"),
    user_longitude: float = Query(..., alias="userLongitude", description="사용자 경도"),
    user_speed: float = Query(..., alias="userSpeed", description="사용자 속도 (km/h)"),
    transit_mode: str = Query(..., alias="transitMode", description="대중교통 모드"),
    distance_to_transfer: float = Query(
        999999.0,
        alias="distanceToTransfer",
        description="환승 지점까지 거리 (미터)",
    ),
    in_congestion_zone: bool = Query(
        False,
        alias="inCongestionZone",
        description="정체 구간 여부",
    ),
    minutes_until_alert: int = Query(
        9999,
        alias="minutesUntilAlert",
        description="알림까지 남은 시간 (분)",
    ),
):
    """
    스마트 폴링 빈도 조회 (Logic 4.3)
    """
    try:
        result = service.get_smart_polling_frequency(
            user_latitude=user_latitude,
            user_longitude=user_longitude,
            user_speed=user_speed,
            transit_mode=transit_mode,
            distance_to_transfer=distance_to_transfer,
            in_congestion_zone=in_congestion_zone,
            minutes_until_alert=minutes_until_alert,
        )
        # 서비스가 {"data": ...} 또는 {"error": ...}를 직접 반환
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"]["message"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 스마트 폴링 빈도 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 1️⃣ GET /api/v1/briefings/commute - 출근 브리핑 조회
@router.get("/commute", response_model=Envelope[BriefingResponse])
async def get_commute_briefing(
    user_id: str = Query("user_001", alias="userId", description="사용자 ID")
):
    """
    출근 브리핑 조회 (ODSAY API 통합)

    Logic 1.1 & 1.2 구현:
    - GO_NOW: 충분한 시간 있음 (15분 이상)
    - LAST_CHANCE: 마지막 기회 (0~15분)
    - NO_ACTION: 목표 시간 초과

    📊 데이터 흐름:
    1. 사용자 출퇴근 설정 조회 (MockUserDB)
    2. ODSAY API로 정류장 검색 (homeAddress → 좌표)
    3. ODSAY API로 경로 검색 (17개 경로)
    4. service.get_commute_briefing()에 경로 데이터 전달
    5. Logic 2.2 Gate 검증 (최적 경로 제안)

    Response Example:
    {
        "data": {
            "alertType": "GO_NOW",
            "message": "8:50 도착을 위해, 지금 집에서 출발하셔서 5분 뒤 오는 [123번 버스]를 타세요.",
            "recommendedTransport": {
                "type": "BUS",
                "name": "123번",
                "departureInMinutes": 5
            }
        }
    }
    """
    try:
        # 1️⃣ Mock DB에서 사용자 설정 조회
        commute_settings = MockUserDB.get_commute_settings(user_id)
        if not commute_settings:
            logger.error(f"❌ 사용자 없음: {user_id}")
            raise HTTPException(
                status_code=404,
                detail=f"User {user_id} not found"
            )

        logger.info(f"📋 사용자 설정 조회: {user_id}")
        logger.info(f"   집: {commute_settings['homeAddress']}")
        logger.info(f"   회사: {commute_settings['workAddress']}")

        # 2️⃣ ODSAY 경로 데이터 조회
        routes_data = await _get_routes_data_for_commute(commute_settings)

        # 6️⃣ 현재 시간으로 브리핑 생성
        current_time = datetime.now()

        # ✅ routes_data를 service에 전달 (ODSAY 실제 데이터 사용)
        result = service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time,
            routes_data=routes_data  # ← ODSAY 데이터 전달!
        )

        # 📌 향후 확장: Logic 2.2 (대안 경로) 검증에 routes_data 추가 활용
        # if routes_data and len(routes_data.get("paths", [])) > 1:
        #     result['data']['alternativeRoutes'] = routes_data

        if "error" in result:
            logger.error(f"❌ 출근 브리핑 조회 실패: {result['error']}")
        else:
            logger.info(f"✅ 출근 브리핑 조회: {user_id} -> {result['data']['alertType']}")
            # 최적화 이력 기록 (출근 모드)
            log_optimization_history(
                user_id=user_id,
                mode=SystemMode.COMMUTE,
                suggested_route=result.get("data", {}),
            )
        return result

    except HTTPException as e:
        # HTTPException은 그대로 전파 (404 등)
        raise e
    except Exception as e:
        logger.error(f"❌ 출근 브리핑 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 2️⃣ GET /api/v1/briefings/retreat - 퇴근 막차 알림 조회
@router.get("/retreat", response_model=Envelope[BriefingResponse])
def get_retreat_mode_last_bus_alert(
    user_id: str = Query("user_001", alias="userId", description="사용자 ID")
):
    """
    퇴근 모드 막차 알림 조회

    Logic 1.2 (퇴근 모드) 구현:
    - 사용자가 선택한 경로의 막차 시간 안내
    - 경로별 막차 시간: A(10분), B(30분), C(25분)

    Response Example:
    {
        "data": {
            "message": "선택하신 [B. 편안하게(착석)]의 막차가 30분 뒤입니다.",
            "recommendedTransport": {
                "type": "BUS",
                "name": "막차 (B)",
                "departureInMinutes": 30
            }
        }
    }
    """
    try:
        # 사용자 존재 여부 확인 (출근 설정이 있어야 퇴근 브리핑 가능)
        commute_settings = MockUserDB.get_commute_settings(user_id)
        if not commute_settings:
            logger.error(f"❌ 사용자 없음: {user_id}")
            raise HTTPException(
                status_code=404,
                detail=f"User {user_id} not found"
            )

        # 퇴근 목표 선택 조회 (기본값: C)
        selected_route = MockUserDB.get_retreat_choice(user_id) or "C"

        retreat_settings = {
            "userSelectedRoute": selected_route,
            "firstMileDefaultDuration": 5,
        }

        current_time = datetime.now()
        result = service.get_retreat_mode_last_bus_alert(
            retreat_settings=retreat_settings,
            current_time=current_time
        )

        logger.info(f"✅ 퇴근 막차 알림 조회: {user_id} -> {selected_route}")
        # 최적화 이력 기록 (퇴근 모드)
        log_optimization_history(
            user_id=user_id,
            mode=SystemMode.RETREAT,
            suggested_route=result.get("data", {}),
        )
        return result

    except HTTPException:
        raise  # HTTPException은 그대로 전달 (404 등)
    except Exception as e:
        logger.error(f"❌ 퇴근 막차 알림 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 7️⃣ GET /api/v1/briefings/transfer-reminder - 환승 리마인더 조회 (Logic 2.4)
@router.get("/transfer-reminder", response_model=Envelope[Dict[str, Any]])
async def get_transfer_reminder(
    user_id: str = Query("user_001", alias="userId", description="사용자 ID"),
    current_latitude: float = Query(..., alias="currentLatitude", description="현재 위도"),
    current_longitude: float = Query(..., alias="currentLongitude", description="현재 경도"),
    radius_meters: float = Query(500.0, alias="radiusMeters", description="환승역 반경 (미터)"),
):
    """
    환승 리마인더 조회 (Logic 2.4)

    사용자의 현재 위치와 선택된 출근 경로(기본: 최단 시간 경로)를 기준으로,
    다가오는 환승역 반경 내에 진입했을 때 환승 알림과 실시간 도착 정보를 제공합니다.

    Request (Query):
    - userId: 사용자 ID
    - currentLatitude: 현재 위도
    - currentLongitude: 현재 경도
    - radiusMeters: 환승역 반경 (기본값: 500m)

    Response:
    {
        "data": {
            "action": "TRANSFER_REMINDER" | "NO_ACTION",
            "stationName": "온수",
            "line": "7호선",
            "arrivalMinutes": 3,
            "isRealtime": true,
            "message": "다음 역인 [온수]에서 [7호선]으로 환승하셔야 합니다. 약 3분 후 도착 예정입니다.",
            "timestamp": "..."
        }
    }
    """
    try:
        # 1️⃣ 사용자 출근 설정 조회
        commute_settings = MockUserDB.get_commute_settings(user_id)
        if not commute_settings:
            logger.error(f"❌ 사용자 없음: {user_id}")
            raise HTTPException(
                status_code=404,
                detail=f"User {user_id} not found",
            )

        # 2️⃣ ODSAY 경로 데이터 조회
        routes_data = await _get_routes_data_for_commute(commute_settings)
        if not routes_data or not routes_data.get("paths"):
            logger.warning("⚠️ 환승 리마인더를 위한 경로 데이터 없음")
            return {
                "data": {
                    "action": "NO_ACTION",
                    "stationName": None,
                    "line": None,
                    "arrivalMinutes": None,
                    "isRealtime": False,
                    "message": "경로 데이터를 찾을 수 없습니다.",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            }

        # 3️⃣ 가장 빠른 경로 선택 (첫 번째 path)
        fastest_path = routes_data["paths"][0]

        # 4️⃣ 환승 지점 추출
        transfer_points = _build_transfer_points_from_path(fastest_path)
        if not transfer_points:
            logger.info("ℹ️ 환승 지점 없음 - 리마인더 생략")
            return {
                "data": {
                    "action": "NO_ACTION",
                    "stationName": None,
                    "line": None,
                    "arrivalMinutes": None,
                    "isRealtime": False,
                    "message": "환승 지점이 없는 경로입니다.",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            }

        # 5️⃣ 환승 리마인더 계산 (Logic 2.4)
        result = service.get_transfer_reminder(
            current_latitude=current_latitude,
            current_longitude=current_longitude,
            transfer_points=transfer_points,
            current_time=datetime.now(),
            radius_meters=radius_meters,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 환승 리마인더 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# Phase 12: 사용자 설정 관리 엔드포인트
# =====================================================

# 3️⃣ POST /api/v1/briefings/commute-settings - 출퇴근 설정 저장
@router.post("/commute-settings", response_model=Envelope[Dict[str, Any]])
def save_commute_settings(
    user_id: str = Query(..., alias="userId", description="사용자 ID"),
    home_address: str = Query(..., alias="homeAddress", description="집 주소"),
    work_address: str = Query(..., alias="workAddress", description="회사 주소"),
    target_arrival_hour: int = Query(..., alias="targetArrivalHour", ge=0, le=23, description="도착 시간 (시)"),
    target_arrival_minute: int = Query(..., alias="targetArrivalMinute", ge=0, le=59, description="도착 분 (분)"),
    first_mile_duration: int = Query(5, alias="firstMileDuration", ge=0, le=30, description="First Mile 도보 시간"),
    last_mile_duration: int = Query(5, alias="lastMileDuration", ge=0, le=30, description="Last Mile 도보 시간"),
):
    """
    사용자 출퇴근 설정 저장

    Request:
    - user_id: 사용자 ID
    - home_address: 집 주소
    - work_address: 회사 주소
    - target_arrival_hour: 도착 목표 시간 (시)
    - target_arrival_minute: 도착 목표 분 (분)
    - first_mile_duration: First Mile 도보 시간 (기본값: 5분)
    - last_mile_duration: Last Mile 도보 시간 (기본값: 5분)

    Response:
    {
        "data": {
            "action": "SETTINGS_SAVED",
            "userId": "user_001",
            "message": "설정이 저장되었습니다.",
            "settings": {
                "homeAddress": "...",
                "workAddress": "...",
                "targetArrivalTime": "08:50"
            }
        }
    }
    """
    try:
        # 입력 검증
        if not home_address or not work_address:
            raise HTTPException(status_code=400, detail="주소는 비울 수 없습니다")

        # 설정 저장
        settings = {
            "homeAddress": home_address,
            "workAddress": work_address,
            "targetArrivalTime": time(target_arrival_hour, target_arrival_minute),
            "firstMileDefaultDuration": first_mile_duration,
            "lastMileDefaultDuration": last_mile_duration,
        }

        success = MockUserDB.save_commute_settings(user_id, settings)

        if not success:
            raise HTTPException(status_code=400, detail="설정 저장 실패")

        return {
            "data": {
                "action": "SETTINGS_SAVED",
                "userId": user_id,
                "message": "설정이 저장되었습니다.",
                "settings": {
                    "homeAddress": home_address,
                    "workAddress": work_address,
                    "targetArrivalTime": f"{target_arrival_hour:02d}:{target_arrival_minute:02d}",
                    "firstMileDefaultDuration": first_mile_duration,
                    "lastMileDefaultDuration": last_mile_duration,
                }
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ 출퇴근 설정 저장 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 4️⃣ GET /api/v1/briefings/commute-settings - 출퇴근 설정 조회
@router.get("/commute-settings", response_model=Envelope[Dict[str, Any]])
def get_commute_settings(
    user_id: str = Query("user_001", alias="userId", description="사용자 ID")
):
    """
    사용자 출퇴근 설정 조회

    Response:
    {
        "data": {
            "userId": "user_001",
            "homeAddress": "...",
            "workAddress": "...",
            "targetArrivalTime": "08:50",
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7
        }
    }
    """
    try:
        settings = MockUserDB.get_commute_settings(user_id)
        if not settings:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")

        logger.info(f"✅ 출퇴근 설정 조회: {user_id}")

        return {
            "data": {
                "userId": user_id,
                "homeAddress": settings["homeAddress"],
                "workAddress": settings["workAddress"],
                "targetArrivalTime": settings["targetArrivalTime"].strftime("%H:%M"),
                "firstMileDefaultDuration": settings["firstMileDefaultDuration"],
                "lastMileDefaultDuration": settings["lastMileDefaultDuration"],
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ 출퇴근 설정 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# Phase 12: 퇴근 모드 엔드포인트
# =====================================================

# 5️⃣ POST /api/v1/briefings/retreat-choice - 퇴근 목표 선택 저장
@router.post("/retreat-choice", response_model=Envelope[Dict[str, Any]])
def save_retreat_choice(
    user_id: str = Query(..., alias="userId", description="사용자 ID"),
    choice: str = Query(..., regex="^[ABC]$", description="선택지 (A/B/C)"),
):
    """
    퇴근 모드 사용자 목표 선택 저장

    Logic 4.1 구현:
    - A: 가장 빠르게 (최단 시간)
    - B: 편안하게 (착석 선호)
    - C: 평소 경로 (습관)

    Response:
    {
        "data": {
            "action": "CHOICE_SAVED",
            "userId": "user_001",
            "selectedChoice": "B",
            "selectedLabel": "편안하게",
            "message": "퇴근 목표가 저장되었습니다."
        }
    }
    """
    try:
        if choice not in ["A", "B", "C"]:
            raise HTTPException(status_code=400, detail="Invalid choice. Must be A, B, or C")

        success = MockUserDB.save_retreat_choice(user_id, choice)

        if not success:
            raise HTTPException(status_code=400, detail="선택 저장 실패")

        # 선택지별 레이블
        labels = {
            "A": "가장 빠르게",
            "B": "편안하게",
            "C": "평소 경로"
        }

        return {
            "data": {
                "action": "CHOICE_SAVED",
                "userId": user_id,
                "selectedChoice": choice,
                "selectedLabel": labels[choice],
                "message": f"퇴근 목표 '{labels[choice]}'로 저장되었습니다."
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ 퇴근 목표 선택 저장 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 6️⃣ GET /api/v1/briefings/retreat-choice - 퇴근 목표 선택 조회
@router.get("/retreat-choice", response_model=Envelope[Dict[str, Any]])
def get_retreat_choice(
    user_id: str = Query("user_001", alias="userId", description="사용자 ID")
):
    """
    사용자 퇴근 목표 선택 조회

    Response:
    {
        "data": {
            "userId": "user_001",
            "selectedChoice": "B",
            "selectedLabel": "편안하게"
        }
    }
    """
    try:
        choice = MockUserDB.get_retreat_choice(user_id) or "C"

        labels = {
            "A": "가장 빠르게",
            "B": "편안하게",
            "C": "평소 경로"
        }

        logger.info(f"✅ 퇴근 목표 조회: {user_id} -> {choice}")

        return {
            "data": {
                "userId": user_id,
                "selectedChoice": choice,
                "selectedLabel": labels[choice]
            }
        }

    except Exception as e:
        logger.error(f"❌ 퇴근 목표 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# ODSAY API 테스트 엔드포인트 (개발/테스트용)
# =====================================================

@router.get("/odsay/test/station", tags=["ODSAY Test"])
async def test_odsay_station_search(
    station_name: str = Query(..., description="검색할 역/정류장 이름 (예: 강남역)")
):
    """
    ODSAY Station Search API 테스트

    Example: GET /api/v1/briefings/odsay/test/station?station_name=강남역
    """
    try:
        logger.info(f"🔍 ODSAY Station 검색 테스트: {station_name}")

        api_key = os.getenv("ODSAY_API_KEY")
        if not api_key:
            return {
                "data": None,
                "error": {
                    "code": "CONFIG_ERROR",
                    "message": "ODSAY_API_KEY 환경변수가 설정되지 않았습니다"
                }
            }

        client = OdsayAPIClient(api_key=api_key)
        response = await client.search_station(station_name=station_name)

        if "error" in response:
            return {
                "data": None,
                "error": {
                    "code": "ODSAY_ERROR",
                    "message": f"역 검색 실패: {response['error']}"
                }
            }

        stations = response.get("result", {}).get("station", [])

        return {
            "data": {
                "searchQuery": station_name,
                "totalCount": len(stations),
                "stations": [
                    {
                        "stationName": s.get("stationName"),
                        "stationID": s.get("stationID"),
                        "x": s.get("x"),
                        "y": s.get("y"),
                        "address": f"{s.get('do')} {s.get('gu')} {s.get('dong')}",
                        "stationType": "Bus" if s.get("stationClass") == 1 else "Subway"
                    }
                    for s in stations[:5]  # 상위 5개만
                ]
            }
        }

    except Exception as e:
        logger.error(f"❌ ODSAY Station 검색 오류: {str(e)}")
        return {
            "data": None,
            "error": {
                "code": "ODSAY_ERROR",
                "message": str(e)
            }
        }


@router.get("/odsay/test/route", tags=["ODSAY Test"])
async def test_odsay_route_search(
    start_station: str = Query(..., description="출발역 이름 (예: 강남역)"),
    end_station: str = Query(..., description="도착역 이름 (예: 을지로입구역)")
):
    """
    ODSAY Route Search API 테스트 (역 검색 → 경로 검색)

    Example: GET /api/v1/briefings/odsay/test/route?start_station=강남역&end_station=을지로입구역
    """
    try:
        logger.info(f"🔍 ODSAY 경로 검색 테스트: {start_station} → {end_station}")

        api_key = os.getenv("ODSAY_API_KEY")
        if not api_key:
            return {
                "data": None,
                "error": {
                    "code": "CONFIG_ERROR",
                    "message": "ODSAY_API_KEY 환경변수가 설정되지 않았습니다"
                }
            }

        client = OdsayAPIClient(api_key=api_key)

        # Step 1: 출발역 검색
        start_response = await client.search_station(station_name=start_station)
        if "error" in start_response or "result" not in start_response:
            return {
                "data": None,
                "error": {
                    "code": "STATION_NOT_FOUND",
                    "message": f"출발역 '{start_station}' 검색 실패"
                }
            }

        start_stations = start_response.get("result", {}).get("station", [])
        if not start_stations:
            return {
                "data": None,
                "error": {
                    "code": "STATION_NOT_FOUND",
                    "message": f"출발역 '{start_station}' 검색 결과 없음"
                }
            }

        start_station_data = start_stations[0]
        start_x = start_station_data["x"]
        start_y = start_station_data["y"]

        # Step 2: 도착역 검색
        end_response = await client.search_station(station_name=end_station)
        if "error" in end_response or "result" not in end_response:
            return {
                "data": None,
                "error": {
                    "code": "STATION_NOT_FOUND",
                    "message": f"도착역 '{end_station}' 검색 실패"
                }
            }

        end_stations = end_response.get("result", {}).get("station", [])
        if not end_stations:
            return {
                "data": None,
                "error": {
                    "code": "STATION_NOT_FOUND",
                    "message": f"도착역 '{end_station}' 검색 결과 없음"
                }
            }

        end_station_data = end_stations[0]
        end_x = end_station_data["x"]
        end_y = end_station_data["y"]

        # Step 3: 경로 검색
        route_response = await client.search_route(
            start_x=start_x,
            start_y=start_y,
            end_x=end_x,
            end_y=end_y,
            search_type=0
        )

        if "error" in route_response:
            return {
                "data": None,
                "error": {
                    "code": "ROUTE_NOT_FOUND",
                    "message": f"경로 검색 실패"
                }
            }

        paths = route_response.get("result", {}).get("path", [])
        parsed = client.parse_route_info(route_response)

        return {
            "data": {
                "startStation": start_station_data["stationName"],
                "endStation": end_station_data["stationName"],
                "startCoord": {"x": start_x, "y": start_y},
                "endCoord": {"x": end_x, "y": end_y},
                "totalPaths": len(paths),
                "paths": parsed.get("paths", [])[:3]  # 상위 3개만
            }
        }

    except Exception as e:
        logger.error(f"❌ ODSAY 경로 검색 오류: {str(e)}")
        return {
            "data": None,
            "error": {
                "code": "ODSAY_ERROR",
                "message": str(e)
            }
        }
