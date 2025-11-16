"""
사용자 관련 API 라우터
"""
from datetime import datetime

from fastapi import APIRouter, Body, HTTPException

from app.modules.path_optimize.models import CommuteSettings
from app.modules.path_optimize.mock_user_db import MockUserDB

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/")
async def get_users():
    """사용자 목록 조회 (Mock)"""
    # TODO: 실제 User 서비스/DB 연동
    return {"message": "사용자 목록 조회 (mock)"}


@router.get("/{user_id}")
async def get_user(user_id: int):
    """사용자 상세 조회 (Mock)"""
    # TODO: 실제 User 서비스/DB 연동
    return {"message": f"사용자 {user_id} 조회 (mock)"}


@router.put("/me/settings/commute")
async def update_commute_settings(
    settings: CommuteSettings = Body(..., description="사용자 출퇴근 설정"),
):
    """
    출퇴근 설정 저장 (Design-First: /users/me/settings/commute)

    현재는 인증/식별이 없어 'me'를 내부적으로 user_001로 매핑합니다.
    나중에 인증이 붙으면 access token의 사용자 ID를 사용하도록 변경 예정입니다.
    """
    # TODO: 인증이 붙으면 실제 사용자 ID를 추출하도록 변경
    user_id = "user_001"

    # CommuteSettings(Pydantic)를 MockUserDB 내부 dict 포맷으로 변환
    settings_dict = {
        "homeAddress": settings.homeAddress,
        "workAddress": settings.workAddress,
        "targetArrivalTime": settings.targetArrivalTime,
        "firstMileDefaultDuration": settings.firstMileDefaultDuration,
        "lastMileDefaultDuration": settings.lastMileDefaultDuration,
    }
    success = MockUserDB.save_commute_settings(user_id, settings_dict)

    if not success:
        raise HTTPException(status_code=400, detail="설정 저장 실패")

    return {
        "data": {
            "status": "SETTINGS_SAVED",
            "userId": user_id,
            "savedAt": datetime.utcnow().isoformat(),
        }
    }
