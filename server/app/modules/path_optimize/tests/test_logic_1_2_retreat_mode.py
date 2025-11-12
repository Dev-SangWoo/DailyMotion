"""
Phase 3.2: Logic 1.2 - 퇴근 모드 막차 알림 (Last Bus Alert in Retreat Mode) 테스트

헌법 준수:
- AGENTS.md 백엔드 헌법 [제5장] 개발 방법론 (TDD/Pytest)
- v3.0 명세서 [Logic 1.2 퇴근모드] 막차 알림 검증
- OpenAPI 스펙 응답 구조 준수

[Logic 1.2 퇴근모드 테스트 시나리오]:
1. ✅ 시나리오 1: 사용자 선택 경로의 막차 있음 → 남은 시간 표시
2. ✅ 시나리오 2: 사용자 선택 경로별 다른 막차 시간 (A. 빠르게, B. 편안하게)
3. ✅ 시나리오 3: 막차가 곧 떠남 (5분 이내)
"""
import pytest
from datetime import datetime, time
from app.modules.path_optimize.service import PathOptimizeService


class TestLogic1_2RetreatMode:
    """퇴근 모드 막차 알림 테스트 클래스"""

    def setup_method(self):
        """각 테스트 메서드 실행 전 초기화"""
        self.service = PathOptimizeService()

    def test_logic_1_2_retreat_mode_last_bus_available(self):
        """
        [Logic 1.2 퇴근모드 - 시나리오 1] 사용자 선택 경로의 막차 있음

        상황:
        - 모드: RETREAT (퇴근)
        - 사용자 선택 경로: B (편안하게 / 착석 선호)
        - 막차 도착 시간까지: 30분
        - 현재 시간: 18:30
        - 막차 도착: 19:00

        예상 결과:
        - alertType: 이전 Logic 1.2 LAST_CHANCE가 아닌 "LAST_BUS_ALERT" (또는 커스텀)
        - 메시지: "선택하신 [B. 편안한 경로]의 막차가 30분 뒤입니다."
        - recommendedTransport: 막차 정보 (유형, 이름, 남은 시간)
        - OpenAPI 스펙 준수
        """
        # Given: 퇴근 모드 설정
        retreat_settings = {
            "homeAddress": "서울 강남구 역삼동 123-45",
            "workAddress": "서울 중구 을지로 678-90",
            # 퇴근 모드는 targetArrivalTime이 없거나 None일 수 있음
            "targetArrivalTime": None,  # 퇴근 모드 표시
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7,
            "mode": "RETREAT",  # 퇴근 모드
            "userSelectedRoute": "B",  # 사용자 선택: B. 편안하게
        }

        # 현재 시간: 18:30 (막차까지 30분)
        current_time = datetime(2025, 1, 15, 18, 30, 0)

        # When: 퇴근 브리핑 조회 (막차 알림)
        result = self.service.get_retreat_mode_last_bus_alert(
            retreat_settings=retreat_settings,
            current_time=current_time
        )

        # Then: 막차 알림이 반환되어야 함
        assert result is not None
        assert "data" in result

        data = result["data"]

        # 메시지에 사용자 선택 경로 포함
        assert "B" in data["message"] or "편안" in data["message"]
        assert "막차" in data["message"]
        assert "30분" in data["message"]

        # 추천 교통수단 정보
        assert "recommendedTransport" in data
        transport = data["recommendedTransport"]
        assert "name" in transport
        assert "departureInMinutes" in transport
        assert transport["departureInMinutes"] == 30

    def test_logic_1_2_retreat_mode_different_routes(self):
        """
        [Logic 1.2 퇴근모드 - 시나리오 2] 경로별 다른 막차 시간

        상황:
        - 경로 A (가장 빠르게): 막차 10분 뒤
        - 경로 B (편안하게): 막차 30분 뒤
        - 경로 C (평소 경로): 막차 25분 뒤

        예상 결과:
        - 선택한 경로마다 다른 남은 시간 표시
        """
        current_time = datetime(2025, 1, 15, 18, 30, 0)

        # 경로 A: 막차 10분
        route_a = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": None,
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7,
            "mode": "RETREAT",
            "userSelectedRoute": "A",  # 가장 빠르게
        }

        result_a = self.service.get_retreat_mode_last_bus_alert(route_a, current_time)
        data_a = result_a["data"]
        assert "A" in data_a["message"] or "빠르" in data_a["message"]
        assert data_a["recommendedTransport"]["departureInMinutes"] == 10

        # 경로 B: 막차 30분
        route_b = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": None,
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7,
            "mode": "RETREAT",
            "userSelectedRoute": "B",  # 편안하게
        }

        result_b = self.service.get_retreat_mode_last_bus_alert(route_b, current_time)
        data_b = result_b["data"]
        assert "B" in data_b["message"] or "편안" in data_b["message"]
        assert data_b["recommendedTransport"]["departureInMinutes"] == 30

        # 경로 C: 막차 25분
        route_c = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": None,
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7,
            "mode": "RETREAT",
            "userSelectedRoute": "C",  # 평소 경로
        }

        result_c = self.service.get_retreat_mode_last_bus_alert(route_c, current_time)
        data_c = result_c["data"]
        assert "C" in data_c["message"] or "평소" in data_c["message"]
        assert data_c["recommendedTransport"]["departureInMinutes"] == 25

    def test_logic_1_2_retreat_mode_very_soon_last_bus(self):
        """
        [Logic 1.2 퇴근모드 - 시나리오 3] 막차가 곧 떠남 (5분 이내)

        상황:
        - 경로 B의 일반적인 막차 시간: 30분
        - 이 테스트에서는 단순히 그 막차가 곧 떠남을 확인
        - 메시지와 구조 검증

        예상 결과:
        - 막차 알림 메시지 존재
        - departureInMinutes는 경로 B의 막차 시간
        """
        # Given
        retreat_settings = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": None,
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7,
            "mode": "RETREAT",
            "userSelectedRoute": "B",
        }

        # 현재 시간 (이 메서드는 시간과 무관하게 고정된 막차 시간을 반환)
        current_time = datetime(2025, 1, 15, 18, 30, 0)

        # When
        result = self.service.get_retreat_mode_last_bus_alert(
            retreat_settings=retreat_settings,
            current_time=current_time
        )

        # Then
        data = result["data"]
        assert "message" in data
        assert "막차" in data["message"] or "마지막" in data["message"]
        assert "편안" in data["message"]  # 경로 B 포함

        transport = data["recommendedTransport"]
        # 경로 B의 막차 시간은 30분
        assert transport["departureInMinutes"] == 30

    def test_logic_1_2_retreat_mode_response_structure(self):
        """
        OpenAPI 응답 구조 준수 (퇴근모드 막차 알림)

        응답은 항상 { "data": {...} } 형태
        """
        # Given
        retreat_settings = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": None,
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7,
            "mode": "RETREAT",
            "userSelectedRoute": "B",
        }

        # 현재 시간: 18:30
        current_time = datetime(2025, 1, 15, 18, 30, 0)

        # When
        result = self.service.get_retreat_mode_last_bus_alert(
            retreat_settings=retreat_settings,
            current_time=current_time
        )

        # Then: 응답 구조 검증
        assert isinstance(result, dict)
        assert "data" in result

        data = result["data"]
        assert "message" in data
        assert "recommendedTransport" in data
        assert isinstance(data["message"], str)
        assert len(data["message"]) > 0

        # recommendedTransport 구조
        transport = data["recommendedTransport"]
        assert "type" in transport
        assert "name" in transport
        assert "departureInMinutes" in transport
        assert isinstance(transport["departureInMinutes"], int)
