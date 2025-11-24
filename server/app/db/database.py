"""
데이터베이스 세션 관리
PostgreSQL/PostGIS 연결 및 세션을 관리합니다.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 데이터베이스 URL 구성
if settings.DATABASE_URL:
    DATABASE_URL = settings.DATABASE_URL
else:
    # psycopg 사용 (psycopg[binary])
    DATABASE_URL = (
        f"postgresql+psycopg://{settings.DB_USER}:{settings.DB_PASSWORD}"
        f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    )

# SQLAlchemy 엔진 생성 (Lazy initialization)
_engine = None
_SessionLocal = None

def get_engine():
    """데이터베이스 엔진 (lazy initialization)"""
    global _engine
    if _engine is None:
        _engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,  # 연결 유효성 검사
            echo=settings.DEBUG,  # 디버그 모드에서 SQL 쿼리 로깅
        )
    return _engine

def get_session_local():
    """세션 팩토리 (lazy initialization)"""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _SessionLocal

# 기존 코드와의 호환성을 위해 engine과 SessionLocal 제공
@property
def engine():
    return get_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False)

def init_db():
    """데이터베이스 초기화 (애플리케이션 시작 시 호출)"""
    SessionLocal.configure(bind=get_engine())

# Base 클래스 (모든 모델이 상속받을 클래스)
Base = declarative_base()


def get_db():
    """
    데이터베이스 세션 의존성
    FastAPI의 Depends에서 사용합니다.
    """
    engine = get_engine()
    SessionLocal_instance = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal_instance()
    try:
        yield db
    finally:
        db.close()

