import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/dailymotion"

    # APIs
    HAZARD_API_KEY: str = ""
    HAZARD_API_URL: str = "https://api.example.com"

    # Server
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        case_sensitive = True


# Load settings from environment
settings = Settings()
