"""
데일리모션 FastAPI 메인 애플리케이션
모듈형 모놀리식 아키텍처를 따릅니다.
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.logging_config import setup_logging, get_logger
from app.api.v1 import api_router
from dotenv import load_dotenv
import os
import time
from datetime import datetime

# .env 파일 로드
load_dotenv()

# 로깅 설정 초기화
setup_logging(
    log_level=os.getenv("LOG_LEVEL", "INFO"),
    log_format=os.getenv("LOG_FORMAT", "text")
)
logger = get_logger(__name__)

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
# Request Logging Middleware
# =====================================================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """모든 HTTP 요청을 로깅합니다"""
    start_time = time.time()

    # 요청 로깅
    logger.info(f"→ {request.method} {request.url.path}")

    # 요청 처리
    response = await call_next(request)

    # 응답 시간 계산
    process_time = time.time() - start_time

    # 응답 로깅
    logger.info(
        f"← {request.method} {request.url.path} "
        f"status={response.status_code} "
        f"time={process_time:.3f}s"
    )

    # 응답 헤더에 처리 시간 추가
    response.headers["X-Process-Time"] = str(process_time)

    return response

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
    """
    Liveness Probe - 서버 기본 동작 확인
    Kubernetes liveness probe에서 사용
    """
    return {
        "status": "healthy",
        "message": "서버가 정상 작동 중입니다.",
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/ready")
async def readiness_check():
    """
    Readiness Probe - 서버가 요청을 받을 준비가 되었는지 확인
    Kubernetes readiness probe에서 사용

    체크 항목:
    - 데이터베이스 연결
    - 필수 환경변수
    - 외부 API 의존성
    """
    checks = {
        "database": "ok",  # TODO: 실제 DB 연결 확인
        "environment": "ok",
        "dependencies": "ok"
    }

    # 환경변수 체크
    if not settings.ODSAY_API_KEY:
        checks["environment"] = "warning: ODSAY_API_KEY not set"

    # 전체 상태 판정
    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ok else "not_ready",
            "checks": checks,
            "version": settings.APP_VERSION,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.get("/metrics")
async def metrics():
    """
    메트릭 엔드포인트 (Prometheus 형식)
    모니터링 시스템에서 수집
    """
    # TODO: 실제 메트릭 수집 (prometheus_client 사용)
    return {
        "status": "ok",
        "message": "Metrics endpoint (Prometheus integration pending)",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "데일리모션 API에 오신 것을 환영합니다.",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }

