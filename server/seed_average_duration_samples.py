"""
AverageDurationDB 샘플 데이터 주입 스크립트

용도:
  - Logic 3.1 (지연 감지) E2E 테스트를 위해,
    실제 DB의 average_duration 테이블에 최소 한두 개 구간의
    "평균 소요시간" 샘플 데이터를 수동으로 넣어준다.

주의:
  - 이 스크립트는 **개발/로컬 환경 전용**으로 사용하는 것을 권장한다.
  - 운영/스테이징에서는 별도의 ETL/집계 파이프라인으로 AverageDurationDB를 채워야 한다.

사용 예:
  cd server
  # 기본 샘플(지하철 7호선 남구로→온수) 주입
  python seed_average_duration_samples.py

  # 또는 특정 segment_id / 평균 소요시간을 직접 지정
  python seed_average_duration_samples.py --segment-id subway_7_남구로-온수 --avg-seconds 120 --hour 8 --dow 2
"""

from __future__ import annotations

import argparse
import logging
from typing import Optional

from app.db.database import get_session_local, init_db
from app.db.models.path_optimize import AverageDurationDB


logger = logging.getLogger("seed_average_duration_samples")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


def upsert_average_duration(
    segment_id: str,
    departure_hour: int,
    day_of_week: int,
    avg_duration_seconds: int,
    transport_type: str,
    transport_name: Optional[str] = None,
    start_station_name: Optional[str] = None,
    end_station_name: Optional[str] = None,
    sample_count: int = 200,
) -> None:
    """
    AverageDurationDB에 샘플 데이터를 upsert (존재하면 업데이트, 없으면 삽입)
    """
    init_db()
    SessionLocal = get_session_local()
    db = SessionLocal()

    try:
        row = (
            db.query(AverageDurationDB)
            .filter(
                AverageDurationDB.segment_id == segment_id,
                AverageDurationDB.departure_hour == departure_hour,
                AverageDurationDB.day_of_week == day_of_week,
            )
            .first()
        )

        if row:
            logger.info(
                f"🔄 기존 AverageDuration 갱신: segment_id={segment_id}, "
                f"hour={departure_hour}, dow={day_of_week}"
            )
            row.avg_duration_seconds = avg_duration_seconds
            row.sample_count = sample_count
            row.transport_type = transport_type
            row.transport_name = transport_name
            row.start_station_name = start_station_name
            row.end_station_name = end_station_name
            row.is_reliable = 1 if sample_count >= 100 else 0
        else:
            logger.info(
                f"➕ 새 AverageDuration 삽입: segment_id={segment_id}, "
                f"hour={departure_hour}, dow={day_of_week}"
            )
            row = AverageDurationDB(
                segment_id=segment_id,
                departure_hour=departure_hour,
                day_of_week=day_of_week,
                avg_duration_seconds=avg_duration_seconds,
                sample_count=sample_count,
                transport_type=transport_type,
                transport_name=transport_name,
                start_station_name=start_station_name,
                end_station_name=end_station_name,
                is_reliable=1 if sample_count >= 100 else 0,
            )
            db.add(row)

        db.commit()
        logger.info(
            f"✅ AverageDuration 반영 완료: segment_id={segment_id}, "
            f"avg={avg_duration_seconds}s, samples={sample_count}"
        )

    except Exception as e:
        db.rollback()
        logger.error(f"❌ AverageDuration 샘플 주입 실패: {str(e)}")
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="AverageDurationDB 샘플 데이터 수동 주입 스크립트"
    )
    parser.add_argument(
        "--segment-id",
        type=str,
        default="subway_7_남구로-온수",
        help="샘플을 주입할 segment_id (기본: subway_7_남구로-온수)",
    )
    parser.add_argument(
        "--avg-seconds",
        type=int,
        default=120,
        help="평균 소요시간(초) (기본: 120초 = 2분)",
    )
    parser.add_argument(
        "--hour",
        type=int,
        default=8,
        help="departure_hour (0~23, 기본: 8)",
    )
    parser.add_argument(
        "--dow",
        type=int,
        default=2,
        help="day_of_week (0=월요일, 6=일요일 / 기본: 2=수요일)",
    )

    args = parser.parse_args()

    # 오늘 C-2.2 테스트용 기본값: 7호선 남구로 → 온수
    if args.segment_id == "subway_7_남구로-온수":
        transport_type = "SUBWAY"
        transport_name = "7호선"
        start_station_name = "남구로"
        end_station_name = "온수"
    else:
        transport_type = "SUBWAY"
        transport_name = None
        start_station_name = None
        end_station_name = None

    upsert_average_duration(
        segment_id=args.segment_id,
        departure_hour=args.hour,
        day_of_week=args.dow,
        avg_duration_seconds=args.avg_seconds,
        transport_type=transport_type,
        transport_name=transport_name,
        start_station_name=start_station_name,
        end_station_name=end_station_name,
        sample_count=200,
    )


if __name__ == "__main__":
    main()

