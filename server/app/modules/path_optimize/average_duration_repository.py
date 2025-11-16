from typing import Dict, Any, List, Optional

import logging
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import get_session_local
from app.modules.path_optimize.models import AverageDurationDB

logger = logging.getLogger(__name__)


def _get_db_session():
    try:
        SessionLocal = get_session_local()
        return SessionLocal()
    except Exception as e:
        logger.warning(f"⚠️ AverageDurationDB 세션 초기화 실패: {str(e)}")
        return None


def get_average_duration_map_for_segments(
    segments: List[Dict[str, Any]],
    current_hour: int,
    current_day_of_week: int,
) -> Dict[str, Dict[str, Any]]:
    """
    구간 목록과 현재 시각을 기반으로 AverageDurationDB에서 통계 데이터를 조회합니다.

    Returns:
        segment_id -> {
            "avg_duration_seconds": int,
            "sample_count": int,
            "transport_type": str,
            "transport_name": str | None,
            "data_quality": str | None
        }
    """
    db = _get_db_session()
    if db is None:
        return {}

    segment_ids = [s.get("segment_id") for s in segments if s.get("segment_id")]
    if not segment_ids:
        return {}

    result: Dict[str, Dict[str, Any]] = {}

    try:
        rows = (
            db.query(AverageDurationDB)
            .filter(
                AverageDurationDB.segment_id.in_(segment_ids),
                AverageDurationDB.departure_hour == current_hour,
                AverageDurationDB.day_of_week == current_day_of_week,
            )
            .all()
        )

        for row in rows:
            result[row.segment_id] = {
                "avg_duration_seconds": row.avg_duration_seconds,
                "sample_count": row.sample_count,
                "transport_type": row.transport_type,
                "transport_name": row.transport_name,
                "data_quality": None,
            }

        if rows:
            logger.info(
                f"✅ AverageDurationDB 통계 조회: {len(rows)}개 구간 "
                f"(hour={current_hour}, dow={current_day_of_week})"
            )

    except SQLAlchemyError as e:
        logger.warning(f"⚠️ AverageDurationDB 조회 실패: {str(e)}")
        return {}
    finally:
        db.close()

    return result

