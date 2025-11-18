"""
ODSAY 지하철 역 마스터 데이터 빌드 스크립트

용도:
  - config/odsay_lines.json 에 정의된 구간(SID, EID)을 돌면서
    ODSAY subwayPath API 결과에서 역 정보를 수집한다.
  - 수집 결과를 odsay_master_*.json / .csv 로 저장한다.
  - 기존 server/data/master_station_map.json 과 키(odsayStationID, odsaySubwayCode)로 병합한다.

사용 예:
  cd server
  ODSAY_API_KEY=... python build_odsay_master.py 1 2
"""

from __future__ import annotations

import asyncio
import csv
import json
import logging
import os
from collections import OrderedDict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import aiohttp


logger = logging.getLogger("build_odsay_master")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config" / "odsay_lines.json"
DATA_DIR = BASE_DIR / "data"
MASTER_MAP_PATH = DATA_DIR / "master_station_map.json"

ODSAY_BASE_URL = "https://api.odsay.com/v1/api"
CID_DEFAULT = "1000"
API_TIMEOUT_SECONDS = 3
MAX_RETRIES = 3


def load_odsay_lines() -> Dict[str, List[Dict[str, Any]]]:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"odsay_lines.json not found: {CONFIG_PATH}")

    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        raise ValueError("odsay_lines.json must be a JSON object mapping line codes to segment lists")

    return data


async def call_subway_path(
    session: aiohttp.ClientSession,
    api_key: str,
    sid: str,
    eid: str,
    cid: str = CID_DEFAULT,
    lang: int = 0,
    sopt: int = 1,
) -> Dict[str, Any]:
    url = f"{ODSAY_BASE_URL}/subwayPath"
    params = {
        "apiKey": api_key,
        "CID": cid,
        "SID": sid,
        "EID": eid,
        "lang": lang,
        "Sopt": sopt,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info(f"🔍 ODSAY subwayPath 호출: line SID={sid}, EID={eid}, attempt={attempt}")
            async with session.get(
                url,
                params=params,
                timeout=aiohttp.ClientTimeout(total=API_TIMEOUT_SECONDS),
            ) as response:
                status = response.status
                text = await response.text()

                if status == 200:
                    try:
                        return json.loads(text)
                    except json.JSONDecodeError:
                        logger.warning("⚠️ subwayPath JSON 파싱 실패")
                        return {}

                if status == 429 or status >= 500:
                    logger.warning(f"⚠️ subwayPath HTTP {status}, 재시도 예정 (attempt={attempt})")
                    await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
                    continue

                logger.error(f"❌ subwayPath HTTP 에러: status={status}, body={text[:200]}")
                return {}

        except asyncio.TimeoutError:
            logger.warning(f"⚠️ subwayPath 타임아웃 (attempt={attempt})")
            await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
        except aiohttp.ClientError as e:
            logger.warning(f"⚠️ subwayPath 네트워크 오류: {str(e)} (attempt={attempt})")
            await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
        except Exception as e:
            logger.error(f"❌ subwayPath 호출 중 예외: {str(e)} (attempt={attempt})")
            return {}

    logger.error("❌ subwayPath 최대 재시도 초과")
    return {}


def dedupe_preserve_order(
    items: Iterable[Dict[str, Any]],
    key_fields: Tuple[str, str],
) -> List[Dict[str, Any]]:
    seen: set = set()
    result: List[Dict[str, Any]] = []

    for item in items:
        key = tuple(str(item.get(k)) for k in key_fields)
        if key in seen:
            continue
        seen.add(key)
        result.append(item)

    return result


async def get_line_stations_for_segments(
    line_code: str,
    segments: List[Dict[str, Any]],
    api_key: str,
) -> List[Dict[str, Any]]:
    stations: List[Dict[str, Any]] = []

    async with aiohttp.ClientSession() as session:
        for segment in segments:
            sid = str(segment.get("SID"))
            eid = str(segment.get("EID"))
            if not sid or not eid:
                continue

            data = await call_subway_path(session, api_key=api_key, sid=sid, eid=eid)
            result = data.get("result") or {}
            paths = result.get("path") or []
            if not paths:
                logger.warning(f"⚠️ subwayPath 응답에 path 없음 (line={line_code}, SID={sid}, EID={eid})")
                continue

            first_path = paths[0]
            sub_paths = first_path.get("subPath") or []

            for sp in sub_paths:
                if sp.get("trafficType") != 1:
                    continue

                pass_stop_list = sp.get("passStopList") or {}
                sp_stations = pass_stop_list.get("stations") or []
                for st in sp_stations:
                    lane = st.get("lane")
                    if lane is not None and str(lane) != str(line_code):
                        continue

                    station_id = st.get("stationID")
                    station_name = st.get("stationName")
                    if not station_id or not station_name:
                        continue

                    stations.append(
                        {
                            "odsayStationID": str(station_id),
                            "odsaySubwayCode": str(line_code),
                            "stationName": station_name,
                        }
                    )

            await asyncio.sleep(0.1)

    deduped = dedupe_preserve_order(stations, key_fields=("odsayStationID", "odsaySubwayCode"))
    total = len(stations)
    unique = len(deduped)
    duplicates = total - unique
    logger.info(
        f"✅ line {line_code}: 수집역수={total}, 고유역수={unique}, 중복={duplicates}"
    )
    return deduped


def write_json(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)


def write_csv(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        with path.open("w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["odsayStationID", "odsaySubwayCode", "stationName"])
        return

    fieldnames = ["odsayStationID", "odsaySubwayCode", "stationName"]
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fieldnames})


def load_master_map() -> List[Dict[str, Any]]:
    if not MASTER_MAP_PATH.exists():
        return []
    with MASTER_MAP_PATH.open("r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            logger.warning("⚠️ master_station_map.json JSON 파싱 실패, 빈 리스트로 처리")
            return []
    if not isinstance(data, list):
        logger.warning("⚠️ master_station_map.json 형식이 리스트가 아님, 빈 리스트로 처리")
        return []
    return data


def merge_into_master_map(
    master_rows: List[Dict[str, Any]],
    new_rows: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    index: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for row in master_rows:
        key = (str(row.get("odsayStationID")), str(row.get("odsaySubwayCode")))
        index[key] = row

    added = 0
    for row in new_rows:
        key = (str(row.get("odsayStationID")), str(row.get("odsaySubwayCode")))
        if key in index:
            continue
        master_rows.append(
            {
                "odsayStationID": row["odsayStationID"],
                "odsaySubwayCode": row["odsaySubwayCode"],
                "seoulStationID": None,
                "seoulLineNum": None,
                "debugName": row["stationName"],
            }
        )
        added += 1

    logger.info(f"✅ master_station_map 병합: 신규 추가 {added}개")
    return master_rows


async def build_master(subway_codes: List[str]) -> None:
    api_key = os.getenv("ODSAY_API_KEY")
    if not api_key:
        raise RuntimeError("ODSAY_API_KEY 환경변수가 설정되지 않았습니다.")

    config = load_odsay_lines()

    stations_all: List[Dict[str, Any]] = []

    for code in subway_codes:
        segments = config.get(str(code)) or []
        if not segments:
            logger.warning(f"⚠️ odsay_lines.json에 line {code} 설정이 없습니다")
            continue

        line_stations = await get_line_stations_for_segments(str(code), segments, api_key=api_key)
        stations_all.extend(line_stations)

    stations_all = dedupe_preserve_order(stations_all, key_fields=("odsayStationID", "odsaySubwayCode"))

    if not stations_all:
        logger.warning("⚠️ 수집된 역이 없습니다. 출력 및 병합을 건너뜁니다.")
        return

    codes_label = "_".join(sorted({str(c) for c in subway_codes}))
    json_path = DATA_DIR / f"odsay_master_{codes_label}.json"
    csv_path = DATA_DIR / f"odsay_master_{codes_label}.csv"

    write_json(json_path, stations_all)
    write_csv(csv_path, stations_all)

    logger.info(f"✅ ODSAY 마스터 JSON 저장: {json_path}")
    logger.info(f"✅ ODSAY 마스터 CSV 저장:  {csv_path}")

    master_rows = load_master_map()
    merged = merge_into_master_map(master_rows, stations_all)
    MASTER_MAP_PATH.parent.mkdir(parents=True, exist_ok=True)
    with MASTER_MAP_PATH.open("w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    logger.info(f"✅ master_station_map.json 갱신 완료: {MASTER_MAP_PATH}")


def main() -> None:
    import sys

    if len(sys.argv) > 1:
        subway_codes = sys.argv[1:]
    else:
        subway_codes = ["1", "2"]

    logger.info(f"🚀 ODSAY 마스터 빌드 시작: lines={subway_codes}")
    asyncio.run(build_master(subway_codes))
    logger.info("🎉 ODSAY 마스터 빌드 완료")


if __name__ == "__main__":
    main()

