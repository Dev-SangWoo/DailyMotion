"""
경로 최적화 관련 API 라우터

Phase 12: API Endpoint 구현 (Mock 기반)
- 출근 브리핑 조회
- 출퇴근 설정 저장/조회
- 퇴근 목표 선택 저장
"""
from datetime import datetime, time
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
import logging
import os

from app.modules.path_optimize.service import PathOptimizeService
from app.modules.path_optimize.models import (
    SystemMode,
    CommuteSettings,
)
from app.services.odsay_client import OdsayAPIClient

logger = logging.getLogger(__name__)

# =====================================================
# 라우터 정의
# =====================================================

router = APIRouter(
    prefix="/briefings",
    tags=["Briefings"],
)

# =====================================================
# Phase 12: Mock 기반 사용자 데이터 저장소
# =====================================================

class MockUserDB:
    """
    메모리 기반 Mock 데이터베이스 (테스트/개발용)
    나중에 실제 PostgreSQL로 교체될 예정
    """
    # 기본 사용자 데이터 (하드코딩)
    _commute_settings = {
        "user_001": {
            "homeAddress": "서울 강남구 역삼동",
            "workAddress": "서울 중구 을지로",
            "targetArrivalTime": time(8, 50),
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7,
        },
        "user_002": {
            "homeAddress": "서울 서초구",
            "workAddress": "서울 강남구 테헤란로",
            "targetArrivalTime": time(9, 30),
            "firstMileDefaultDuration": 3,
            "lastMileDefaultDuration": 5,
        }
    }

    # 퇴근 목표 저장소
    _retreat_choices = {}  # user_id -> choice (A/B/C)

    @classmethod
    def get_commute_settings(cls, user_id: str) -> Optional[dict]:
        """출근 설정 조회"""
        return cls._commute_settings.get(user_id)

    @classmethod
    def save_commute_settings(cls, user_id: str, settings: dict) -> bool:
        """출근 설정 저장"""
        if not settings.get("targetArrivalTime"):
            return False
        cls._commute_settings[user_id] = settings
        logger.info(f"✅ 출근 설정 저장: {user_id}")
        return True

    @classmethod
    def get_retreat_choice(cls, user_id: str) -> Optional[str]:
        """퇴근 목표 선택 조회 (A/B/C)"""
        return cls._retreat_choices.get(user_id)

    @classmethod
    def save_retreat_choice(cls, user_id: str, choice: str) -> bool:
        """퇴근 목표 선택 저장 (A/B/C)"""
        if choice not in ["A", "B", "C"]:
            return False
        cls._retreat_choices[user_id] = choice
        logger.info(f"✅ 퇴근 목표 저장: {user_id} -> {choice}")
        return True


# =====================================================
# 서비스 인스턴스 초기화
# =====================================================

service = PathOptimizeService()


# =====================================================
# Phase 12: API Endpoint 구현
# =====================================================

# 1️⃣ GET /api/v1/briefings/commute - 출근 브리핑 조회
@router.get("/commute", response_model=dict)
def get_commute_briefing(
    user_id: str = Query("user_001", description="사용자 ID")
):
    """
    출근 브리핑 조회

    Logic 1.1 & 1.2 구현:
    - GO_NOW: 충분한 시간 있음 (15분 이상)
    - LAST_CHANCE: 마지막 기회 (0~15분)
    - NO_ACTION: 목표 시간 초과

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
        # Mock DB에서 사용자 설정 조회
        commute_settings = MockUserDB.get_commute_settings(user_id)
        if not commute_settings:
            logger.error(f"❌ 사용자 없음: {user_id}")
            raise HTTPException(
                status_code=404,
                detail=f"User {user_id} not found"
            )

        # 현재 시간으로 브리핑 생성
        current_time = datetime.now()
        result = service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time
        )

        logger.info(f"✅ 출근 브리핑 조회: {user_id} -> {result['data']['alertType']}")
        return result

    except HTTPException as e:
        # HTTPException은 그대로 전파 (404 등)
        raise e
    except Exception as e:
        logger.error(f"❌ 출근 브리핑 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 2️⃣ GET /api/v1/briefings/retreat - 퇴근 막차 알림 조회
@router.get("/retreat", response_model=dict)
def get_retreat_mode_last_bus_alert(
    user_id: str = Query("user_001", description="사용자 ID")
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
        return result

    except Exception as e:
        logger.error(f"❌ 퇴근 막차 알림 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# Phase 12: 사용자 설정 관리 엔드포인트
# =====================================================

# 3️⃣ POST /api/v1/briefings/commute-settings - 출퇴근 설정 저장
@router.post("/commute-settings", response_model=dict)
def save_commute_settings(
    user_id: str = Query(..., description="사용자 ID"),
    home_address: str = Query(..., description="집 주소"),
    work_address: str = Query(..., description="회사 주소"),
    target_arrival_hour: int = Query(..., ge=0, le=23, description="도착 시간 (시)"),
    target_arrival_minute: int = Query(..., ge=0, le=59, description="도착 분 (분)"),
    first_mile_duration: int = Query(5, ge=0, le=30, description="First Mile 도보 시간"),
    last_mile_duration: int = Query(5, ge=0, le=30, description="Last Mile 도보 시간"),
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
@router.get("/commute-settings", response_model=dict)
def get_commute_settings(
    user_id: str = Query("user_001", description="사용자 ID")
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
@router.post("/retreat-choice", response_model=dict)
def save_retreat_choice(
    user_id: str = Query(..., description="사용자 ID"),
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
@router.get("/retreat-choice", response_model=dict)
def get_retreat_choice(
    user_id: str = Query("user_001", description="사용자 ID")
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


