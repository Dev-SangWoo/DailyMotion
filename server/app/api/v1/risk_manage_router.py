"""
위험 관리 & 시민 리포트 관련 API 라우터

Design-First 규칙:
- 모든 JSON 키는 camelCase 사용
- 응답은 Envelope 패턴 {"data": {...}} 사용
"""
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Query, Body, HTTPException
from pydantic import BaseModel, Field

from app.common.response import Envelope
from app.modules.risk_manage.service import RiskManageService

router = APIRouter(prefix="/risk-manage", tags=["RiskManage"])


class Location(BaseModel):
    """위치 정보 (위도/경도)"""
    lat: float = Field(..., description="위도")
    lng: float = Field(..., description="경도")


class ReportRequest(BaseModel):
    """시민 리포트 생성 요청 모델"""
    location: Location
    riskType: str = Field(..., description="위험 유형 (예: flooding, traffic_accident)")
    description: str = Field(..., description="상세 설명")
    reporterId: int = Field(..., description="리포트 작성자 ID")


class ReportResponse(BaseModel):
    reportId: int = Field(..., description="리포트 ID")
    status: str = Field(..., description="생성 상태")
    location: Dict[str, Any]


class DisasterAlertResponse(BaseModel):
    """재난 문자 응답 모델"""
    id: int = Field(..., description="재난 문자 ID")
    type: str = Field(..., description="재난 유형")
    message: str = Field(..., description="메시지 내용")
    region: str = Field(..., description="지역명")
    emergencyStep: str = Field(..., description="비상 단계")
    date: str = Field(..., description="날짜 (ISO 8601)")
    icon: str = Field(..., description="아이콘")
    location: Optional[Dict[str, float]] = Field(None, description="위치 좌표 (없을 수 있음, 형식: {'lat': float, 'lng': float})")
    distance: Optional[float] = Field(None, description="경로로부터의 거리 (미터)")
    hasAccurateLocation: Optional[bool] = Field(None, description="정확한 좌표인지 여부")


class DisasterAlertRequest(BaseModel):
    """재난 문자 조회 요청 모델"""
    routeCoords: List[Location] = Field(..., description="경로 좌표 배열")
    radius: Optional[float] = Field(500, description="반경 (미터, 기본값: 500)")
    days: Optional[int] = Field(21, description="조회할 일수 (기본값: 21일 = 3주)")


risk_service = RiskManageService()


@router.post(
    "/report",
    response_model=Envelope[ReportResponse],
    summary="시민 리포트 생성",
    description="위험 지역에 대한 시민 리포트를 생성합니다.",
)
async def create_report(request: ReportRequest = Body(...)):
    """시민 리포트 생성"""
    try:
        result = risk_service.create_report(
            reporter_id=request.reporterId,
            location={"lat": request.location.lat, "lng": request.location.lng},
            risk_type=request.riskType,
            description=request.description,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # service 레이어는 snake_case 키를 사용할 수 있으므로 여기서 camelCase로 매핑
    return {
        "data": ReportResponse(
            reportId=result.get("report_id", 0),
            status=result.get("status", "created"),
            location=result.get("location", {}),
        )
    }


@router.get(
    "/reports",
    response_model=Envelope[List[Dict[str, Any]]],
    summary="리포트 목록 조회",
    description="시민 리포트 목록을 조회합니다.",
)
async def get_reports(
    riskType: Optional[str] = Query(None, description="위험 유형 필터 (선택)"),
):
    """리포트 목록 조회"""
    try:
        filters: Dict[str, Any] = {}
        if riskType:
            filters["risk_type"] = riskType

        reports = risk_service.get_reports(filters=filters)
        return {"data": reports}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/risk-zones",
    response_model=Envelope[List[Dict[str, Any]]],
    summary="위험 지역 조회",
    description="위험 지역 목록을 조회합니다.",
)
async def get_risk_zones(
    minLat: Optional[float] = Query(None, description="조회 범위 최소 위도"),
    maxLat: Optional[float] = Query(None, description="조회 범위 최대 위도"),
    minLng: Optional[float] = Query(None, description="조회 범위 최소 경도"),
    maxLng: Optional[float] = Query(None, description="조회 범위 최대 경도"),
):
    """위험 지역 조회"""
    try:
        bounds: Optional[Dict[str, Any]] = None
        if all(v is not None for v in (minLat, maxLat, minLng, maxLng)):
            bounds = {
                "min_lat": minLat,
                "max_lat": maxLat,
                "min_lng": minLng,
                "max_lng": maxLng,
            }

        risk_zones = risk_service.get_risk_zones(bounds=bounds)
        return {"data": risk_zones}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/disaster-alerts/all",
    response_model=Envelope[List[DisasterAlertResponse]],
    summary="전체 재난 문자 조회",
    description="엑셀 파일의 재난 문자를 조회합니다. 최근 1개월치 데이터만 반환합니다.",
)
async def get_all_disaster_alerts(
    limit: int = Query(1000, description="반환할 최대 개수 (기본값: 1000개)", ge=1, le=10000),
    days: int = Query(30, description="조회할 일수 (기본값: 30일 = 1개월)", ge=1, le=365)
):
    """전체 재난 문자 조회 (경로 필터링 없음, 최근 N일치만)"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[RiskManageRouter] 재난 문자 조회 요청: limit={limit}, days={days}")
        
        alerts = risk_service.get_all_disaster_alerts(limit=limit, days=days)
        
        logger.info(f"[RiskManageRouter] 서비스에서 받은 재난 문자: {len(alerts)}개")
        
        # 응답 모델로 변환
        alert_responses = []
        for alert in alerts:
            # location 형식 확인 및 변환
            location = alert.get("location")
            if location and isinstance(location, dict):
                # location이 {"lat": ..., "lng": ...} 형식인지 확인
                if "lat" in location and "lng" in location:
                    location = {"lat": float(location["lat"]), "lng": float(location["lng"])}
                else:
                    # 형식이 맞지 않으면 None으로 설정
                    location = None
            
            alert_response = DisasterAlertResponse(
                id=alert["id"],
                type=alert["type"],
                message=alert["message"],
                region=alert["region"],
                emergencyStep=alert.get("emergencyStep", ""),
                date=alert["date"],
                icon=alert["icon"],
                location=location,
                distance=alert.get("distance"),
                hasAccurateLocation=alert.get("hasAccurateLocation", False),
            )
            alert_responses.append(alert_response)
        
        logger.info(f"[RiskManageRouter] 응답 모델 변환 완료: {len(alert_responses)}개")
        if alert_responses:
            logger.info(f"[RiskManageRouter] 첫 번째 응답 데이터: ID={alert_responses[0].id}, Type={alert_responses[0].type}, Region={alert_responses[0].region}, Location={alert_responses[0].location}")
        
        return {"data": alert_responses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/disaster-alerts",
    response_model=Envelope[List[DisasterAlertResponse]],
    summary="재난 문자 조회",
    description="경로 근처의 재난 문자를 조회합니다. 현재 날짜 기준 3주 이내 데이터만 반환합니다.",
)
async def get_disaster_alerts(request: DisasterAlertRequest = Body(...)):
    """재난 문자 조회"""
    try:
        # Location 리스트를 dict 리스트로 변환
        route_coords = [{"lat": loc.lat, "lng": loc.lng} for loc in request.routeCoords]
        
        alerts = risk_service.get_disaster_alerts(
            route_coords=route_coords,
            radius_meters=request.radius or 500,
            days=request.days or 21
        )
        
        # 응답 모델로 변환
        alert_responses = [
            DisasterAlertResponse(
                id=alert["id"],
                type=alert["type"],
                message=alert["message"],
                region=alert["region"],
                emergencyStep=alert["emergencyStep"],
                date=alert["date"],
                icon=alert["icon"],
                location=alert["location"],
                distance=alert.get("distance"),
            )
            for alert in alerts
        ]
        
        return {"data": alert_responses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
