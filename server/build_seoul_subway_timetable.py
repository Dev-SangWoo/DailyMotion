"""
서울교통공사 열차시간표 API 기반 데이터 수집 및 DB 적재 (Fixed List Error Version)
- API 키 디코딩 적용
- 요일/방향 파라미터 코드 변환
- JSON 로더 강화 (List -> Dict 자동 변환 추가)
"""

import json
import time
import csv
import sys
import functools
from pathlib import Path
from typing import Dict, List, Optional, Union
from datetime import datetime, timedelta
from collections import defaultdict
import requests
from urllib.parse import urlencode, unquote

# 출력 버퍼링 비활성화
print = functools.partial(print, flush=True)

# =========================================================
# 1. 설정 및 상수 정의
# =========================================================

API_BASE_URL = "http://apis.data.go.kr/B553766/schedule/getTrainSch"
API_KEY = "BPcD%2FIuDZsW2errIGZ0nZ85UrIL85z01QwUMxMrUfZQitq%2BLK6JmWSaecq8QnF34d3YBpDCLMnYBvePHOzcU%2Bw%3D%3D"
REQUEST_DELAY = 0.2 
MAX_RETRIES = 3

WKND_SE_MAP = {
    "평일": [0, 1, 2, 3, 4],
    "토요일": [5],
    "일요일": [6],
}

DIRECTIONS = ["1", "2"]

# =========================================================
# 2. 유틸리티 함수
# =========================================================

def load_station_map(json_path: str) -> Dict[str, List[Dict]]:
    """
    master_station_map.json 로드
    [수정됨] 리스트([...]) 구조일 경우 호선별 딕셔너리로 자동 변환
    """
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Case 1: 이미 딕셔너리인 경우 ({"1호선": [...], "2호선": [...]})
    if isinstance(data, dict):
        return data

    # Case 2: 리스트인 경우 ([{"line": "1호선", ...}, ...]) 또는
    #         우리 프로젝트의 master_station_map.json 형식
    #         ({"seoulLineNum": "2호선", "seoulStationID": "...", "debugName": "..."} ...)
    if isinstance(data, list):
        print("ℹ️ JSON이 리스트 구조입니다. 호선별로 그룹핑을 수행합니다...")
        grouped = defaultdict(list)
        for item in data:
            # 'line' / 'line_name' / 'seoulLineNum' 키를 찾아서 그룹핑
            line = item.get('line') or item.get('line_name') or item.get('seoulLineNum')
            if line:
                grouped[line].append(item)
        return dict(grouped)

    return {}

def parse_time(time_str: str) -> Optional[datetime]:
    if not time_str:
        return None
    try:
        time_str = str(time_str).strip()
        if len(time_str) == 6 and time_str.isdigit():
            return datetime.strptime(time_str, "%H%M%S")
        elif ':' in time_str:
            return datetime.strptime(time_str, "%H:%M:%S")
        elif len(time_str) == 4 and time_str.isdigit():
            return datetime.strptime(time_str, "%H%M")
        return None
    except ValueError:
        return None

def calculate_duration(prev_depart_time: datetime, curr_arrive_time: datetime) -> int:
    duration = (curr_arrive_time - prev_depart_time).total_seconds()
    if duration < 0:
        duration += 86400
    return int(duration)

def call_api(params: Dict, retry_count: int = 0) -> Optional[List[Dict]]:
    try:
        request_params = params.copy()
        # serviceKey는 이미 URL 인코딩된 형태이므로, 여기서만 한 번 decode 후
        # requests가 다시 인코딩하도록 한다.
        request_params['serviceKey'] = unquote(API_KEY)

        response = requests.get(API_BASE_URL, params=request_params, timeout=10)
        
        try:
            data = response.json()
        except json.JSONDecodeError:
            if retry_count < MAX_RETRIES:
                time.sleep(0.5)
                return call_api(params, retry_count + 1)
            return None

        if 'response' in data:
            header = data['response'].get('header', {})
            if header.get('resultCode') != '00':
                return None

            body = data['response'].get('body', {})
            items = body.get('items', {}).get('item', [])

            if isinstance(items, dict):
                items = [items]
            return items

        return None

    except Exception:
        if retry_count < MAX_RETRIES:
            time.sleep(0.5)
            return call_api(params, retry_count + 1)
        return None

# =========================================================
# 3. 핵심 로직 함수
# =========================================================

def fetch_line_schedule(line_name: str, stations: List[Dict], wknd_key: str, direction_code: str) -> List[Dict]:
    schedules = []
    
    dir_label = "상행" if direction_code == "1" else "하행"
    print(f"📡 {line_name} | {wknd_key} | {dir_label}(Code {direction_code}) 수집 중...", end=" ")
    
    count = 0
    
    for station in stations:
        # master_station_map 포맷에 따라 다양한 키 지원:
        # 1) {"station_name": "서울역", "station_code": "150", "line": "1호선"}
        # 2) {"seoulLineNum": "1호선", "seoulStationID": "150", "debugName": "서울역"}
        raw_name = (
            station.get("station_name")
            or station.get("stationName")
            or station.get("stnNm")
            or station.get("debugName")
        )
        if not raw_name:
            continue

        # debugName이 "서울역 (1호선)" 같은 형태일 수 있으므로 괄호 이후는 제거
        station_name = raw_name.split(" (")[0].strip()

        station_code = (
            station.get("station_code")
            or station.get("stationCode")
            or station.get("seoulStationID")
            or station.get("stnCd")
        )

        # 서울교통공사 시간표 API 스펙에 맞춰
        # - upbdnbSe: "상행" / "하행"
        # - wkndSe: "평일" / "토요일" / "일요일"
        params = {
            'lineNm': line_name,
            'stnNm': station_name,
            'upbdnbSe': dir_label,
            'wkndSe': wknd_key,
            'tmprTmtblYn': 'N',
            'dataType': 'JSON',
            'numOfRows': 500,
            'pageNo': 1
        }

        items = call_api(params)

        if items:
            for item in items:
                d_time = parse_time(item.get('trainDptreTm'))
                a_time = parse_time(item.get('trainArvlTm'))

                if d_time:
                    schedules.append({
                        'line': line_name,
                        'station_code': station_code,
                        'station_name': station_name,
                        'direction': direction_code,
                        'wknd_se': wknd_key, 
                        'train_no': item.get('trainNo', item.get('trainno', '')),
                        'depart_time': d_time,
                        'arrive_time': a_time,
                        'depart_hour': d_time.hour
                    })
                    count += 1
        
    print(f"-> ✅ {count}개")
    return schedules

def compute_segment_durations(schedules: List[Dict]) -> List[Dict]:
    trains = defaultdict(list)
    for sch in schedules:
        if not sch['train_no']: continue
        key = f"{sch['line']}_{sch['direction']}_{sch['wknd_se']}_{sch['train_no']}"
        trains[key].append(sch)

    segment_durations = []

    for key, stops in trains.items():
        stops.sort(key=lambda x: x['depart_time'])

        if len(stops) < 2: continue

        for i in range(len(stops) - 1):
            prev = stops[i]
            curr = stops[i+1]

            if curr.get('arrive_time'):
                duration = calculate_duration(prev['depart_time'], curr['arrive_time'])
            else:
                duration = calculate_duration(prev['depart_time'], curr['depart_time'])

            if 30 <= duration <= 1200:
                segment_durations.append({
                    'line': prev['line'],
                    'start_station': prev['station_name'],
                    'end_station': curr['station_name'],
                    'direction': prev['direction'],
                    'wknd_se': prev['wknd_se'],
                    'departure_hour': prev['depart_hour'],
                    'duration_seconds': duration
                })

    return segment_durations

def aggregate_statistics(segment_durations: List[Dict]) -> List[Dict]:
    groups = defaultdict(list)

    for item in segment_durations:
        target_days = WKND_SE_MAP.get(item['wknd_se'], [])
        
        # Segment ID (한글 표준)
        seg_id = f"subway_{item['line']}_{item['start_station']}-{item['end_station']}_{item['direction']}"

        for dow in target_days:
            key = (seg_id, item['departure_hour'], dow)
            groups[key].append(item['duration_seconds'])

    statistics = []
    for (seg_id, hour, dow), durations in groups.items():
        avg_sec = int(sum(durations) / len(durations))
        count = len(durations)
        
        parts = seg_id.split('_')
        line_name = parts[1]
        st_part = parts[2].split('-')

        statistics.append({
            'segment_id': seg_id,
            'transport_type': 'SUBWAY',
            'transport_name': line_name,
            'start_station_name': st_part[0],
            'end_station_name': st_part[1],
            'departure_hour': hour,
            'day_of_week': dow,
            'avg_duration_seconds': avg_sec,
            'sample_count': count,
            'is_reliable': 1 if count >= 5 else 0
        })
    
    return statistics

def save_to_csv(statistics: List[Dict], csv_path: str):
    if not statistics:
        print("❌ 저장할 데이터가 없습니다.")
        return

    fieldnames = [
        'segment_id', 'transport_type', 'transport_name',
        'start_station_name', 'end_station_name',
        'departure_hour', 'day_of_week',
        'avg_duration_seconds', 'sample_count', 'is_reliable'
    ]
    
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(statistics)
    
    print(f"\n🎉 파일 저장 완료: {csv_path}")
    print(f"총 {len(statistics)}개의 레코드가 생성되었습니다.")

# =========================================================
# 4. 메인 실행
# =========================================================

def main():
    project_root = Path(__file__).parent.parent
    station_map_path = project_root / "data" / "master_station_map.json"
    output_csv_path = project_root / "data" / "average_duration_stats.csv"

    print(f"🚀 데이터 수집 시작 (Map: {station_map_path})")
    
    try:
        station_map = load_station_map(str(station_map_path))
    except FileNotFoundError:
        print("❌ master_station_map.json 파일을 찾을 수 없습니다.")
        return
    except Exception as e:
        print(f"❌ JSON 로드 중 오류 발생: {e}")
        return

    all_schedules = []

    # 딕셔너리로 변환된 station_map 사용
    for line_name, stations in station_map.items():
        for direction in DIRECTIONS:
            for wknd_key in ["평일", "토요일", "일요일"]:
                result = fetch_line_schedule(line_name, stations, wknd_key, direction)
                all_schedules.extend(result)
    
    print(f"\n📊 총 {len(all_schedules)}개 시간표 데이터 수집됨.")

    if not all_schedules:
        print("❌ 수집된 데이터가 없습니다.")
        return

    print("⏳ 통계 처리 중...")
    durations = compute_segment_durations(all_schedules)
    stats = aggregate_statistics(durations)
    save_to_csv(stats, str(output_csv_path))

if __name__ == "__main__":
    main()
