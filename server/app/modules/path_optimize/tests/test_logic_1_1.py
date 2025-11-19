"""
Phase 2: Logic 1.1 - 능동적 출발 알림 (Proactive Departure Alert) 테스트

헌법 준수:
- AGENTS.md 백엔드 헌법 [제5장] 개발 방법론 (TDD/Pytest)
- v3.0 명세서 [Logic 1.1] 출발 알림 검증
- OpenAPI 스펙 GET /v1/briefings/commute 응답 구조 준수

[Logic 1.1 테스트 시나리오]:
1. ✅ 시나리오 1: 여유 있음 (도착까지 20분 이상) → "GO_NOW"
2. ⏳ 시나리오 2: 시간 얇음 (도착까지 10분 이상 20분 미만) → "GO_NOW" (조건부)
3. ⏳ 시나리오 3: 이미 지남 (도착 시간 초과) → "NO_ACTION" 또는 에러
"""
import pytest
from datetime import datetime, time
from app.modules.path_optimize.service import PathOptimizeService


class TestPathOptimizeService:
    """경로 최적화 서비스 테스트 클래스"""

    def setup_method(self):
        """각 테스트 메서드 실행 전 초기화"""
        self.service = PathOptimizeService()

    def test_get_commute_briefing_logic_1_1_go_now_plenty_time(self):
        """
        [Logic 1.1 - 시나리오 1] 여유 있음 (도착까지 20분 이상)

        상황:
        - 목표 도착 시간: 08:50:00
        - 현재 시간: 08:30:00 (20분 전)
        - First Mile 도보 시간: 5분

        예상 결과:
        - alertType: "GO_NOW"
        - 메시지에 목표 시간과 교통수단 포함
        - 추천 교통수단 정보 완전함

        OpenAPI 스펙 준수:
        - 응답 구조: { "data": { "alertType": "GO_NOW", "message": "...", "recommendedTransport": {...} } }
        """
        # Given: 사용자 설정
        commute_settings = {
            "homeAddress": "서울 강남구 역삼동 123-45",
            "workAddress": "서울 중구 을지로 678-90",
            "targetArrivalTime": time(8, 50, 0),  # 08:50:00
            "firstMileDefaultDuration": 5,  # 5분
            "lastMileDefaultDuration": 7  # 7분
        }

        # 현재 시간: 08:30:00 (목표 도착 시간보다 20분 전)
        current_time = datetime(2025, 1, 15, 8, 30, 0)

        # When: 출근 브리핑 조회
        result = self.service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time
        )

        # Then: Logic 1.1 출발 알림이 반환되어야 함
        assert result is not None
        assert "data" in result

        data = result["data"]

        # OpenAPI 스펙 준수: alertType이 "GO_NOW"여야 함
        assert data["alertType"] == "GO_NOW"

        # 메시지가 포함되어야 함
        assert "message" in data
        assert isinstance(data["message"], str)
        assert len(data["message"]) > 0
        # v3.0 명세서 예시 메시지 형식 검증
        assert "8:50" in data["message"]  # 목표 도착 시간 포함
        assert "버스" in data["message"] or "지하철" in data["message"]  # 교통수단 포함

        # 추천 교통수단 정보가 포함되어야 함
        assert "recommendedTransport" in data
        transport = data["recommendedTransport"]
        assert "type" in transport
        assert "name" in transport
        assert "departureInMinutes" in transport
        assert isinstance(transport["departureInMinutes"], int)
        assert transport["departureInMinutes"] > 0

    def test_get_commute_briefing_logic_1_1_go_now_very_soon(self):
        """
        [Logic 1.1 - 시나리오 1 추가] 매우 긴박한 상황

        상황:
        - 목표 도착 시간: 08:50:00
        - 현재 시간: 08:35:00 (15분 전)
        - First Mile 도보 시간: 5분

        예상 결과:
        - alertType: "GO_NOW" (여전히 GO_NOW, 하지만 긴박함)
        - 추천 교통수단의 departureInMinutes가 더 짧음
        """
        # Given
        commute_settings = {
            "homeAddress": "서울 강남구 역삼동 123-45",
            "workAddress": "서울 중구 을지로 678-90",
            "targetArrivalTime": time(8, 50, 0),
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7
        }

        # 현재 시간: 08:35:00 (목표 도착 시간보다 15분 전 - 더 긴박함)
        current_time = datetime(2025, 1, 15, 8, 35, 0)

        # When
        result = self.service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time
        )

        # Then
        assert result is not None
        data = result["data"]
        assert data["alertType"] == "GO_NOW"
        assert "message" in data
        assert "recommendedTransport" in data

    def test_get_commute_briefing_response_structure_compliance(self):
        """
        OpenAPI 응답 구조 준수 검증

        응답은 항상 { "data": {...} } 형태여야 함
        """
        # Given
        commute_settings = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": time(8, 50, 0),
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7
        }
        current_time = datetime(2025, 1, 15, 8, 30, 0)

        # When
        result = self.service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time
        )

        # Then: 응답 구조 검증
        assert isinstance(result, dict), "응답은 dict 타입이어야 함"
        assert "data" in result, "응답에 'data' 키가 있어야 함"

        data = result["data"]
        assert "alertType" in data, "alertType이 포함되어야 함"
        assert "message" in data, "message가 포함되어야 함"
        assert "recommendedTransport" in data, "recommendedTransport가 포함되어야 함"

    def test_get_commute_briefing_first_mile_calculation(self):
        """
        First Mile 도보 시간이 정확히 반영되는지 검증

        v3.0 명세서: First Mile 도보 시간을 계산하여 푸시 알림
        """
        # Given: First Mile이 10분인 경우
        commute_settings = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": time(8, 50, 0),
            "firstMileDefaultDuration": 10,  # 10분으로 설정
            "lastMileDefaultDuration": 7
        }
        current_time = datetime(2025, 1, 15, 8, 30, 0)

        # When
        result = self.service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time
        )

        # Then: First Mile이 메시지에 반영되어야 함
        data = result["data"]
        assert "10" in data["message"], "메시지에 First Mile 시간(10분)이 포함되어야 함"

        # departureInMinutes는 "집에서 출발까지 남은 시간"이므로 0 이상이어야 함
        transport = data["recommendedTransport"]
        assert transport["departureInMinutes"] >= 0, "출발까지 남은 시간은 0분 이상이어야 함"


class TestPathOptimizeServiceCongestion:
    """
    혼잡도 데이터가 추천 교통수단에 포함된 경우
    GO_NOW/LAST_CHANCE 메시지에 혼잡도 텍스트가 붙는지 검증
    """

    class _DummyServiceWithCongestion(PathOptimizeService):
        def _extract_recommended_transport(  # type: ignore[override]
            self,
            routes_data,
            current_time,
            commute_settings=None,
            statistical_data_map=None,
        ):
            return {
                "type": "SUBWAY",
                "name": "3호선",
                "lineNumber": "3호선",
                "destination": "상행",
                "departureInMinutes": 5,
                "transitTimeMinutes": 20,
                "isRealtime": False,
                "congestionValue": 85.0,
                "congestionLevel": "HIGH",
            }

    def test_go_now_message_includes_congestion_suffix(self):
        """
        [Logic 1.1] GO_NOW 메시지에 혼잡도 정보가 포함되는지 확인
        """
        service = self._DummyServiceWithCongestion()

        commute_settings = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": time(8, 50, 0),
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7,
        }
        current_time = datetime(2025, 1, 15, 8, 20, 0)

        result = service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time,
        )

        data = result["data"]
        assert data["alertType"] == "GO_NOW"
        # 혼잡도 텍스트가 메시지에 포함되어야 함
        assert "혼잡도" in data["message"]
        assert "85%" in data["message"]


class TestDepartureInMinutesWithRealtime:
    """
    departureInMinutes가 '집에서 출발까지 남은 시간'으로 계산되는지 검증
    """

    class _DummyServiceForDeparture(PathOptimizeService):
        def _extract_recommended_transport(  # type: ignore[override]
            self,
            routes_data,
            current_time,
            commute_settings=None,
            statistical_data_map=None,
        ):
            return {
                "type": "SUBWAY",
                "name": "2호선",
                "lineNumber": "2호선",
                "destination": "상행",
                # 정류장/역 기준 차량 도착까지 15분 남음
                "departureInMinutes": 15,
                "transitTimeMinutes": 25,
                "isRealtime": True,
            }

    def test_departure_in_minutes_respects_first_mile(self):
        """
        실시간 ETA(정류장까지 15분)와 First Mile(5분)이 주어졌을 때,
        departureInMinutes가 (15 - 5) = 10분으로 계산되는지 확인
        """
        service = self._DummyServiceForDeparture()

        commute_settings = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": time(9, 0, 0),
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7,
        }
        current_time = datetime(2025, 1, 15, 8, 30, 0)

        result = service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time,
        )

        transport = result["data"]["recommendedTransport"]
        assert transport["departureInMinutes"] == 10

    def test_eta_fallback_suffix_for_statistical(self):
        """
        통계 기반 ETA를 사용할 때 메시지에 Fallback 안내 문구가 포함되는지 확인
        """

        class _DummyServiceWithStatFallback(PathOptimizeService):
            def _extract_recommended_transport(  # type: ignore[override]
                self,
                routes_data,
                current_time,
                commute_settings=None,
                statistical_data_map=None,
            ):
                return {
                    "type": "SUBWAY",
                    "name": "2호선",
                    "lineNumber": "2호선",
                    "destination": "상행",
                    "departureInMinutes": 10,
                    "transitTimeMinutes": 20,
                    "isRealtime": False,
                    "etaSource": "STATISTICAL",
                }

        service = _DummyServiceWithStatFallback()

        commute_settings = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": time(9, 0, 0),
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7,
        }
        current_time = datetime(2025, 1, 15, 8, 30, 0)

        result = service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time,
        )

        message = result["data"]["message"]
        assert "실시간 정보 없음" in message
        assert "평균 소요시간" in message
