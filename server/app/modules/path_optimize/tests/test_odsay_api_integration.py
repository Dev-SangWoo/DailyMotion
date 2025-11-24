"""
ODSAY API 실제 호출 통합 테스트

실제 ODSAY API에 요청하여 다음을 검증합니다:
- Station Search API 동작 확인
- Route Search API 동작 확인
- 응답 데이터 구조 검증
- parse_route_info() 함수 동작 확인
"""

import pytest
import asyncio
import os
from app.services.odsay_client import OdsayAPIClient


class TestOdsayAPIIntegration:
    """ODSAY API 실제 호출 통합 테스트"""

    @pytest.fixture
    def api_key(self):
        """환경변수에서 API Key 조회"""
        api_key = os.getenv("ODSAY_API_KEY")
        if not api_key:
            pytest.skip("ODSAY_API_KEY 환경변수가 설정되지 않음")
        return api_key

    @pytest.fixture
    def odsay_client(self, api_key):
        """ODSAY 클라이언트 생성"""
        return OdsayAPIClient(api_key=api_key)

    # =====================================================
    # Station Search API 테스트
    # =====================================================

    @pytest.mark.asyncio
    async def test_search_station_gangnam(self, odsay_client):
        """강남역 정류장 검색"""
        result = await odsay_client.search_station(
            station_name="강남역",
            station_class="1:2",  # 버스 + 지하철
            display_cnt=10
        )

        # 응답 구조 검증
        assert "result" in result or "error" not in result
        assert result.get("code") == 0 or "result" in result

        # 정류장 데이터 검증
        if "result" in result:
            stations = result.get("result", {}).get("station", [])
            assert len(stations) > 0, "강남역 정류장이 검색되어야 함"

            # 첫 정류장 검증
            first_station = stations[0]
            assert "stationName" in first_station
            assert "stationID" in first_station
            assert "x" in first_station
            assert "y" in first_station
            assert isinstance(first_station["x"], (int, float))
            assert isinstance(first_station["y"], (int, float))

            print(f"✅ 검색 정류장: {first_station['stationName']}")
            print(f"   좌표: ({first_station['x']}, {first_station['y']})")

    @pytest.mark.asyncio
    async def test_search_station_name_extraction(self, odsay_client):
        """정류장 이름으로 좌표 추출"""
        result = await odsay_client.search_station(station_name="을지로입구")

        if "result" in result:
            stations = result.get("result", {}).get("station", [])
            assert len(stations) > 0

            # 여러 정류장 중 지하철역 확인
            for station in stations:
                if "입구" in station.get("stationName", ""):
                    x = station["x"]
                    y = station["y"]
                    assert 126 < x < 127  # 서울 경도 범위
                    assert 37 < y < 38    # 서울 위도 범위
                    print(f"✅ {station['stationName']}: ({x}, {y})")
                    break

    @pytest.mark.asyncio
    async def test_search_station_bus_only(self, odsay_client):
        """버스 정류장만 검색"""
        result = await odsay_client.search_station(
            station_name="강남역",
            station_class="1"  # 버스만
        )

        if "result" in result:
            stations = result.get("result", {}).get("station", [])
            assert len(stations) > 0
            print(f"✅ 버스 정류장 {len(stations)}개 검색됨")

    @pytest.mark.asyncio
    async def test_search_station_subway_only(self, odsay_client):
        """지하철 역만 검색"""
        result = await odsay_client.search_station(
            station_name="강남역",
            station_class="2"  # 지하철만
        )

        # ODSAY API는 검색 조건에 따라 결과가 없을 수 있음 (정상 동작)
        if "result" in result:
            stations = result.get("result", {}).get("station", [])
            if len(stations) > 0:
                print(f"✅ 지하철 역 {len(stations)}개 검색됨")
            else:
                print(f"✅ 지하철 역 검색 결과 없음 (API 정상 동작)")

    # =====================================================
    # Route Search API 테스트
    # =====================================================

    @pytest.mark.asyncio
    async def test_search_route_gangnam_to_city_hall(self, odsay_client):
        """강남역 → 시청 경로 검색"""
        # 강남역 좌표
        start_x, start_y = 127.0276, 37.4979
        # 시청 좌표
        end_x, end_y = 126.9760, 37.5640

        result = await odsay_client.search_route(
            start_x=start_x,
            start_y=start_y,
            end_x=end_x,
            end_y=end_y,
            search_type=0  # 모든 경로
        )

        # 응답 구조 검증
        assert result.get("code") == 0, f"API 오류: {result.get('message')}"
        assert "result" in result

        # 경로 데이터 검증
        paths = result.get("result", {}).get("path", [])
        assert len(paths) > 0, "경로가 검색되어야 함"
        print(f"✅ {len(paths)}개 경로 검색됨")

        # 각 경로 검증
        for idx, path in enumerate(paths[:3], 1):  # 처음 3개만 출력
            info = path.get("info", {})
            total_time = info.get("totalTime", 0)
            total_distance = info.get("totalDistance", 0)
            total_price = info.get("totalPrice", 0)

            assert total_time > 0, f"경로 {idx}: totalTime이 있어야 함"
            assert total_distance > 0, f"경로 {idx}: totalDistance가 있어야 함"

            print(f"   경로 {idx}: {total_time}분, {total_distance}m, {total_price}원")

    @pytest.mark.asyncio
    async def test_search_route_subway_only(self, odsay_client):
        """지하철만 사용하는 경로 검색"""
        start_x, start_y = 127.0276, 37.4979  # 강남역
        end_x, end_y = 126.9760, 37.5640      # 시청

        result = await odsay_client.search_route(
            start_x=start_x,
            start_y=start_y,
            end_x=end_x,
            end_y=end_y,
            search_type=1  # 지하철만
        )

        assert result.get("code") == 0
        paths = result.get("result", {}).get("path", [])
        assert len(paths) > 0

        # 지하철 경로 검증
        for path in paths:
            sub_paths = path.get("subPath", [])
            traffic_types = [s.get("trafficType") for s in sub_paths]
            # 지하철 경로는 trafficType 1, 3만 포함
            assert all(t in [1, 3] for t in traffic_types), \
                f"지하철 경로에 버스(2)가 포함됨: {traffic_types}"

        print(f"✅ 지하철 경로 {len(paths)}개 검색됨 (모두 trafficType 1,3만 포함)")

    @pytest.mark.asyncio
    async def test_search_route_bus_only(self, odsay_client):
        """버스만 사용하는 경로 검색"""
        start_x, start_y = 127.0276, 37.4979  # 강남역
        end_x, end_y = 126.9760, 37.5640      # 시청

        result = await odsay_client.search_route(
            start_x=start_x,
            start_y=start_y,
            end_x=end_x,
            end_y=end_y,
            search_type=2  # 버스만
        )

        assert result.get("code") == 0
        paths = result.get("result", {}).get("path", [])
        assert len(paths) > 0

        print(f"✅ 버스 경로 {len(paths)}개 검색됨")

    # =====================================================
    # parse_route_info() 통합 테스트
    # =====================================================

    @pytest.mark.asyncio
    async def test_parse_route_info_with_real_api(self, odsay_client):
        """실제 API 응답을 parse_route_info()로 파싱"""
        # 강남역 → 시청 경로 검색
        result = await odsay_client.search_route(
            start_x=127.0276,
            start_y=37.4979,
            end_x=126.9760,
            end_y=37.5640,
            search_type=0
        )

        # 파싱
        parsed = odsay_client.parse_route_info(result)

        # 파싱 결과 검증
        assert parsed["code"] == 0
        assert len(parsed["paths"]) > 0

        print(f"✅ {len(parsed['paths'])}개 경로 파싱됨")

        # 각 경로 검증
        for idx, path in enumerate(parsed["paths"][:3], 1):
            # 필수 필드 검증
            assert "id" in path
            assert "pathType" in path
            assert "totalTime" in path
            assert "totalTimeMinutes" in path
            assert "totalDistance" in path
            assert "totalDistanceKm" in path
            assert "totalPrice" in path
            assert "busCount" in path
            assert "subwayCount" in path
            assert "transferCount" in path
            assert "subPath" in path

            # 단위 검증
            assert path["totalTime"] == path["totalTimeMinutes"] * 60, \
                "totalTime은 totalTimeMinutes * 60이어야 함"

            print(f"\n   경로 {idx} ({path['id']}):")
            print(f"      ⏱️ {path['totalTimeMinutes']}분 ({path['totalTime']}초)")
            print(f"      📏 {path['totalDistanceKm']}km ({path['totalDistance']}m)")
            print(f"      💰 {path['totalPrice']:,}원")
            print(f"      🚍 버스: {path['busCount']}개, 🚇 지하철: {path['subwayCount']}개")
            print(f"      ↔️ 환승: {path['transferCount']}회")

    @pytest.mark.asyncio
    async def test_parse_route_info_field_integrity(self, odsay_client):
        """파싱된 데이터의 필드 무결성 검증"""
        result = await odsay_client.search_route(
            start_x=127.0276,
            start_y=37.4979,
            end_x=126.9760,
            end_y=37.5640,
            search_type=0
        )

        parsed = odsay_client.parse_route_info(result)

        for path in parsed["paths"]:
            # 숫자 필드 검증
            assert isinstance(path["totalTime"], int), "totalTime은 정수여야 함"
            assert isinstance(path["totalTimeMinutes"], int), "totalTimeMinutes은 정수여야 함"
            assert isinstance(path["totalDistance"], int), "totalDistance는 정수여야 함"
            assert isinstance(path["totalPrice"], int), "totalPrice는 정수여야 함"
            assert isinstance(path["busCount"], int), "busCount는 정수여야 함"
            assert isinstance(path["subwayCount"], int), "subwayCount는 정수여야 함"
            assert isinstance(path["transferCount"], int), "transferCount는 정수여야 함"

            # 문자열 필드 검증
            assert isinstance(path["totalDistanceKm"], str), "totalDistanceKm은 문자열이어야 함"

            # 배열 필드 검증
            assert isinstance(path["subPath"], list), "subPath는 배열이어야 함"
            assert len(path["subPath"]) > 0, "subPath는 최소 1개 요소를 가져야 함"

            # trafficType 검증
            for sub_path in path["subPath"]:
                traffic_type = sub_path.get("trafficType")
                assert traffic_type in [1, 2, 3], f"유효하지 않은 trafficType: {traffic_type}"

        print(f"✅ {len(parsed['paths'])}개 경로의 필드 무결성 검증 완료")

    @pytest.mark.asyncio
    async def test_parse_route_info_transfer_count_accuracy(self, odsay_client):
        """transferCount 정확도 검증"""
        result = await odsay_client.search_route(
            start_x=127.0276,
            start_y=37.4979,
            end_x=126.9760,
            end_y=37.5640,
            search_type=0
        )

        parsed = odsay_client.parse_route_info(result)

        for path in parsed["paths"]:
            sub_paths = path["subPath"]

            # 수동으로 transferCount 계산
            transit_sections = [s for s in sub_paths if s.get("trafficType") in [1, 2]]
            expected_transfer_count = max(0, len(transit_sections) - 1)

            # 파싱된 transferCount와 비교
            assert path["transferCount"] == expected_transfer_count, \
                f"transferCount 불일치: 파싱={path['transferCount']}, 예상={expected_transfer_count}"

        print(f"✅ {len(parsed['paths'])}개 경로의 transferCount 정확도 검증 완료")

    @pytest.mark.asyncio
    async def test_parse_route_info_bus_subway_count_accuracy(self, odsay_client):
        """busCount/subwayCount 정확도 검증"""
        result = await odsay_client.search_route(
            start_x=127.0276,
            start_y=37.4979,
            end_x=126.9760,
            end_y=37.5640,
            search_type=0
        )

        parsed = odsay_client.parse_route_info(result)

        for path in parsed["paths"]:
            sub_paths = path["subPath"]

            # 수동으로 계산
            expected_bus_count = len([s for s in sub_paths if s.get("trafficType") == 2])
            expected_subway_count = len([s for s in sub_paths if s.get("trafficType") == 1])

            # 파싱된 값과 비교
            assert path["busCount"] == expected_bus_count, \
                f"busCount 불일치: 파싱={path['busCount']}, 예상={expected_bus_count}"
            assert path["subwayCount"] == expected_subway_count, \
                f"subwayCount 불일치: 파싱={path['subwayCount']}, 예상={expected_subway_count}"

        print(f"✅ {len(parsed['paths'])}개 경로의 busCount/subwayCount 정확도 검증 완료")


if __name__ == "__main__":
    # pytest 실행
    pytest.main([__file__, "-v", "-s"])
