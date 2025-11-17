"""
사용자 관련 API 라우터

Design-First 규칙:
- Users 도메인 외부에 노출할 API는 최소한으로 유지
- 출퇴근 설정 저장은 /users/me/settings/commute 하나에 집중
"""
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, Field

from app.common.response import Envelope
from app.modules.path_optimize.models import CommuteSettings
from app.modules.path_optimize.mock_user_db import MockUserDB

router = APIRouter(prefix="/users", tags=["Users"])


class CommuteSettingsSaveResult(BaseModel):
    """출퇴근 설정 저장 결과 응답 모델"""
    status: str = Field(..., description="저장 상태 (예: SETTINGS_SAVED)")
    userId: str = Field(..., description="사용자 ID")
    savedAt: str = Field(..., description="UTC 기준 저장 시각 ISO 문자열")


@router.put(
    "/me/settings/commute",
    response_model=Envelope[CommuteSettingsSaveResult],
    summary="출퇴근 설정 저장",
    description="집/회사/목표 도착 시간 및 출퇴근 관련 설정을 저장합니다.",
)
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
    settings_dict: Dict[str, Any] = {
        "homeAddress": settings.homeAddress,
        "workAddress": settings.workAddress,
        "targetArrivalTime": settings.targetArrivalTime,
        "firstMileDefaultDuration": settings.firstMileDefaultDuration,
        "lastMileDefaultDuration": settings.lastMileDefaultDuration,
        # 좌표가 넘어온 경우에는 함께 저장하여 좌표 기반 ODSAY 경로 검색에 활용
        "homeLatitude": settings.homeLatitude,
        "homeLongitude": settings.homeLongitude,
        "workLatitude": settings.workLatitude,
        "workLongitude": settings.workLongitude,
    }
    success = MockUserDB.save_commute_settings(user_id, settings_dict)

    if not success:
        raise HTTPException(status_code=400, detail="설정 저장 실패")

    result = CommuteSettingsSaveResult(
        status="SETTINGS_SAVED",
        userId=user_id,
        savedAt=datetime.utcnow().isoformat(),
    )

    return {"data": result}
