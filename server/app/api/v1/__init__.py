"""
API v1 라우터 패키지
프론트엔드와 만나는 유일한 '국경'입니다.
"""
from fastapi import APIRouter

# v1 API 라우터 생성
api_router = APIRouter(prefix="/api/v1", tags=["v1"])

# 라우터들을 import하여 등록
from .user_router import router as user_router
from .ai_pattern_router import router as ai_pattern_router
from .path_optimize_router import router as path_optimize_router
from .risk_manage_router import router as risk_manage_router

# 라우터 등록
api_router.include_router(user_router)
api_router.include_router(ai_pattern_router)
api_router.include_router(path_optimize_router)
api_router.include_router(risk_manage_router)

