import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.config import settings
from app.services.hazard_api import initialize_hazard_client, close_hazard_client

# 로깅 설정
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


# 라이프사이클 이벤트
@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 시작 및 종료 이벤트"""
    # 시작 이벤트
    logger.info("Starting DailyMotion API...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug: {settings.DEBUG}")

    # 행안부 API 초기화
    try:
        await initialize_hazard_client(
            api_key=settings.HAZARD_API_KEY,
            api_url=settings.HAZARD_API_URL
        )
        logger.info("Hazard API client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Hazard API client: {e}")

    yield

    # 종료 이벤트
    logger.info("Shutting down DailyMotion API...")
    try:
        await close_hazard_client()
        logger.info("Hazard API client closed")
    except Exception as e:
        logger.error(f"Failed to close Hazard API client: {e}")


# FastAPI 앱 생성
app = FastAPI(
    title="DailyMotion API",
    description="AI-powered commute optimization system",
    version="0.1.0",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 헬스 체크 엔드포인트
@app.get("/health")
async def health_check():
    """기본 헬스 체크"""
    return {
        "status": "OK",
        "environment": settings.ENVIRONMENT,
        "timestamp": __import__("datetime").datetime.utcnow().isoformat()
    }


@app.get("/health/detailed")
async def detailed_health_check():
    """상세 헬스 체크"""
    return {
        "status": "OK",
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "log_level": settings.LOG_LEVEL,
        "services": {
            "hazard_api": "initialized"
        },
        "timestamp": __import__("datetime").datetime.utcnow().isoformat()
    }


# 루트 엔드포인트
@app.get("/")
async def root():
    """API 루트"""
    return {
        "message": "Welcome to DailyMotion API",
        "version": "0.1.0",
        "docs": "/docs"
    }


# 재난 알림 엔드포인트
@app.get("/api/v1/hazards/alerts/{region}")
async def get_region_hazards(region: str):
    """
    특정 지역의 재난 알림 조회

    Args:
        region: 지역명 (예: 서울, 부산, 대구 등)

    Returns:
        재난 알림 목록
    """
    from app.services.hazard_api import get_hazard_client

    try:
        client = get_hazard_client(settings.HAZARD_API_KEY, settings.HAZARD_API_URL)
        alerts = await client.get_disaster_alerts(region)
        return {
            "region": region,
            "count": len(alerts),
            "alerts": alerts
        }
    except Exception as e:
        logger.error(f"Error fetching hazards for {region}: {e}")
        return {
            "region": region,
            "count": 0,
            "alerts": [],
            "error": str(e)
        }


@app.get("/api/v1/hazards/alerts/{region}/{alert_type}")
async def get_region_hazards_by_type(region: str, alert_type: str):
    """
    특정 지역의 특정 유형 재난 알림 조회

    Args:
        region: 지역명
        alert_type: 재난 유형 (지진, 태풍, 폭우 등)

    Returns:
        필터링된 재난 알림 목록
    """
    from app.services.hazard_api import get_hazard_client

    try:
        client = get_hazard_client(settings.HAZARD_API_KEY, settings.HAZARD_API_URL)
        alerts = await client.get_alert_by_region_and_type(region, alert_type)
        return {
            "region": region,
            "alert_type": alert_type,
            "count": len(alerts),
            "alerts": alerts
        }
    except Exception as e:
        logger.error(f"Error fetching {alert_type} hazards for {region}: {e}")
        return {
            "region": region,
            "alert_type": alert_type,
            "count": 0,
            "alerts": [],
            "error": str(e)
        }


if __name__ == "__main__":
    # 로컬에서 직접 실행할 때를 위한 코드 (서버에서는 uvicorn 명령어로 실행하는 것이 정석)
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
