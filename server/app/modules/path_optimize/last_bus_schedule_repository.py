from datetime import datetime, timedelta
from typing import Optional

import logging
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import get_session_local
from app.modules.path_optimize.models import LastBusScheduleDB

logger = logging.getLogger(__name__)


def _get_db_session():
    try:
        SessionLocal = get_session_local()
        return SessionLocal()
    except Exception as e:
        logger.warning(f"⚠️ LastBusScheduleDB 세션 초기화 실패: {str(e)}")
        return None


def get_minutes_until_last_bus(
    route_choice: str,
    current_time: datetime,
    current_day_of_week: Optional[int] = None,
) -> Optional[int]:
    """
    주어진 경로 선택(A/B/C)과 현재 시간 기준으로 막차까지 남은 시간을 분 단위로 반환합니다.

    DB에 해당 경로의 막차 정보가 없거나, DB 연결에 실패하면 None을 반환합니다.
    """
    db = _get_db_session()
    if db is None:
        return None

    try:
        query = db.query(LastBusScheduleDB).filter(
            LastBusScheduleDB.route_choice == route_choice
        )

        # 요일별로 구분된 데이터가 있으면 우선 사용
        if current_day_of_week is not None:
            row = (
                query.filter(LastBusScheduleDB.day_of_week == current_day_of_week)
                .order_by(LastBusScheduleDB.last_bus_time.desc())
                .first()
            )
            if row is None:
                # 요일 구분 없는 공통 레코드 우선 찾기
                row = (
                    query.filter(LastBusScheduleDB.day_of_week.is_(None))
                    .order_by(LastBusScheduleDB.last_bus_time.desc())
                    .first()
                )
        else:
            row = (
                query.order_by(LastBusScheduleDB.last_bus_time.desc())
                .first()
            )

        if row is None:
            return None

        # 오늘 날짜 기준으로 막차 시각 생성
        last_bus_dt = current_time.replace(
            hour=row.last_bus_time.hour,
            minute=row.last_bus_time.minute,
            second=row.last_bus_time.second,
            microsecond=0,
        )

        # 이미 막차 시간이 지난 경우에는 음수일 수 있으므로, 0 미만이면 0으로 고정
        diff = last_bus_dt - current_time
        minutes = int(diff.total_seconds() // 60)
        if minutes < 0:
            minutes = 0

        logger.info(
            f"✅ LastBusSchedule 조회: route_choice={route_choice}, "
            f"last_bus_time={row.last_bus_time}, minutes_until={minutes}"
        )
        return minutes

    except SQLAlchemyError as e:
        logger.warning(f"⚠️ LastBusSchedule 조회 실패: {str(e)}")
        return None
    finally:
        db.close()

