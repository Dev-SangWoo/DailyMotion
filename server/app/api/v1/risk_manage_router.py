"""
위험 관리 & 시민 리포트 관련 API 라우터
"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/risk-manage", tags=["risk-manage"])


class ReportRequest(BaseModel):
    """시민 리포트 요청 모델"""
    location: dict
    risk_type: str
    description: str
    reporter_id: int


@router.post("/report")
async def create_report(request: ReportRequest):
    """시민 리포트 생성"""
    # TODO: modules/risk_manage/service.py의 비즈니스 로직 호출
    return {"message": "리포트 생성 완료", "report_id": 1}


@router.get("/reports")
async def get_reports():
    """리포트 목록 조회"""
    # TODO: modules/risk_manage/service.py의 비즈니스 로직 호출
    return {"message": "리포트 목록 조회"}


@router.get("/risk-zones")
async def get_risk_zones():
    """위험 지역 조회"""
    # TODO: modules/risk_manage/service.py의 비즈니스 로직 호출
    return {"message": "위험 지역 조회"}

