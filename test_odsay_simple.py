#!/usr/bin/env python3
"""
ODSAY API 간단 테스트 스크립트
pytest 없이 직접 실행
"""

import sys
import os
import asyncio

# .env 파일에서 환경변수 읽기
env_path = os.path.join(os.path.dirname(__file__), 'server', '.env')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

# 모듈 경로 추가
sys.path.insert(0, os.path.dirname(__file__))

from server.app.services.odsay_client import OdsayAPIClient


async def main():
    """메인 테스트 함수"""

    api_key = os.getenv("ODSAY_API_KEY")

    if not api_key:
        print("❌ ODSAY_API_KEY 환경변수가 설정되지 않았습니다")
        print(f"   찾은 .env 경로: {env_path}")
        print(f"   .env 존재 여부: {os.path.exists(env_path)}")
        return False

    print("="*70)
    print("🔍 ODSAY API 통합 테스트 (역 검색 → 경로 검색)")
    print("="*70)
    print(f"✅ API Key 확인: {api_key[:20]}...")
    print()

    try:
        # 클라이언트 초기화
        client = OdsayAPIClient(api_key=api_key)
        print("✅ OdsayAPIClient 초기화 성공\n")

        # ========== Step 1: 역 검색 ==========
        print("="*70)
        print("📍 Step 1: 역 검색")
        print("="*70)

        start_station_name = "강남역"
        end_station_name = "을지로입구역"

        print(f"검색 중: '{start_station_name}'...")
        start_response = await client.search_station(station_name=start_station_name)

        # 응답이 error 필드를 가지면 오류 처리
        if "error" in start_response:
            print(f"❌ 역 검색 실패: {start_response['error']}\n")
            return False

        # 성공한 경우: result 필드 직접 확인
        if "result" in start_response:
            start_stations = start_response.get("result", {}).get("station", [])
            if start_stations:
                start_station = start_stations[0]
                start_x = start_station['x']
                start_y = start_station['y']
                print(f"✅ 출발지 찾음: {start_station['stationName']}")
                print(f"   좌표: ({start_x}, {start_y})\n")
            else:
                print(f"❌ '{start_station_name}' 검색 결과 없음\n")
                return False
        else:
            print(f"❌ 역 검색 실패: 예상치 못한 응답 형식\n")
            print(f"   응답: {start_response}\n")
            return False

        print(f"검색 중: '{end_station_name}'...")
        end_response = await client.search_station(station_name=end_station_name)

        # 응답이 error 필드를 가지면 오류 처리
        if "error" in end_response:
            print(f"❌ 역 검색 실패: {end_response['error']}\n")
            return False

        # 성공한 경우: result 필드 직접 확인
        if "result" in end_response:
            end_stations = end_response.get("result", {}).get("station", [])
            if end_stations:
                end_station = end_stations[0]
                end_x = end_station['x']
                end_y = end_station['y']
                print(f"✅ 도착지 찾음: {end_station['stationName']}")
                print(f"   좌표: ({end_x}, {end_y})\n")
            else:
                print(f"❌ '{end_station_name}' 검색 결과 없음\n")
                return False
        else:
            print(f"❌ 역 검색 실패: 예상치 못한 응답 형식\n")
            print(f"   응답: {end_response}\n")
            return False

        # ========== Step 2: 경로 검색 ==========
        print("="*70)
        print("📍 Step 2: 경로 검색")
        print("="*70)
        print(f"{start_station['stationName']} → {end_station['stationName']}")
        print(f"좌표: ({start_x}, {start_y}) → ({end_x}, {end_y})\n")

        response = await client.search_route(
            start_x=start_x,
            start_y=start_y,
            end_x=end_x,
            end_y=end_y,
            search_type=0  # 모든 경로
        )

        response_code = response.get('code')
        print(f"✅ API 응답 코드: {response_code}")
        print(f"   응답 유형: {type(response)}")
        print(f"   응답 keys: {response.keys() if isinstance(response, dict) else 'N/A'}\n")

        # 응답 코드 확인 (code 필드 없을 수 있음)
        if "result" in response and response.get("code") != -1:
            paths = response["result"].get("path", [])
            print(f"✅ 검색된 경로: {len(paths)}개\n")

            if len(paths) == 0:
                print("⚠️ 경로가 검색되지 않았습니다")
                return False

            # 원본 응답 정보
            print("📋 원본 ODSAY API 응답 (첫 2개 경로):")
            print("-" * 70)
            for idx, path in enumerate(paths[:2], 1):
                info = path.get("info", {})
                print(f"\n경로 {idx}:")
                print(f"  - pathType: {path.get('pathType')}")
                print(f"  - totalTime: {info.get('totalTime')}초 = {info.get('totalTime')//60}분")
                print(f"  - totalDistance: {info.get('totalDistance')}m = {info.get('totalDistance')/1000:.1f}km")
                print(f"  - totalPrice: {info.get('totalPrice')}원")
                print(f"  - busCount: {info.get('busCount')}")
                print(f"  - subwayCount: {info.get('subwayCount')}")
                print(f"  - transferCount: {info.get('transferCount')}")
                print(f"  - 상세 구간(legs): {len(path.get('legs', []))}개")

            # 파싱된 응답
            print("\n" + "=" * 70)
            print("✅ 파싱된 응답:\n")
            parsed = client.parse_route_info(response)

            if parsed.get("code") == 0:
                parsed_paths = parsed.get("paths", [])
                print(f"✅ 파싱 성공: {len(parsed_paths)}개 경로\n")
                client.print_route_summary(parsed_paths)
                return True
            else:
                print(f"❌ 파싱 오류: {parsed.get('error')}")
                return False

        else:
            print(f"❌ API 오류")
            print(f"   코드: {response.get('code')}")
            print(f"   메시지: {response.get('message', 'Unknown error')}")
            return False

    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        print("\n" + "=" * 70)
        print("테스트 완료")
        print("=" * 70)


if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️ 테스트 중단됨")
        sys.exit(130)
