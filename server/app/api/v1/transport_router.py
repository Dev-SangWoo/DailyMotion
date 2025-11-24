"""
대중교통 실시간 정보 API 라우터

헌법 준수:
- AGENTS.md [제1장]: 모듈형 모놀리식 아키텍처
- AGENTS.md [제3장]: OpenAPI 스펙 기반 설계도 우선 (Design-First)
- AGENTS.md [제2장]: 표준 응답 형식 (data/error)
"""

import logging
import os
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from app.common.response import Envelope
from app.services.odsay_client import OdsayAPIClient
from app.services.transport_api_client import TransportAPIClient

logger = logging.getLogger(__name__)

# =====================================================
# 라우터 정의
# =====================================================

router = APIRouter(
    prefix="/transport",
    tags=["Transport"],
)

# =====================================================
# 서비스 인스턴스 초기화
# =====================================================

transport_client = TransportAPIClient()


# =====================================================
# 실시간 대중교통 정보 조회 엔드포인트
# =====================================================

@router.get(
    "/realtime",
    response_model=Envelope[Dict[str, Any]],
)
async def get_realtime_transport_info(
    stationName: str = Query(..., alias="stationName", description="정류장/역 이름 (예: 강남역)"),
    transportType: str = Query("AUTO", alias="transportType", description="교통수단 타입 (BUS/SUBWAY/AUTO)"),
):
    """
    실시간 대중교통 정보 조회

    정류장/역 이름을 입력받아 실시간 버스/지하철 도착 정보를 조회합니다.

    동작 흐름:
    1. 정류장/역 이름으로 검색하여 stationID 획득
    2. stationID로 실시간 도착 정보 조회
    3. 버스/지하철 구분하여 정보 반환

    Args:
        stationName: 정류장/역 이름
        transportType: 교통수단 타입 (BUS/SUBWAY/AUTO)

    Returns:
        {
            "data": {
                "stationName": "강남역",
                "stationId": "208000143",
                "transportType": "SUBWAY",
                "buses": [...],  # transportType이 BUS인 경우
                "subways": [...],  # transportType이 SUBWAY인 경우
                "timestamp": "2024-01-15T08:30:00Z"
            }
        }
    """
    try:
        # 1️⃣ ODSAY API 키 확인
        api_key = os.getenv("ODSAY_API_KEY")
        if not api_key:
            logger.error("❌ ODSAY_API_KEY 환경변수가 설정되지 않았습니다")
            raise HTTPException(
                status_code=500,
                detail="ODSAY_API_KEY 환경변수가 설정되지 않았습니다"
            )

        odsay_client = OdsayAPIClient(api_key=api_key)

        # 2️⃣ 정류장/역 검색
        # transportType에 따라 station_class 설정
        if transportType == "BUS":
            station_class = "1"  # 버스만
        elif transportType == "SUBWAY":
            station_class = "2"  # 지하철만
        else:  # AUTO
            station_class = "1:2"  # 둘 다

        logger.info(f"🔍 정류장/역 검색: '{stationName}' (type: {transportType})")
        station_response = await odsay_client.search_station(
            station_name=stationName,
            station_class=station_class,
            display_cnt=5
        )

        if "error" in station_response or "result" not in station_response:
            logger.warning(f"⚠️ 정류장 검색 실패: {stationName}")
            raise HTTPException(
                status_code=404,
                detail=f"정류장/역 '{stationName}'을(를) 찾을 수 없습니다"
            )

        stations = station_response.get("result", {}).get("station", [])
        if not stations:
            logger.warning(f"⚠️ 정류장 검색 결과 없음: {stationName}")
            raise HTTPException(
                status_code=404,
                detail=f"정류장/역 '{stationName}'을(를) 찾을 수 없습니다"
            )

        # 첫 번째 검색 결과 사용
        station_data = stations[0]
        station_id = station_data.get("stationID")
        station_name = station_data.get("stationName")
        station_class_code = station_data.get("stationClass")

        if not station_id:
            logger.error(f"❌ stationID가 없음: {station_data}")
            raise HTTPException(
                status_code=500,
                detail="정류장 ID를 찾을 수 없습니다"
            )

        logger.info(f"✅ 정류장 발견: {station_name} (ID: {station_id}, Class: {station_class_code})")

        # 3️⃣ 실시간 정보 조회
        result_data: Dict[str, Any] = {
            "stationName": station_name,
            "stationId": station_id,
            "timestamp": None,  # 나중에 설정
        }

        # stationClass: 1=버스, 2=지하철
        if station_class_code == 1 or transportType == "BUS":
            # 버스 실시간 정보 조회
            logger.info(f"🚌 버스 실시간 정보 조회: {station_id}")
            bus_info = await transport_client.get_next_bus_arrivals(station_id)
            
            result_data["transportType"] = "BUS"
            result_data["buses"] = bus_info.get("buses", [])
            result_data["subways"] = []

        elif station_class_code == 2 or transportType == "SUBWAY":
            # 지하철 실시간 정보 조회
            logger.info(f"🚇 지하철 실시간 정보 조회: {station_id}")
            subway_info = await transport_client.get_subway_info(station_id)
            
            result_data["transportType"] = "SUBWAY"
            result_data["subways"] = subway_info.get("subways", [])
            result_data["buses"] = []

        else:
            # AUTO 모드: stationClass에 따라 자동 판단
            # 버스와 지하철 모두 조회 시도
            logger.info(f"🔍 AUTO 모드: 버스/지하철 모두 조회 시도")
            
            bus_info = await transport_client.get_next_bus_arrivals(station_id)
            subway_info = await transport_client.get_subway_info(station_id)
            
            buses = bus_info.get("buses", [])
            subways = subway_info.get("subways", [])
            
            # 결과가 있는 것에 따라 transportType 결정
            if buses and subways:
                # 둘 다 있으면 지하철 우선
                result_data["transportType"] = "SUBWAY"
                result_data["subways"] = subways
                result_data["buses"] = buses
            elif subways:
                result_data["transportType"] = "SUBWAY"
                result_data["subways"] = subways
                result_data["buses"] = []
            elif buses:
                result_data["transportType"] = "BUS"
                result_data["buses"] = buses
                result_data["subways"] = []
            else:
                # 둘 다 없으면 지하철로 설정 (기본값)
                result_data["transportType"] = "SUBWAY"
                result_data["subways"] = []
                result_data["buses"] = []

        # 타임스탬프 추가
        from datetime import datetime
        result_data["timestamp"] = datetime.utcnow().isoformat() + "Z"

        logger.info(
            f"✅ 실시간 정보 조회 성공: {station_name} "
            f"({result_data['transportType']}, "
            f"버스 {len(result_data.get('buses', []))}개, "
            f"지하철 {len(result_data.get('subways', []))}개)"
        )

        return {
            "data": result_data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 실시간 대중교통 정보 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"실시간 정보 조회 중 오류가 발생했습니다: {str(e)}"
        )

