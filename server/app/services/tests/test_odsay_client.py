"""
ODSAY API 클라이언트 테스트
"""

import pytest
import asyncio
import os
import json
from app.services.odsay_client import OdsayAPIClient

# ODSAY API Key 확인
ODSAY_API_KEY = os.getenv("ODSAY_API_KEY")

# 테스트용 좌표
# 강남역 (127.0276, 37.4979) → 을지로입구역 (127.2748, 37.5653)
TEST_START_X = 127.0276
TEST_START_Y = 37.4979
TEST_END_X = 127.2748
TEST_END_Y = 37.5653


@pytest.mark.asyncio
async def test_odsay_api_key_exists():
    """ODSAY API Key 존재 여부 테스트"""
    assert ODSAY_API_KEY is not None, "ODSAY_API_KEY 환경변수가 설정되지 않았습니다"
    assert len(ODSAY_API_KEY) > 0, "ODSAY_API_KEY가 비어있습니다"
    print(f"\n✅ API Key 확인: {ODSAY_API_KEY[:20]}...")


@pytest.mark.asyncio
async def test_odsay_client_initialization():
    """OdsayAPIClient 초기화 테스트"""
    if not ODSAY_API_KEY:
        pytest.skip("ODSAY_API_KEY 환경변수가 설정되지 않음")

    client = OdsayAPIClient(api_key=ODSAY_API_KEY)
    assert client is not None
    assert client.api_key == ODSAY_API_KEY
    print(f"\n✅ OdsayAPIClient 초기화 성공")


@pytest.mark.asyncio
async def test_odsay_api_connection():
    """ODSAY API 연결 및 응답 테스트"""

    if not ODSAY_API_KEY:
        pytest.skip("ODSAY_API_KEY 환경변수가 설정되지 않음")

    client = OdsayAPIClient(api_key=ODSAY_API_KEY)

    print(f"\n🔍 경로 검색 시작...")
    print(f"   출발: ({TEST_START_X}, {TEST_START_Y})")
    print(f"   도착: ({TEST_END_X}, {TEST_END_Y})")

    response = await client.search_route(
        start_x=TEST_START_X,
        start_y=TEST_START_Y,
        end_x=TEST_END_X,
        end_y=TEST_END_Y,
        search_type=1
    )

    # 응답 기본 구조 검증
    assert response is not None, "응답이 None입니다"
    assert "code" in response, "응답에 'code' 필드가 없습니다"

    response_code = response.get("code")
    print(f"\n✅ API 응답 코드: {response_code}")

    # 성공 응답 (code == 0)
    if response_code == 0:
        assert "result" in response, "성공 응답에 'result' 필드가 없습니다"
        assert "path" in response["result"], "result에 'path' 필드가 없습니다"

        paths = response["result"]["path"]
        print(f"✅ 검색된 경로 수: {len(paths)}개")

        assert len(paths) > 0, "검색된 경로가 없습니다"

        # 첫 번째 경로 검증
        first_path = paths[0]
        assert "info" in first_path, "경로에 'info' 필드가 없습니다"
        assert "legs" in first_path, "경로에 'legs' 필드가 없습니다"

        info = first_path["info"]
        print(f"\n✅ 첫 번째 경로 정보:")
        print(f"   - 소요시간: {info.get('totalTime', 0) // 60}분")
        print(f"   - 거리: {info.get('totalDistance', 0) / 1000:.1f}km")
        print(f"   - 요금: {info.get('totalPrice', 0)}원")
        print(f"   - 버스: {info.get('busCount', 0)}개, 지하철: {info.get('subwayCount', 0)}개")

        # info 필드 검증
        assert "totalTime" in info, "info에 'totalTime' 필드가 없습니다"
        assert "totalDistance" in info, "info에 'totalDistance' 필드가 없습니다"
        assert "totalPrice" in info, "info에 'totalPrice' 필드가 없습니다"

    else:
        print(f"⚠️ API 오류 응답 (코드: {response_code})")
        print(f"   메시지: {response.get('message', 'N/A')}")


@pytest.mark.asyncio
async def test_odsay_response_parsing():
    """ODSAY API 응답 파싱 테스트"""

    if not ODSAY_API_KEY:
        pytest.skip("ODSAY_API_KEY 환경변수가 설정되지 않음")

    client = OdsayAPIClient(api_key=ODSAY_API_KEY)

    print(f"\n🔍 응답 파싱 테스트 시작...")

    response = await client.search_route(
        start_x=TEST_START_X,
        start_y=TEST_START_Y,
        end_x=TEST_END_X,
        end_y=TEST_END_Y
    )

    # 파싱
    parsed = client.parse_route_info(response)

    assert parsed is not None, "파싱 결과가 None입니다"
    assert "code" in parsed, "파싱 결과에 'code' 필드가 없습니다"

    parse_code = parsed.get("code")
    print(f"\n✅ 파싱 코드: {parse_code}")

    if parse_code == 0:
        assert "paths" in parsed, "파싱 결과에 'paths' 필드가 없습니다"

        paths = parsed["paths"]
        print(f"✅ 파싱된 경로 수: {len(paths)}개\n")

        if len(paths) > 0:
            # 첫 번째 경로 검증
            first_path = paths[0]

            # 필수 필드 검증
            required_fields = ["id", "totalTime", "totalDistance", "totalPrice", "busCount", "subwayCount"]
            for field in required_fields:
                assert field in first_path, f"경로에 '{field}' 필드가 없습니다"

            # 출력
            print(f"📊 파싱된 경로 정보:")
            for idx, path in enumerate(paths[:3], 1):  # 첫 3개만 출력
                print(f"\n  경로 {idx} ({path['id']}):")
                print(f"    - 소요시간: {path['totalTimeMinutes']}분 ({path['totalTime']}초)")
                print(f"    - 거리: {path['totalDistanceKm']}km ({path['totalDistance']}m)")
                print(f"    - 요금: {path['totalPrice']:,}원")
                print(f"    - 버스: {path['busCount']}개, 지하철: {path['subwayCount']}개")
    else:
        print(f"⚠️ 파싱 오류 (코드: {parse_code})")
        print(f"   에러: {parsed.get('error', 'N/A')}")


@pytest.mark.asyncio
async def test_odsay_print_summary():
    """경로 요약 출력 테스트"""

    if not ODSAY_API_KEY:
        pytest.skip("ODSAY_API_KEY 환경변수가 설정되지 않음")

    client = OdsayAPIClient(api_key=ODSAY_API_KEY)

    print(f"\n🔍 경로 요약 출력 테스트...")

    response = await client.search_route(
        start_x=TEST_START_X,
        start_y=TEST_START_Y,
        end_x=TEST_END_X,
        end_y=TEST_END_Y
    )

    parsed = client.parse_route_info(response)

    if parsed.get("code") == 0:
        print("\n")
        client.print_route_summary(parsed.get("paths", []))


# 동기 테스트 (pytest 없이 직접 실행)
async def manual_test():
    """수동 테스트용 함수 (직접 실행 시 사용)"""

    if not ODSAY_API_KEY:
        print("❌ ODSAY_API_KEY 환경변수가 설정되지 않았습니다")
        return

    print("="*70)
    print("🔍 ODSAY API 수동 테스트")
    print("="*70)

    try:
        client = OdsayAPIClient(api_key=ODSAY_API_KEY)
        print("✅ OdsayAPIClient 초기화 성공\n")

        # 강남역 → 을지로입구역 경로 검색
        print(f"📍 경로 검색: 강남역 → 을지로입구역")
        print(f"   출발 좌표: ({TEST_START_X}, {TEST_START_Y})")
        print(f"   도착 좌표: ({TEST_END_X}, {TEST_END_Y})\n")

        response = await client.search_route(
            start_x=TEST_START_X,
            start_y=TEST_START_Y,
            end_x=TEST_END_X,
            end_y=TEST_END_Y
        )

        print(f"✅ API 응답 코드: {response.get('code', 'Unknown')}\n")

        if response.get("code") == 0 and "result" in response:
            paths = response["result"].get("path", [])
            print(f"✅ 검색된 경로: {len(paths)}개\n")

            # 원본 응답 출력 (최대 2개)
            print("📋 원본 ODSAY API 응답:")
            print("-" * 70)
            for idx, path in enumerate(paths[:2], 1):
                info = path.get("info", {})
                print(f"\n경로 {idx}:")
                print(f"  - pathType: {path.get('pathType')}")
                print(f"  - totalTime: {info.get('totalTime')}초")
                print(f"  - totalDistance: {info.get('totalDistance')}m")
                print(f"  - totalPrice: {info.get('totalPrice')}원")
                print(f"  - busCount: {info.get('busCount')}")
                print(f"  - subwayCount: {info.get('subwayCount')}")
                print(f"  - transferCount: {info.get('transferCount')}")
                print(f"  - legs 개수: {len(path.get('legs', []))}")

            # 파싱된 응답
            print("\n" + "=" * 70)
            print("✅ 파싱된 응답:\n")
            parsed = client.parse_route_info(response)
            client.print_route_summary(parsed.get("paths", []))

        else:
            print(f"⚠️ API 오류")
            print(f"   메시지: {response.get('message', 'Unknown error')}")

    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 70)
    print("테스트 완료")
    print("=" * 70)


if __name__ == "__main__":
    # 직접 실행: python -m server.app.services.tests.test_odsay_client
    asyncio.run(manual_test())
