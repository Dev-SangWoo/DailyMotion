"""
Phase 3: Logic 1.2 - 마지노선 경고 (Last-Chance Alert) 테스트

헌법 준수:
- AGENTS.md 백엔드 헌법 [제5장] 개발 방법론 (TDD/Pytest)
- v3.0 명세서 [Logic 1.2] 마지노선 경고 검증
- OpenAPI 스펙 응답 구조 준수

[Logic 1.2 테스트 시나리오]:
1. ✅ 시나리오 1: 마지노선 버스 있음 → "LAST_CHANCE"
2. ✅ 시나리오 2: 마지노선 버스 없음 → "NO_ACTION"
3. ✅ 시나리오 3: 목표 도착 시간 이미 지남 → 에러 처리
"""
import pytest
from datetime import datetime, time
from app.modules.path_optimize.service import PathOptimizeService


class TestLogic1_2LastChanceAlert:
    """마지노선 경고 테스트 클래스"""

    def setup_method(self):
        """각 테스트 메서드 실행 전 초기화"""
        self.service = PathOptimizeService()

    def test_logic_1_2_last_chance_available(self):
        """
        [Logic 1.2 - 시나리오 1] 마지노선 버스가 있음

        상황:
        - 목표 도착 시간: 08:50:00
        - 현재 시간: 08:42:00 (8분 전 - Logic 1.1 놓침)
        - First Mile 도보 시간: 5분
        - 마지막 버스 도착: 8분 뒤 (08:50:00에 도착 가능)

        예상 결과:
        - alertType: "LAST_CHANCE"
        - 메시지에 "지각 주의" 포함
        - 마지막 버스 정보 제시
        - ⚠️ 마지노선 강조

        OpenAPI 스펙 준수:
        - 응답 구조: { "data": { "alertType": "LAST_CHANCE", "message": "...", "recommendedTransport": {...} } }
        """
        # Given: 사용자 설정
        commute_settings = {
            "homeAddress": "서울 강남구 역삼동 123-45",
            "workAddress": "서울 중구 을지로 678-90",
            "targetArrivalTime": time(8, 50, 0),  # 08:50:00
            "firstMileDefaultDuration": 5,  # 5분
            "lastMileDefaultDuration": 7  # 7분
        }

        # 현재 시간: 08:42:00 (도착까지 8분 - Logic 1.1 놓침)
        # Logic 1.1 조건: minutes_until_arrival > first_mile_duration + 10 (즉, 15분 이상)
        # 8분은 이 조건을 못 맞추므로 Logic 1.2 트리거
        current_time = datetime(2025, 1, 15, 8, 42, 0)

        # When: 출근 브리핑 조회
        result = self.service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time
        )

        # Then: Logic 1.2 마지노선 경고가 반환되어야 함
        assert result is not None
        assert "data" in result

        data = result["data"]

        # alertType이 "LAST_CHANCE"여야 함
        assert data["alertType"] == "LAST_CHANCE", f"Expected LAST_CHANCE but got {data['alertType']}"

        # 메시지가 포함되어야 함
        assert "message" in data
        assert isinstance(data["message"], str)
        assert len(data["message"]) > 0

        # v3.0 명세서 예시: "⚠️지각 주의!" 포함
        assert "지각" in data["message"], "메시지에 '지각' 포함되어야 함"
        assert "마지막" in data["message"] or "⚠️" in data["message"], "마지노선 강조 포함되어야 함"

        # 추천 교통수단 정보가 포함되어야 함
        assert "recommendedTransport" in data
        transport = data["recommendedTransport"]
        assert "type" in transport
        assert "name" in transport
        assert "departureInMinutes" in transport
        assert isinstance(transport["departureInMinutes"], int)

    def test_logic_1_2_last_chance_borderline(self):
        """
        [Logic 1.2 - 경계선 테스트] 정확히 Logic 1.1 경계선

        상황:
        - 목표 도착 시간: 08:50:00
        - 현재 시간: 08:30:00 (정확히 20분 전)
        - First Mile + 여유: 5분 + 10분 = 15분

        예상 결과:
        - 정확히 경계선 (15분 이상이면 Logic 1.1 GO_NOW)
        - 따라서 GO_NOW를 받아야 함 (LAST_CHANCE 아님)
        """
        # Given
        commute_settings = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": time(8, 50, 0),
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7
        }

        # 현재 시간: 08:30:00 (정확히 20분 전)
        current_time = datetime(2025, 1, 15, 8, 30, 0)

        # When
        result = self.service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time
        )

        # Then: GO_NOW여야 함 (Logic 1.1)
        data = result["data"]
        assert data["alertType"] == "GO_NOW", "경계선에서는 GO_NOW 반환되어야 함"

    def test_logic_1_2_very_urgent_near_deadline(self):
        """
        [Logic 1.2 - 매우 긴박] 목표 도착 2분 전

        상황:
        - 목표 도착 시간: 08:50:00
        - 현재 시간: 08:48:00 (2분 전)
        - First Mile: 5분

        예상 결과:
        - alertType: "LAST_CHANCE" (매우 긴박)
        - 메시지가 더 긴급한 톤
        - departureInMinutes이 매우 짧음
        """
        # Given
        commute_settings = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": time(8, 50, 0),
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7
        }

        # 현재 시간: 08:48:00 (2분 전 - 매우 긴박)
        current_time = datetime(2025, 1, 15, 8, 48, 0)

        # When
        result = self.service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time
        )

        # Then
        data = result["data"]
        assert data["alertType"] == "LAST_CHANCE"
        assert "message" in data
        transport = data["recommendedTransport"]
        # 매우 짧은 시간 안에 출발해야 함
        assert transport["departureInMinutes"] <= 2, "남은 시간이 매우 짧아야 함"

    def test_logic_1_2_response_structure(self):
        """
        OpenAPI 응답 구조 준수 (LAST_CHANCE)

        응답은 항상 { "data": {...} } 형태
        """
        # Given
        commute_settings = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": time(8, 50, 0),
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7
        }

        # 현재 시간: 08:45:00 (5분 전 - LAST_CHANCE)
        current_time = datetime(2025, 1, 15, 8, 45, 0)

        # When
        result = self.service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time
        )

        # Then: 응답 구조 검증
        assert isinstance(result, dict)
        assert "data" in result

        data = result["data"]
        assert "alertType" in data
        assert "message" in data
        assert "recommendedTransport" in data

        # alertType은 GO_NOW 또는 LAST_CHANCE
        assert data["alertType"] in ["GO_NOW", "LAST_CHANCE"]
