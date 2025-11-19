"""
AverageDurationDB Importer from CSV

용도:
  - `build_seoul_subway_timetable.py` 가 생성한
    `data/average_duration_stats.csv` 파일을 읽어서
    AverageDurationDB 테이블에 upsert 합니다.

철학:
  - CSV에는 이미 "평균 소요시간(초)"가 들어 있으므로,
    이를 그대로 AverageDurationDB.avg_duration_seconds 로 저장하면
    Logic 3.1 DelayDetector가 바로
    "평균 vs 실시간 ETA" 비교를 수행할 수 있습니다.

사용 예:
  cd server
  python import_average_duration_from_csv.py          # 기본 경로 사용
  python import_average_duration_from_csv.py ../data/average_duration_stats.csv
"""

from __future__ import annotations

import csv
import logging
from pathlib import Path
from typing import Optional

from app.db.database import init_db, get_session_local
from app.db.models.path_optimize import AverageDurationDB


logger = logging.getLogger("import_average_duration_from_csv")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


def upsert_row(
    session,
    segment_id: str,
    departure_hour: int,
    day_of_week: int,
    avg_duration_seconds: int,
    sample_count: int,
    transport_type: str,
    transport_name: Optional[str],
    start_station_name: Optional[str],
    end_station_name: Optional[str],
    is_reliable: int,
) -> None:
    """
    AverageDurationDB에 한 줄 upsert
    (segment_id + departure_hour + day_of_week 기준)
    """
    row = (
        session.query(AverageDurationDB)
        .filter(
            AverageDurationDB.segment_id == segment_id,
            AverageDurationDB.departure_hour == departure_hour,
            AverageDurationDB.day_of_week == day_of_week,
        )
        .first()
    )

    if row:
        logger.info(
            f"🔄 갱신: segment_id={segment_id}, hour={departure_hour}, dow={day_of_week}, "
            f"avg={avg_duration_seconds}s, samples={sample_count}"
        )
        row.avg_duration_seconds = avg_duration_seconds
        row.sample_count = sample_count
        row.transport_type = transport_type
        row.transport_name = transport_name
        row.start_station_name = start_station_name
        row.end_station_name = end_station_name
        row.is_reliable = is_reliable
    else:
        logger.info(
            f"➕ 삽입: segment_id={segment_id}, hour={departure_hour}, dow={day_of_week}, "
            f"avg={avg_duration_seconds}s, samples={sample_count}"
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
            is_reliable=is_reliable,
        )
        session.add(row)


def import_csv(csv_path: Path) -> None:
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    logger.info(f"📥 AverageDuration CSV import 시작: {csv_path}")

    init_db()
    SessionLocal = get_session_local()
    db = SessionLocal()

    try:
        with csv_path.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        if not rows:
            logger.warning("⚠️ CSV에 데이터가 없습니다.")
            return

        for r in rows:
            try:
                segment_id = r["segment_id"]
                transport_type = r.get("transport_type", "SUBWAY") or "SUBWAY"
                transport_name = r.get("transport_name") or None
                start_station_name = r.get("start_station_name") or None
                end_station_name = r.get("end_station_name") or None
                departure_hour = int(r["departure_hour"])
                day_of_week = int(r["day_of_week"])
                avg_duration_seconds = int(r["avg_duration_seconds"])
                sample_count = int(r.get("sample_count") or 0)
                is_reliable = int(r.get("is_reliable") or (1 if sample_count >= 100 else 0))

                upsert_row(
                    db,
                    segment_id=segment_id,
                    departure_hour=departure_hour,
                    day_of_week=day_of_week,
                    avg_duration_seconds=avg_duration_seconds,
                    sample_count=sample_count,
                    transport_type=transport_type,
                    transport_name=transport_name,
                    start_station_name=start_station_name,
                    end_station_name=end_station_name,
                    is_reliable=is_reliable,
                )
            except Exception as e:
                logger.warning(f"⚠️ 행 처리 중 오류 (segment_id={r.get('segment_id')}): {str(e)}")

        db.commit()
        logger.info(f"✅ AverageDurationDB import 완료 (rows={len(rows)})")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ AverageDurationDB import 실패: {str(e)}")
        raise
    finally:
        db.close()


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="average_duration_stats.csv → AverageDurationDB import/upsert 스크립트"
    )
    parser.add_argument(
        "csv_path",
        nargs="?",
        default=str(Path(__file__).parent.parent / "data" / "average_duration_stats.csv"),
        help="AverageDuration CSV 경로 (기본: ../data/average_duration_stats.csv)",
    )

    args = parser.parse_args()
    import_csv(Path(args.csv_path))


if __name__ == "__main__":
    main()

