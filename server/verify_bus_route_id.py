"""
서울시 버스 실시간 API용 노선 ID(busRouteId) 확인 스크립트

용도:
  - ODSAY에서 가져온 버스 노선(예: '구로09')이
    서울시 버스 API에서 어떤 busRouteId를 사용하는지 빠르게 확인할 때 사용합니다.

사용법 (server 디렉토리에서 실행):
  $ python verify_bus_route_id.py 구로09

필수 환경변수:
  - SEOUL_BUS_API_KEY : 서울시 버스 API 서비스 키
"""

import os
import sys
import xml.etree.ElementTree as ET

import requests
from dotenv import load_dotenv


BUS_ROUTE_LIST_URL = "http://ws.bus.go.kr/api/rest/busRouteInfo/getBusRouteList"


def fetch_route_list(route_name: str, api_key: str):
    """노선 이름으로 서울시 버스 노선 목록 조회."""
    params = {
        "serviceKey": api_key,
        "strSrch": route_name,
    }
    resp = requests.get(BUS_ROUTE_LIST_URL, params=params, timeout=10)
    resp.raise_for_status()
    root = ET.fromstring(resp.content)
    return root.findall(".//itemList")


def main():
    # .env 파일 로드 (.env에 SEOUL_BUS_API_KEY가 있을 때 자동 사용)
    load_dotenv()

    if len(sys.argv) < 2:
        print("Usage: python verify_bus_route_id.py <routeName>")
        print("Example: python verify_bus_route_id.py 구로09")
        sys.exit(1)

    route_name = sys.argv[1]
    api_key = os.getenv("SEOUL_BUS_API_KEY")

    if not api_key:
        print("ERROR: SEOUL_BUS_API_KEY 환경변수가 설정되어 있지 않습니다.")
        sys.exit(1)

    print(f"🔍 버스 노선 검색: '{route_name}'")

    try:
        items = fetch_route_list(route_name, api_key)
    except requests.RequestException as e:
        print(f"HTTP 요청 실패: {e}")
        sys.exit(1)
    except ET.ParseError as e:
        print(f"XML 파싱 실패: {e}")
        sys.exit(1)

    if not items:
        print("⚠️ 해당 이름으로 검색된 노선이 없습니다.")
        sys.exit(0)

    print(f"✅ 검색 결과: {len(items)}개 노선")
    for idx, item in enumerate(items, start=1):
        bus_route_id = item.findtext("busRouteId", "").strip()
        bus_route_nm = item.findtext("busRouteNm", "").strip()
        st_station_nm = item.findtext("stStationNm", "").strip()
        ed_station_nm = item.findtext("edStationNm", "").strip()
        term = item.findtext("term", "").strip()

        print(
            f"{idx}. 노선명={bus_route_nm}, busRouteId={bus_route_id}, "
            f"구간={st_station_nm} → {ed_station_nm}, 배차간격={term}분"
        )


if __name__ == "__main__":
    main()
