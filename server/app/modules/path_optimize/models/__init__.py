"""
Path Optimize 모듈의 모든 모델 (Pydantic API + SQLAlchemy DB)

구조:
- api_models.py: Pydantic 데이터 모델 (API 요청/응답용)
- db_models.py: SQLAlchemy ORM 모델 (데이터베이스용)

모든 모델은 이 패키지(__init__.py)에서 export되므로,
다음과 같이 import할 수 있습니다:

  # Pydantic 모델 (API)
  from app.modules.path_optimize.models import UserState, CommuteSettings, ...

  # SQLAlchemy 모델 (DB)
  from app.modules.path_optimize.models import CommuteSettingsDB, ...
"""

# Pydantic API 모델
from .api_models import (
    SystemMode,
    TransportType,
    AlertType,
    RetreatChoice,
    UserState,
    Location,
    RecommendedTransport,
    CommuteSettings,
    BriefingResponse,
    BriefingResponseWrapper,
    ErrorResponse,
    ErrorResponseWrapper,
    GPSData,
    UserContextData,
    ContextAwarenessResult,
    ScreenSwitchResponse,
)

# SQLAlchemy DB 모델
from .db_models import (
    CommuteSettingsDB,
    OptimizationHistoryDB,
    AverageDurationDB,
    TransportType as DBTransportType,
    SystemMode as DBSystemMode,
)

__all__ = [
    # Pydantic 모델
    "SystemMode",
    "TransportType",
    "AlertType",
    "RetreatChoice",
    "UserState",
    "Location",
    "RecommendedTransport",
    "CommuteSettings",
    "BriefingResponse",
    "BriefingResponseWrapper",
    "ErrorResponse",
    "ErrorResponseWrapper",
    "GPSData",
    "UserContextData",
    "ContextAwarenessResult",
    "ScreenSwitchResponse",
    # SQLAlchemy 모델
    "CommuteSettingsDB",
    "OptimizationHistoryDB",
    "AverageDurationDB",
    "DBTransportType",
    "DBSystemMode",
]
