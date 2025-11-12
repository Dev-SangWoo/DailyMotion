"""
사용자 관련 API 라우터
"""
from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/")
async def get_users():
    """사용자 목록 조회"""
    # TODO: modules/user/service.py의 비즈니스 로직 호출
    return {"message": "사용자 목록 조회"}


@router.get("/{user_id}")
async def get_user(user_id: int):
    """사용자 상세 조회"""
    # TODO: modules/user/service.py의 비즈니스 로직 호출
    return {"message": f"사용자 {user_id} 조회"}

