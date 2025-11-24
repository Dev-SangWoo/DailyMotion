"""
Health 관련 API 라우터

OpenAPI 스펙의 /health 엔드포인트와 일치하는 v1 헬스 체크를 제공합니다.
"""
from datetime import datetime

from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["Health"])
async def api_v1_health():
    """
    v1 헬스 체크 엔드포인트

    스펙 정의:
    {
      "status": "ok",
      "timestamp": "ISO 8601"
    }
    """
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
    }

