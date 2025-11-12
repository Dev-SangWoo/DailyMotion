"""
AI 패턴 학습 관련 API 라우터
"""
from fastapi import APIRouter

router = APIRouter(prefix="/ai-pattern", tags=["ai-pattern"])


@router.post("/learn")
async def learn_pattern():
    """AI 패턴 학습"""
    # TODO: modules/ai_pattern/service.py의 비즈니스 로직 호출
    return {"message": "AI 패턴 학습 시작"}


@router.get("/patterns")
async def get_patterns():
    """학습된 패턴 목록 조회"""
    # TODO: modules/ai_pattern/service.py의 비즈니스 로직 호출
    return {"message": "패턴 목록 조회"}

