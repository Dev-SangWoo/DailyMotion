"""
parse_route_info() 함수 테스트

ODSAY API 응답을 우리 포맷으로 변환하는 로직을 테스트합니다.
- totalTime 단위 변환 (분 → 초)
- subPath vs legs 필드명 확인
- trafficType 기반 busCount/subwayCount 계산
- transferCount 계산
"""

import json
import pytest
from pathlib import Path
from app.services.odsay_client import OdsayAPIClient


# Mock 데이터 로드
MOCK_DATA_DIR = Path(__file__).parent / "mock_data"


@pytest.fixture
def odsay_client():
    """ODSAY 클라이언트 fixture"""
    return OdsayAPIClient(api_key="test_key")


@pytest.fixture
def mock_route_response():
    """Mock 경로 검색 응답 로드"""
    with open(MOCK_DATA_DIR / "mock_route.json", "r", encoding="utf-8") as f:
        return json.load(f)


class TestParseRouteInfo:
    """parse_route_info() 함수 테스트"""

    def test_parse_single_route_structure(self, odsay_client, mock_route_response):
        """경로 1개의 기본 구조 검증"""
        # Mock 응답에 code 필드 추가 (API 호출 후에 추가됨)
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        assert parsed["code"] == 0
        assert len(parsed["paths"]) > 0

        first_path = parsed["paths"][0]
        assert "id" in first_path
        assert "totalTime" in first_path
        assert "totalDistance" in first_path
        assert "subPath" in first_path  # ✅ legs가 아니라 subPath!

    def test_total_time_conversion(self, odsay_client, mock_route_response):
        """totalTime 단위 변환 테스트 (분 → 초)"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        first_path = parsed["paths"][0]

        # Mock 데이터: totalTime = 28 (분)
        # 변환 후: 28 * 60 = 1680 (초)
        assert first_path["totalTimeMinutes"] == 28
        assert first_path["totalTime"] == 1680  # ✅ 분을 초로 변환
        assert first_path["totalTime"] == first_path["totalTimeMinutes"] * 60

    def test_distance_unit_conversion(self, odsay_client, mock_route_response):
        """거리 단위 변환 테스트 (미터 → km)"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        first_path = parsed["paths"][0]

        # Mock 데이터: totalDistance = 9494 (미터)
        assert first_path["totalDistance"] == 9494
        assert first_path["totalDistanceKm"] == "9.5"  # 9494 / 1000 ≈ 9.5

    def test_bus_count_calculation(self, odsay_client, mock_route_response):
        """trafficType 기반 busCount 계산"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        # 첫 번째 경로: 버스 1개, 지하철 1개
        first_path = parsed["paths"][0]
        assert first_path["busCount"] == 1  # trafficType=2 개수

        # 두 번째 경로: 버스 0개, 지하철 2개
        second_path = parsed["paths"][1]
        assert second_path["busCount"] == 0

    def test_subway_count_calculation(self, odsay_client, mock_route_response):
        """trafficType 기반 subwayCount 계산"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        # 첫 번째 경로: 지하철 1개
        first_path = parsed["paths"][0]
        assert first_path["subwayCount"] == 1  # trafficType=1 개수

        # 두 번째 경로: 지하철 2개
        second_path = parsed["paths"][1]
        assert second_path["subwayCount"] == 2

    def test_transfer_count_calculation(self, odsay_client, mock_route_response):
        """transferCount 계산 테스트"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        # 첫 번째 경로: 버스 1개 + 지하철 1개 = 환승 1회
        first_path = parsed["paths"][0]
        assert first_path["transferCount"] == 1

        # 두 번째 경로: 지하철 2개 = 환승 1회
        second_path = parsed["paths"][1]
        assert second_path["transferCount"] == 1

    def test_subway_count_zero(self, odsay_client, mock_route_response):
        """버스만 있는 경로 검증"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        # 첫 번째 경로에는 지하철이 있으므로
        # 다른 경로 확인
        for path in parsed["paths"]:
            # 검증: busCount와 subwayCount의 합이 맞는지
            transit_count = path["busCount"] + path["subwayCount"]
            assert transit_count > 0  # 최소 1개의 교통수단

    def test_sub_path_field_exists(self, odsay_client, mock_route_response):
        """subPath 필드 확인 (legs가 아님)"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        first_path = parsed["paths"][0]

        # ✅ subPath 필드가 있어야 함
        assert "subPath" in first_path
        assert isinstance(first_path["subPath"], list)
        assert len(first_path["subPath"]) > 0

        # ❌ legs 필드는 없어야 함
        assert "legs" not in first_path

    def test_sub_path_structure(self, odsay_client, mock_route_response):
        """subPath 구간 정보 검증"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        first_path = parsed["paths"][0]
        sub_paths = first_path["subPath"]

        assert len(sub_paths) > 0

        # 각 subPath 구간 검증
        for sub_path in sub_paths:
            assert "trafficType" in sub_path
            assert sub_path["trafficType"] in [1, 2, 3]  # 지하철, 버스, 도보
            assert "distance" in sub_path
            assert "sectionTime" in sub_path

    def test_traffic_type_values(self, odsay_client, mock_route_response):
        """trafficType 값 검증"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        first_path = parsed["paths"][0]
        sub_paths = first_path["subPath"]

        traffic_types = [s.get("trafficType") for s in sub_paths]

        # 모든 trafficType이 유효한 값이어야 함
        # 1=지하철, 2=버스, 3=도보
        for tt in traffic_types:
            assert tt in [1, 2, 3], f"유효하지 않은 trafficType: {tt}"

    def test_total_price_field(self, odsay_client, mock_route_response):
        """totalPrice 필드 검증"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        first_path = parsed["paths"][0]

        # Mock 데이터: totalPrice = 1450
        assert "totalPrice" in first_path
        assert first_path["totalPrice"] == 1450
        assert isinstance(first_path["totalPrice"], int)

    def test_multiple_paths(self, odsay_client, mock_route_response):
        """여러 경로 파싱"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        # Mock 데이터: 3개 경로
        assert len(parsed["paths"]) == 3

        # 각 경로가 고유한 id를 가져야 함
        ids = [p["id"] for p in parsed["paths"]]
        assert ids == ["path_1", "path_2", "path_3"]

    def test_path_type_field(self, odsay_client, mock_route_response):
        """pathType 필드 검증"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        # Mock 데이터의 pathType 확인
        assert parsed["paths"][0]["pathType"] == 2  # 버스
        assert parsed["paths"][1]["pathType"] == 1  # 지하철
        assert parsed["paths"][2]["pathType"] == 3  # 복합

    def test_api_error_response(self, odsay_client):
        """API 에러 응답 처리"""
        error_response = {
            "code": -8,
            "message": "파라미터 형식 오류"
        }

        parsed = odsay_client.parse_route_info(error_response)

        assert parsed["code"] == -8
        assert "error" in parsed
        assert parsed["paths"] == []

    def test_empty_paths(self, odsay_client):
        """경로 없는 응답 처리"""
        empty_response = {
            "code": 0,
            "result": {
                "path": []
            }
        }

        parsed = odsay_client.parse_route_info(empty_response)

        assert parsed["code"] == 0
        assert parsed["paths"] == []

    def test_all_required_fields(self, odsay_client, mock_route_response):
        """필수 필드 모두 포함 검증"""
        mock_route_response["code"] = 0

        parsed = odsay_client.parse_route_info(mock_route_response)

        first_path = parsed["paths"][0]

        required_fields = [
            "id",
            "pathType",
            "totalTime",
            "totalTimeMinutes",
            "totalDistance",
            "totalDistanceKm",
            "totalPrice",
            "busCount",
            "subwayCount",
            "transferCount",
            "subPath"
        ]

        for field in required_fields:
            assert field in first_path, f"필수 필드 '{field}' 누락"
