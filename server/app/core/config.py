"""
환경 설정 및 구성
NHN Cloud 키 등 환경변수를 관리합니다.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import ConfigDict, Field
from typing import Optional


class Settings(BaseSettings):
    """애플리케이션 설정"""

    # 애플리케이션 기본 설정
    APP_NAME: str = "데일리모션 API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # 데이터베이스 설정
    DATABASE_URL: Optional[str] = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_NAME: str = "dailymotion"

    # NHN Cloud 설정
    NHN_CLOUD_ACCESS_KEY: Optional[str] = None
    NHN_CLOUD_SECRET_KEY: Optional[str] = None
    NHN_CLOUD_REGION: Optional[str] = None

    # 인증 설정
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS 설정
    CORS_ORIGINS: list[str] = ["*"]

    # ODSAY API 설정
    ODSAY_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="allow"  # .env에서 정의된 모든 환경변수 허용
    )


# 전역 설정 인스턴스
settings = Settings()

