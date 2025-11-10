# ============================================================================
# DailyMotion Backend API - Production Dockerfile
# Purpose: FastAPI 애플리케이션 컨테이너화
# ============================================================================

FROM python:3.13-slim

# 메타데이터
LABEL maintainer="DailyMotion Team"
LABEL version="0.1.0"
LABEL description="DailyMotion - AI-powered commute optimization backend"

# 환경 변수 설정
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    ENVIRONMENT=production

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements-backend.txt requirements-ml.txt ./
RUN pip install --no-cache-dir -r requirements-backend.txt

# 애플리케이션 코드 복사
COPY . .

# 비루트 사용자 생성 (보안)
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# 사용자 전환
USER appuser

# 헬스 체크 설정
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 포트 노출
EXPOSE 8000

# 애플리케이션 실행
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
