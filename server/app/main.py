"""
데일리모션 FastAPI 메인 애플리케이션
모듈형 모놀리식 아키텍처를 따릅니다.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import api_router
from app.api.v1.path_optimize_router import router as path_optimize_router
from dotenv import load_dotenv
import os

# .env 파일 로드
load_dotenv()

app = FastAPI(
    title=settings.APP_NAME,
    description="데일리모션 프로젝트의 FastAPI 서버 (모듈형 모놀리식)",
    version=settings.APP_VERSION,
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(api_router)


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {
        "status": "ok",
        "message": "서버가 정상 작동 중입니다.",
        "version": settings.APP_VERSION
    }


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "데일리모션 API에 오신 것을 환영합니다.",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }
#테스트 11/12
app.include_router(path_optimize_router, prefix="/api/v1")

