"""
재난 문자 CSV 파일 파싱 유틸리티

SafetyData.csv 파일을 읽어서 재난 문자 데이터를 파싱합니다.
"""
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from geopy.distance import geodesic
from dateutil.relativedelta import relativedelta
from calendar import monthrange
import logging

logger = logging.getLogger(__name__)

# CSV 파일 경로
CSV_FILE_PATH = Path(__file__).parent.parent.parent / "SafetyData.csv"

# 재난 유형별 아이콘 매핑
DISASTER_TYPE_ICONS = {
    "호우": "🌧️",
    "태풍": "🌀",
    "강풍": "💨",
    "대설": "❄️",
    "한파": "🧊",
    "폭염": "☀️",
    "지진": "🌍",
    "화재": "🔥",
    "사고": "🚨",
    "교통": "🚗",
    "기타": "⚠️",
}


def parse_excel_file() -> List[Dict[str, Any]]:
    """
    CSV 파일을 읽어서 재난 문자 데이터를 파싱합니다.
    
    CSV 형식:
    - 컬럼 0: 메시지 내용
    - 컬럼 1: 지역명 (쉼표로 구분된 여러 지역 가능)
    - 컬럼 2: 날짜 시간 (예: "2025-09-01 17:20")
    - 컬럼 3: 날짜 (예: "2025-09-01")
    - 컬럼 4: 안전안내
    - 컬럼 5: ID
    - 컬럼 6: 재난 유형
    - 컬럼 7: 날짜 (예: "2025-09-01")
    
    Returns:
        재난 문자 데이터 리스트
    """
    if not CSV_FILE_PATH.exists():
        logger.warning(f"CSV 파일을 찾을 수 없습니다: {CSV_FILE_PATH}")
        return []
    
    try:
        # CSV 파일 읽기 (여러 인코딩 시도)
        df = None
        encodings = ['utf-8', 'cp949', 'euc-kr', 'latin-1']
        
        for encoding in encodings:
            try:
                df = pd.read_csv(
                    CSV_FILE_PATH,
                    header=0,  # 헤더가 있음
                    encoding=encoding,
                    on_bad_lines='skip',
                    engine='python'  # 더 유연한 파싱
                )
                logger.info(f"CSV 파일 로드 완료 (인코딩: {encoding}): {len(df)}개 행")
                break
            except (UnicodeDecodeError, Exception) as e:
                logger.warning(f"인코딩 {encoding} 실패: {e}")
                continue
        
        if df is None:
            logger.error("모든 인코딩 시도 실패")
            return []
        
        # 컬럼명 확인 및 매핑
        # 예상 컬럼: MSG_CN, RCPTN_RGN_NM, CRT_DT, REG_YMD, EMRG_STEP_NM, SN, DST_SE_NM, MDFCN_YMD
        column_mapping = {}
        for col in df.columns:
            col_upper = str(col).upper()
            if 'MSG' in col_upper or '메시지' in str(col):
                column_mapping['message'] = col
            elif 'RGN' in col_upper or '지역' in str(col) or 'RCPTN' in col_upper:
                column_mapping['region'] = col
            elif 'CRT_DT' in col_upper or '생성' in str(col) or '일시' in str(col):
                column_mapping['date'] = col
            elif 'REG_YMD' in col_upper or '등록' in str(col):
                column_mapping['date_alt'] = col
            elif 'EMRG' in col_upper or '비상' in str(col) or 'STEP' in col_upper:
                column_mapping['emergency'] = col
            elif 'SN' in col_upper or col_upper == 'ID' or '일련' in str(col):
                column_mapping['id'] = col
            elif 'DST' in col_upper or '재난' in str(col) or 'SE' in col_upper:
                column_mapping['type'] = col
        
        logger.info(f"컬럼 매핑: {column_mapping}")
        logger.info(f"실제 컬럼: {df.columns.tolist()}")
        
        alerts = []
        for idx, row in df.iterrows():
            try:
                # 빈 행 스킵
                if row.isna().all():
                    continue
                
                # 메시지 내용
                message = ""
                if 'message' in column_mapping:
                    message = str(row[column_mapping['message']]).strip() if pd.notna(row[column_mapping['message']]) else ""
                elif len(df.columns) > 0:
                    message = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
                
                if not message or message == "nan" or message.lower() == "msg_cn":
                    continue
                
                # 지역명
                region = ""
                if 'region' in column_mapping:
                    region_str = str(row[column_mapping['region']]).strip() if pd.notna(row[column_mapping['region']]) else ""
                elif len(df.columns) > 1:
                    region_str = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""
                else:
                    region_str = ""
                
                # 여러 지역이 쉼표로 구분되어 있으면 첫 번째만 사용
                if region_str and "," in region_str:
                    region = region_str.split(",")[0].strip()
                else:
                    region = region_str
                
                # 날짜 시간 (CRT_DT 우선, 없으면 REG_YMD)
                date_str = None
                if 'date' in column_mapping:
                    date_str = str(row[column_mapping['date']]).strip() if pd.notna(row[column_mapping['date']]) else ""
                elif 'date_alt' in column_mapping:
                    date_str = str(row[column_mapping['date_alt']]).strip() if pd.notna(row[column_mapping['date_alt']]) else ""
                elif len(df.columns) > 2:
                    date_str = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ""
                
                if not date_str or date_str == "nan":
                    continue
                
                # 날짜 파싱 시도
                try:
                    alert_date = pd.to_datetime(date_str, errors='coerce', infer_datetime_format=True)
                    
                    # 파싱 실패 시 (NaT)
                    if pd.isna(alert_date):
                        logger.warning(f"날짜 파싱 실패 (행 {idx}): {date_str}")
                        continue
                        
                except Exception as e:
                    logger.warning(f"날짜 파싱 실패 (행 {idx}): {date_str}, 오류: {e}")
                    continue
                
                # 날짜 타입 변환 (pandas Timestamp -> datetime)
                if isinstance(alert_date, pd.Timestamp):
                    alert_date = alert_date.to_pydatetime()
                
                # 재난 유형
                disaster_type = "기타"
                if 'type' in column_mapping:
                    disaster_type = str(row[column_mapping['type']]).strip() if pd.notna(row[column_mapping['type']]) else "기타"
                elif len(df.columns) > 6:
                    disaster_type = str(row.iloc[6]).strip() if pd.notna(row.iloc[6]) else "기타"
                
                if not disaster_type or disaster_type == "nan":
                    disaster_type = "기타"
                
                # ID
                alert_id = idx + 1  # 1부터 시작 (헤더 제외)
                if 'id' in column_mapping:
                    try:
                        alert_id = int(row[column_mapping['id']]) if pd.notna(row[column_mapping['id']]) else idx + 1
                    except:
                        alert_id = idx + 1
                elif len(df.columns) > 5:
                    try:
                        alert_id = int(row.iloc[5]) if pd.notna(row.iloc[5]) else idx + 1
                    except:
                        alert_id = idx + 1
                
                # 비상 단계
                emergency_step = ""
                if 'emergency' in column_mapping:
                    emergency_step = str(row[column_mapping['emergency']]).strip() if pd.notna(row[column_mapping['emergency']]) else ""
                elif len(df.columns) > 4:
                    emergency_step = str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else ""
                
                alert = {
                    "id": alert_id,
                    "type": disaster_type,
                    "message": message,
                    "region": region,
                    "emergencyStep": emergency_step,
                    "date": alert_date.isoformat(),
                    "icon": DISASTER_TYPE_ICONS.get(disaster_type, "⚠️"),
                }
                
                alerts.append(alert)
                
            except Exception as e:
                logger.warning(f"행 {idx} 파싱 중 오류: {e}")
                import traceback
                logger.warning(traceback.format_exc())
                continue
        
        logger.info(f"재난 문자 파싱 완료: {len(alerts)}개")
        return alerts
        
    except Exception as e:
        logger.error(f"CSV 파일 파싱 중 오류: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return []


def filter_alerts_by_date(alerts: List[Dict[str, Any]], days: int = 21) -> List[Dict[str, Any]]:
    """
    현재 날짜 기준 N일 이내의 재난 문자만 필터링합니다.
    (+2년 처리된 미래 날짜도 포함)
    
    Args:
        alerts: 재난 문자 리스트
        days: 필터링할 일수 (기본값: 21일 = 3주)
    
    Returns:
        필터링된 재난 문자 리스트
    """
    now = datetime.now()
    cutoff_date = now - timedelta(days=days)
    
    filtered = []
    for alert in alerts:
        try:
            alert_date = datetime.fromisoformat(alert["date"].replace("Z", "+00:00"))
            # 타임존 제거
            if alert_date.tzinfo:
                alert_date = alert_date.replace(tzinfo=None)
            
            # 엑셀 데이터가 이미 +2년 처리되어 있으므로 그대로 사용
            # 최근 N일치 필터링
            if cutoff_date <= alert_date <= now:
                filtered.append(alert)
        except Exception as e:
            logger.warning(f"날짜 필터링 중 오류 (alert {alert.get('id')}): {e}")
            continue
    
    logger.info(f"날짜 필터링 완료: {len(filtered)}개 (전체 {len(alerts)}개 중, cutoff: {cutoff_date}, now: {now})")
    return filtered


def get_region_coordinates(region: str) -> Optional[Tuple[float, float]]:
    """
    지역명을 좌표로 변환합니다. (간단한 매핑 또는 Geocoding API 사용)
    
    현재는 기본 좌표만 반환합니다. 실제로는 Geocoding API를 사용해야 합니다.
    
    Args:
        region: 지역명 (예: "서울시 강남구")
    
    Returns:
        (위도, 경도) 튜플 또는 None
    """
    # 간단한 지역명 매핑 (실제로는 Geocoding API 사용 권장)
    region_coords = {
        "서울": (37.5665, 126.9780),
        "강남": (37.4979, 127.0276),
        "강남구": (37.4979, 127.0276),
        "서초": (37.4837, 127.0324),
        "서초구": (37.4837, 127.0324),
        "송파": (37.5145, 127.1058),
        "송파구": (37.5145, 127.1058),
    }
    
    for key, coords in region_coords.items():
        if key in region:
            return coords
    
    # 기본값: 서울시청
    return (37.5665, 126.9780)


def filter_alerts_by_route(
    alerts: List[Dict[str, Any]],
    route_coords: List[Dict[str, float]],
    radius_meters: float = 500
) -> List[Dict[str, Any]]:
    """
    경로 근처의 재난 문자만 필터링합니다.
    
    Args:
        alerts: 재난 문자 리스트
        route_coords: 경로 좌표 리스트 [{"lat": 37.5665, "lng": 126.9780}, ...]
        radius_meters: 반경 (미터, 기본값: 500m)
    
    Returns:
        필터링된 재난 문자 리스트 (location 정보 포함)
    """
    if not route_coords or not alerts:
        return []
    
    filtered = []
    for alert in alerts:
        region = alert.get("region", "")
        if not region:
            continue
        
        # 지역명을 좌표로 변환
        coords = get_region_coordinates(region)
        if not coords:
            continue
        
        alert_lat, alert_lng = coords
        
        # 경로의 각 좌표와 거리 계산
        min_distance = float("inf")
        for route_point in route_coords:
            route_lat = route_point.get("lat")
            route_lng = route_point.get("lng")
            
            if route_lat is None or route_lng is None:
                continue
            
            # 하버사인 공식으로 거리 계산 (미터 단위)
            distance = geodesic((alert_lat, alert_lng), (route_lat, route_lng)).meters
            
            if distance < min_distance:
                min_distance = distance
        
        # 반경 이내인 경우만 추가
        if min_distance <= radius_meters:
            alert_with_location = alert.copy()
            alert_with_location["location"] = {
                "lat": alert_lat,
                "lng": alert_lng,
            }
            alert_with_location["distance"] = round(min_distance, 2)
            filtered.append(alert_with_location)
    
    logger.info(f"경로 필터링 완료: {len(filtered)}개 (전체 {len(alerts)}개 중, 반경 {radius_meters}m)")
    return filtered

