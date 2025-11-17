from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import csv
import json
import logging

logger = logging.getLogger(__name__)


@dataclass
class StationMapping:
  """
  ODSAY 역 ID ↔ 서울교통공사 역 ID 매핑
  """

  odsay_station_id: str
  odsay_subway_code: str
  seoul_station_id: Optional[str]
  seoul_line_num: Optional[str]
  debug_name: Optional[str] = None


@dataclass
class SubwayCongestionResult:
  """
  지하철 혼잡도 조회 결과
  """

  line_name: str
  station_name: str
  station_id: str
  direction: str
  day_type: str
  bucket_label: str
  congestion_value: float
  congestion_level: str

  def to_dict(self) -> Dict[str, Any]:
    return {
      "lineName": self.line_name,
      "stationName": self.station_name,
      "stationId": self.station_id,
      "direction": self.direction,
      "dayType": self.day_type,
      "bucketLabel": self.bucket_label,
      "congestionValue": self.congestion_value,
      "congestionLevel": self.congestion_level,
    }


_congestion_index: Dict[Tuple[str, str, str, str], Dict[str, str]] = {}
_time_columns: List[str] = []
_station_mapping_index: Dict[Tuple[str, str], StationMapping] = {}


def _get_base_dir() -> Path:
  """
  server/app/modules/path_optimize/ 기준으로 data 디렉토리 위치 계산
  """

  return Path(__file__).resolve().parents[3]


def _load_station_mapping() -> None:
  """
  server/data/master_station_map.json 로드
  """

  global _station_mapping_index

  if _station_mapping_index:
    return

  base_dir = _get_base_dir()
  mapping_path = base_dir / "data" / "master_station_map.json"

  try:
    with mapping_path.open("r", encoding="utf-8") as f:
      raw_list = json.load(f)
  except FileNotFoundError:
    logger.warning(f"⚠️ MasterStationMap 파일을 찾을 수 없습니다: {mapping_path}")
    _station_mapping_index = {}
    return
  except json.JSONDecodeError as e:
    logger.warning(f"⚠️ MasterStationMap JSON 파싱 실패: {str(e)}")
    _station_mapping_index = {}
    return

  index: Dict[Tuple[str, str], StationMapping] = {}

  for item in raw_list:
    try:
      odsay_station_id = str(item.get("odsayStationID"))
      odsay_subway_code = str(item.get("odsaySubwayCode"))
      seoul_station_id = item.get("seoulStationID")
      seoul_line_num = item.get("seoulLineNum")
      debug_name = item.get("debugName")

      if not odsay_station_id or not odsay_subway_code:
        continue

      key = (odsay_station_id, odsay_subway_code)
      index[key] = StationMapping(
        odsay_station_id=odsay_station_id,
        odsay_subway_code=odsay_subway_code,
        seoul_station_id=str(seoul_station_id) if seoul_station_id is not None else None,
        seoul_line_num=str(seoul_line_num) if seoul_line_num is not None else None,
        debug_name=debug_name,
      )
    except Exception as e:
      logger.warning(f"⚠️ MasterStationMap 항목 파싱 실패: {str(e)}")

  _station_mapping_index = index

  logger.info(f"✅ MasterStationMap 로드 완료: {len(_station_mapping_index)}개 매핑")


def _load_congestion_data() -> None:
  """
  서울교통공사_지하철혼잡도정보 CSV 로드
  """

  global _congestion_index, _time_columns

  if _congestion_index and _time_columns:
    return

  base_dir = _get_base_dir()
  csv_path = base_dir / "data" / "seoul_subway_congestion.csv"

  try:
    with csv_path.open("r", encoding="utf-8-sig") as f:
      reader = csv.DictReader(f, delimiter="\t")
      fieldnames = reader.fieldnames or []

      # 앞의 5개 메타 컬럼 이후가 시간대 컬럼
      _time_columns = fieldnames[5:]

      index: Dict[Tuple[str, str, str, str], Dict[str, str]] = {}

      for row in reader:
        day_type = row.get("요일구분")
        line_num = row.get("호선")
        station_id = row.get("역번호")
        direction = row.get("상하구분")

        if not (day_type and line_num and station_id and direction):
          continue

        key = (day_type, line_num, station_id, direction)
        index[key] = row
  except FileNotFoundError:
    logger.warning(f"⚠️ 지하철 혼잡도 CSV 파일을 찾을 수 없습니다: {csv_path}")
    _congestion_index = {}
    _time_columns = []
    return
  except Exception as e:
    logger.warning(f"⚠️ 지하철 혼잡도 CSV 로드 실패: {str(e)}")
    _congestion_index = {}
    _time_columns = []
    return

  _congestion_index = index

  logger.info(
    f"✅ 지하철 혼잡도 CSV 로드 완료: "
    f"rows={len(_congestion_index)}, time_columns={len(_time_columns)}"
  )


def _get_day_type(now: datetime) -> str:
  """
  datetime → 요일구분 (평일/토요일/일요일)
  """

  weekday = now.weekday()  # 0=월요일, 6=일요일
  if weekday < 5:
    return "평일"
  if weekday == 5:
    return "토요일"
  return "일요일"


def _get_direction_label(subway_code: int, way_code: int) -> str:
  """
  ODSAY wayCode → 서울교통공사 상하구분 매핑
  - 2호선: 내선/외선
  - 그 외: 상선/하선
  """

  if subway_code == 2:
    return "내선" if way_code == 1 else "외선"

  return "상선" if way_code == 1 else "하선"


def _floor_to_30min_bucket(now: datetime) -> str:
  """
  현재 시각을 30분 단위로 내림(floor)한 버킷 라벨 생성
  예: 07:12 → '7시00분', 07:44 → '7시30분'
  """

  hour = now.hour
  minute = now.minute

  bucket_minute = 0 if minute < 30 else 30
  return f"{hour}시{bucket_minute:02d}분"


def _select_bucket_value(row: Dict[str, str], bucket: str) -> Optional[Tuple[str, float]]:
  """
  주어진 행에서 해당 버킷(또는 직전 버킷)의 혼잡도 값을 선택

  Returns:
      (사용된 버킷 라벨, 혼잡도 값) 또는 None
  """

  if bucket not in _time_columns:
    # 컬럼 자체가 없으면 가장 가까운 이전 컬럼을 찾는다.
    try:
      # 시간 컬럼들은 이미 정렬된 상태이므로, bucket보다 앞선 마지막 컬럼 사용
      candidates = [col for col in _time_columns if col <= bucket]
      if not candidates:
        return None
      bucket = candidates[-1]
    except Exception:
      return None

  # 1차: 해당 버킷
  raw_value = row.get(bucket)
  if raw_value not in (None, "", "0"):
    try:
      return bucket, float(raw_value)
    except ValueError:
      pass

  # 2차: 직전 버킷으로 Fallback
  try:
    idx = _time_columns.index(bucket)
  except ValueError:
    return None

  for i in range(idx - 1, -1, -1):
    candidate_bucket = _time_columns[i]
    raw_value = row.get(candidate_bucket)
    if raw_value not in (None, "", "0"):
      try:
        return candidate_bucket, float(raw_value)
      except ValueError:
        continue

  return None


def _get_congestion_level(value: float) -> str:
  """
  퍼센트 값을 등급(LOW/MEDIUM/HIGH/VERY_HIGH)으로 변환
  """

  if value < 40:
    return "LOW"
  if value < 70:
    return "MEDIUM"
  if value < 90:
    return "HIGH"
  return "VERY_HIGH"


def get_subway_congestion(
  odsay_station_id: int,
  subway_code: int,
  way_code: int,
  now: datetime,
) -> Optional[SubwayCongestionResult]:
  """
  ODSAY 역 ID + 노선코드 + 방향(wayCode)을 기반으로
  서울교통공사 혼잡도 정보를 조회합니다.

  Args:
      odsay_station_id: ODSAY 역 ID (segment.startID / endID)
      subway_code: ODSAY subwayCode (1~8)
      way_code: ODSAY wayCode (1=상행/내선, 2=하행/외선)
      now: 현재 시각

  Returns:
      SubwayCongestionResult 또는 None (정보 없음)
  """

  _load_station_mapping()
  _load_congestion_data()

  if not _station_mapping_index or not _congestion_index or not _time_columns:
    return None

  key = (str(odsay_station_id), str(subway_code))
  mapping = _station_mapping_index.get(key)

  # MasterStationMap에 없거나, 서울 역 ID가 없는 경우 → 혼잡도 정보 없음
  if mapping is None or mapping.seoul_station_id is None or mapping.seoul_line_num is None:
    return None

  day_type = _get_day_type(now)
  direction_label = _get_direction_label(subway_code, way_code)

  row_key = (day_type, mapping.seoul_line_num, mapping.seoul_station_id, direction_label)
  row = _congestion_index.get(row_key)

  if not row:
    return None

  bucket = _floor_to_30min_bucket(now)
  bucket_and_value = _select_bucket_value(row, bucket)

  if not bucket_and_value:
    return None

  used_bucket, value = bucket_and_value
  level = _get_congestion_level(value)

  station_name = row.get("출발역", mapping.debug_name or "")

  return SubwayCongestionResult(
    line_name=mapping.seoul_line_num,
    station_name=station_name,
    station_id=mapping.seoul_station_id,
    direction=direction_label,
    day_type=day_type,
    bucket_label=used_bucket,
    congestion_value=value,
    congestion_level=level,
  )

