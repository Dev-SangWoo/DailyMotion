"""
서울교통공사 열차시간표 CSV → AverageDurationDB 집계 스크립트

목표:
  - `subway_timetable.py` 가 생성한 원시 시간표 CSV
    (예: `data/seoul_subway_timetable_line7_week1.csv`)를 읽어서
    구간별 평균 소요시간(AverageDuration)을 계산하고 AverageDurationDB에 적재한다.

집계 방식 (소요시간 비교 방식을 위한 준비 단계):
  1) 같은 열차(trainNo) + 방향(updown) + 호선(lineNumber) + weekTag 단위로 묶는다.
  2) stationCode 오름차순으로 정렬한다.
  3) 인접 역 쌍(A역 → B역)에 대해:
       start_time = A.departTime (없으면 arriveTime)
       end_time   = B.arriveTime (없으면 departTime)
       segment_duration_seconds = end_time - start_time
     를 계산한다.
  4) segment_id 규칙:
       subway_{lineNumNoHo}_{fromStationName}-{toStationName}
       예: "subway_7_남구로-온수", "subway_2_강남-역삼"
  5) departure_hour = start_time.hour
     day_of_week    = weekTag 매핑 (1=평일→0(월), 2=토요일→5, 3=휴일/일요일→6)
  6) (segment_id, hour, day_of_week) 단위로 평균과 샘플 개수 집계 후
     AverageDurationDB에 upsert 한다.

⚠️ 주의:
  - 이 스크립트는 "평균 소요시간 테이블(AverageDurationDB)을 채우는 ETL" 역할만 한다.
  - Logic 3.1 DelayDetector는 기존대로 avg_duration_seconds vs 실시간 ETA를 비교한다.

사용 예:
  cd server
  # 7호선, 평일(weekTag=1) 시간표 CSV 기반 AverageDurationDB 집계
  python build_average_duration_from_timetable.py 7 1
"""

from __future__ import annotations

import csv
import logging
from dataclasses import dataclass
from datetime import time
from pathlib import Path
from typing import Dict, List, Tuple, Optional

from app.db.database import get_session_local, init_db
from app.db.models.path_optimize import AverageDurationDB


logger = logging.getLogger("build_average_duration_from_timetable")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"


@dataclass
class TimetableRow:
    day_type: str
    week_tag: str
    line_number: str
    station_code: str
    station_name: str
    updown: str
    train_no: str
    arrive_time: str
    depart_time: str
    origin_station: str
    dest_station: str


def parse_time_str(t: str) -> Optional[time]:
    """
    "HH:MM" 또는 "HH:MM:SS" 또는 "HHMM", "HHMMSS" 형태의 문자열을 time 객체로 파싱.
    실패 시 None 반환.
    """
    t = (t or "").strip()
    if not t:
        return None

    try:
        # "HH:MM" or "HH:MM:SS"
        if ":" in t:
            parts = t.split(":")
            if len(parts) == 2:
                h, m = int(parts[0]), int(parts[1])
                return time(hour=h, minute=m)
            if len(parts) == 3:
                h, m, s = int(parts[0]), int(parts[1]), int(parts[2])
                return time(hour=h, minute=m, second=s)
        else:
            # "HHMM" or "HHMMSS"
            if len(t) == 4 and t.isdigit():
                h = int(t[:2])
                m = int(t[2:])
                return time(hour=h, minute=m)
            if len(t) == 6 and t.isdigit():
                h = int(t[:2])
                m = int(t[2:4])
                s = int(t[4:])
                return time(hour=h, minute=m, second=s)
    except ValueError:
        return None

    return None


def time_to_seconds(t: time) -> int:
    return t.hour * 3600 + t.minute * 60 + t.second


def week_tag_to_day_of_week(week_tag: str) -> int:
    """
    weekTag를 AverageDurationDB.day_of_week로 매핑.

    현재 간단한 규칙:
      1 (평일)  → 0 (월요일 대표)
      2 (토요일) → 5
      3 (휴일/일요일) → 6
    """
    if week_tag == "1":
        return 0
    if week_tag == "2":
        return 5
    if week_tag == "3":
        return 6
    # 알 수 없는 값은 월요일로 기본 처리
    return 0


def load_timetable_csv(line: str, week_tag: str) -> List[TimetableRow]:
    """
    시간표 CSV를 TimetableRow 리스트로 로드.
    """
    path = DATA_DIR / f"seoul_subway_timetable_line{line}_week{week_tag}.csv"
    if not path.exists():
        raise FileNotFoundError(f"Timetable CSV not found: {path}")

    rows: List[TimetableRow] = []
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(
                TimetableRow(
                    day_type=r.get("dayType", "").strip(),
                    week_tag=r.get("weekTag", "").strip(),
                    line_number=r.get("lineNumber", "").strip(),
                    station_code=r.get("stationCode", "").strip(),
                    station_name=r.get("stationName", "").strip(),
                    updown=r.get("updown", "").strip(),
                    train_no=r.get("trainNo", "").strip(),
                    arrive_time=r.get("arriveTime", "").strip(),
                    depart_time=r.get("departTime", "").strip(),
                    origin_station=r.get("originStation", "").strip(),
                    dest_station=r.get("destStation", "").strip(),
                )
            )

    logger.info(f"✅ 시간표 CSV 로드 완료: {path} (rows={len(rows)})")
    return rows


def build_segment_aggregates(
    rows: List[TimetableRow],
) -> Dict[Tuple[str, int, int], Dict[str, any]]:
    """
    TimetableRow 리스트를 구간별 평균 소요시간 집계 데이터로 변환.

    Returns:
        key: (segment_id, departure_hour, day_of_week)
        value: {
            "total_duration": int,
            "count": int,
            "transport_type": "SUBWAY",
            "transport_name": str,
            "start_station_name": str,
            "end_station_name": str,
        }
    """
    # trainNo + updown + weekTag + lineNumber 기준으로 그룹핑
    grouped: Dict[Tuple[str, str, str, str], List[TimetableRow]] = {}
    for r in rows:
        if not r.train_no:
            continue
        key = (r.train_no, r.updown, r.week_tag, r.line_number)
        grouped.setdefault(key, []).append(r)

    aggregates: Dict[Tuple[str, int, int], Dict[str, any]] = {}

    for (train_no, updown, week_tag, line_number), group_rows in grouped.items():
        # stationCode 기준 정렬 (숫자형으로 해석 가능할 때만)
        try:
            sorted_rows = sorted(group_rows, key=lambda x: int(x.station_code))
        except ValueError:
            sorted_rows = group_rows

        for i in range(len(sorted_rows) - 1):
            a = sorted_rows[i]
            b = sorted_rows[i + 1]

            # 시작/도착 시간 파싱
            start_t = parse_time_str(a.depart_time) or parse_time_str(a.arrive_time)
            end_t = parse_time_str(b.arrive_time) or parse_time_str(b.depart_time)
            if not start_t or not end_t:
                continue

            start_sec = time_to_seconds(start_t)
            end_sec = time_to_seconds(end_t)
            duration = end_sec - start_sec

            # 음수이거나 0, 혹은 비정상적으로 긴 값은 스킵 (예: 3시간 이상)
            if duration <= 0 or duration > 3 * 3600:
                continue

            # segment_id 규칙: subway_{lineNumNoHo}_{from}-{to}
            line_num_short = line_number.replace("호선", "").strip() or "X"
            from_station = a.station_name
            to_station = b.station_name
            segment_id = f"subway_{line_num_short}_{from_station}-{to_station}"

            departure_hour = start_t.hour
            day_of_week = week_tag_to_day_of_week(week_tag)

            key = (segment_id, departure_hour, day_of_week)
            agg = aggregates.setdefault(
                key,
                {
                    "total_duration": 0,
                    "count": 0,
                    "transport_type": "SUBWAY",
                    "transport_name": line_number or f"{line_num_short}호선",
                    "start_station_name": from_station,
                    "end_station_name": to_station,
                },
            )

            agg["total_duration"] += duration
            agg["count"] += 1
            # 마지막 값으로 station_name / line_number를 업데이트 (큰 영향 없음)
            agg["transport_name"] = line_number or agg["transport_name"]
            agg["start_station_name"] = from_station
            agg["end_station_name"] = to_station

    logger.info(f"📊 구간별 집계 완료: {len(aggregates)}개 (segment_id, hour, dow) 키")
    return aggregates


def upsert_aggregates_to_db(
    aggregates: Dict[Tuple[str, int, int], Dict[str, any]],
) -> None:
    """
    집계된 구간 평균 소요시간을 AverageDurationDB에 upsert.
    """
    if not aggregates:
        logger.warning("⚠️ AverageDurationDB에 반영할 집계 데이터가 없습니다.")
        return

    init_db()
    SessionLocal = get_session_local()
    db = SessionLocal()

    try:
        for (segment_id, departure_hour, day_of_week), info in aggregates.items():
            total = info["total_duration"]
            count = info["count"]
            avg_seconds = int(total / count) if count > 0 else 0
            sample_count = count

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
                    f"🔄 AverageDuration 갱신: segment_id={segment_id}, "
                    f"hour={departure_hour}, dow={day_of_week}, avg={avg_seconds}s, samples={sample_count}"
                )
                row.avg_duration_seconds = avg_seconds
                row.sample_count = sample_count
                row.transport_type = info["transport_type"]
                row.transport_name = info["transport_name"]
                row.start_station_name = info["start_station_name"]
                row.end_station_name = info["end_station_name"]
                row.is_reliable = 1 if sample_count >= 100 else 0
            else:
                logger.info(
                    f"➕ AverageDuration 삽입: segment_id={segment_id}, "
                    f"hour={departure_hour}, dow={day_of_week}, avg={avg_seconds}s, samples={sample_count}"
                )
                row = AverageDurationDB(
                    segment_id=segment_id,
                    departure_hour=departure_hour,
                    day_of_week=day_of_week,
                    avg_duration_seconds=avg_seconds,
                    sample_count=sample_count,
                    transport_type=info["transport_type"],
                    transport_name=info["transport_name"],
                    start_station_name=info["start_station_name"],
                    end_station_name=info["end_station_name"],
                    is_reliable=1 if sample_count >= 100 else 0,
                )
                db.add(row)

        db.commit()
        logger.info("✅ AverageDurationDB 집계 반영 완료")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ AverageDurationDB 집계 반영 실패: {str(e)}")
        raise
    finally:
        db.close()


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="서울교통공사 열차시간표 CSV → AverageDurationDB 집계 스크립트"
    )
    parser.add_argument(
        "line",
        type=str,
        help="지하철 호선 번호 (예: 1, 2, 7)",
    )
    parser.add_argument(
        "week_tag",
        type=str,
        choices=["1", "2", "3"],
        help="요일 구분 (1=평일, 2=토요일, 3=휴일/일요일)",
    )

    args = parser.parse_args()

    rows = load_timetable_csv(line=args.line, week_tag=args.week_tag)
    if not rows:
        logger.warning("⚠️ 시간표 CSV에 데이터가 없습니다. 집계를 건너뜁니다.")
        return

    aggregates = build_segment_aggregates(rows)
    upsert_aggregates_to_db(aggregates)


if __name__ == "__main__":
    main()

