from datetime import datetime
from typing import Optional, Dict, Any

import logging
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import get_session_local
from app.modules.path_optimize.models import OptimizationHistoryDB, SystemMode

logger = logging.getLogger(__name__)


def _get_db_session():
    try:
        SessionLocal = get_session_local()
        return SessionLocal()
    except Exception as e:
        logger.warning(f"⚠️ OptimizationHistoryDB 세션 초기화 실패: {str(e)}")
        return None


def log_optimization_history(
    user_id: str,
    mode: SystemMode,
    suggested_route: Dict[str, Any],
    selected_route: Optional[Dict[str, Any]] = None,
    actual_arrival_time: Optional[datetime] = None,
    delay_occurred: int = 0,
    feedback: Optional[str] = None,
) -> None:
    """
    경로 최적화/알림 이력을 optimization_history 테이블에 기록합니다.

    DB 연결 실패나 에러가 발생하더라도 애플리케이션 플로우에는 영향을 주지 않습니다.
    """
    db = _get_db_session()
    if db is None:
        return

    try:
        history = OptimizationHistoryDB(
            user_id=user_id,
            journey_date=datetime.utcnow(),
            mode=mode.value if isinstance(mode, SystemMode) else str(mode),
            suggested_route=suggested_route,
            selected_route=selected_route,
            actual_arrival_time=actual_arrival_time,
            delay_occurred=delay_occurred,
            feedback=feedback,
        )

        db.add(history)
        db.commit()
        logger.info(
            f"✅ OptimizationHistory 저장: user={user_id}, mode={history.mode}"
        )
    except SQLAlchemyError as e:
        db.rollback()
        logger.warning(f"⚠️ OptimizationHistory 저장 실패 (무시): {str(e)}")
    finally:
        db.close()

