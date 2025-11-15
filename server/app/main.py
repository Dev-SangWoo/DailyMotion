"""
데일리모션 FastAPI 메인 애플리케이션
모듈형 모놀리식 아키텍처를 따릅니다.
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.v1 import api_router
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

# =====================================================
# HTTPException 커스텀 핸들러 (OpenAPI 스펙 준수)
# =====================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    HTTPException을 OpenAPI 스펙 형식으로 변환

    변환 전: {"detail": "..."}
    변환 후: {"error": {"code": "E404", "message": "..."}}
    """
    # HTTP 상태 코드에 맞는 에러 코드 매핑
    error_code_map = {
        400: "E400",
        401: "E401",
        403: "E403",
        404: "E404",
        500: "E500",
    }

    error_code = error_code_map.get(exc.status_code, f"E{exc.status_code}")

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": error_code,
                "message": exc.detail
            }
        }
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

