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
