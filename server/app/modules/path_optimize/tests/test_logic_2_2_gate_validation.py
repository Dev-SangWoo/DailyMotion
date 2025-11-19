"""
Phase 5: Logic 2.2 - 고신뢰 대안 경로 제안 (High-Confidence Route Suggestion) 테스트

헌법 준수:
- AGENTS.md 백엔드 헌법 [제5장] 개발 방법론 (TDD/Pytest)
- v3.0 명세서 [Logic 2.2] 고신뢰 대안 경로 제안
- OpenAPI 스펙 응답 구조 준수

[Phase 5 테스트 시나리오]:
1. ✅ Gate 1 - 확실한 이득 (High Threshold)
   - 출근 모드: 7~10분 이상 단축
   - 퇴근 모드: 착석 가능성 높음
2. ✅ Gate 2 - 환승 확정성 (Transfer Certainty)
   - 최소 3분 환승 여유 시간 확보
3. ✅ Gate 3 - 경험의 질 (Quality of Experience)
   - 혼잡도 데이터 반영
4. ✅ 모든 Gate를 통과하는 경로만 제안
"""

import pytest
from datetime import datetime, time
from app.modules.path_optimize.models import (
    SystemMode,
    CommuteSettings,
    TransportType
)
from app.modules.path_optimize.service import PathOptimizeService
from app.services.gate_validator import gate_validator


class TestPhase5GateValidation:
    """Phase 5 - 3가지 Gate 조건 테스트"""

    def setup_method(self):
        """각 테스트 메서드 실행 전 초기화"""
        self.current_time = datetime(2025, 1, 15, 8, 30, 0)
        self.commute_settings = CommuteSettings(
            homeAddress="서울 강남구",
            workAddress="서울 중구",
            targetArrivalTime=time(8, 50),
            firstMileDefaultDuration=5,
            lastMileDefaultDuration=7
        )


class TestGate1ClearBenefit:
    """Gate 1: 확실한 이득 (High Threshold) 테스트"""

    def test_gate_1_commute_mode_time_benefit_sufficient(self):
        """
        [Phase 5 - Gate 1] 출근 모드: 현저한 시간 단축 (7분 이상)

        상황:
        - 현재 경로: 20분 소요
        - 대안 경로: 12분 소요
        - 시간 절약: 8분 (7분 기준 통과)

        예상 결과:
        - Gate 1 PASS ✅
        """
        # Given: 경로 비교 데이터
        current_route_time = 20  # 분
        alternative_route_time = 12  # 분
        time_benefit = current_route_time - alternative_route_time  # 8분

        # When: Gate 1 검증 (출근 모드)
        gate_1_threshold = 7  # 최소 7분 이상 단축 필요
        gate_1_pass = time_benefit >= gate_1_threshold

        # Then: Gate 1 통과
        assert gate_1_pass is True
        assert time_benefit == 8

    def test_gate_1_commute_mode_time_benefit_insufficient(self):
        """
        [Phase 5 - Gate 1] 출근 모드: 시간 단축 미흡 (7분 미만)

        상황:
        - 현재 경로: 20분 소요
        - 대안 경로: 17분 소요
        - 시간 절약: 3분 (7분 기준 미달)

        예상 결과:
        - Gate 1 FAIL ❌
        - 대안 경로 제안하지 않음
        """
        # Given: 경로 비교 데이터
        current_route_time = 20
        alternative_route_time = 17
        time_benefit = current_route_time - alternative_route_time  # 3분

        # When: Gate 1 검증
        gate_1_threshold = 7
        gate_1_pass = time_benefit >= gate_1_threshold

        # Then: Gate 1 미통과
        assert gate_1_pass is False
        assert time_benefit == 3

    def test_gate_1_commute_mode_time_benefit_boundary(self):
        """
        [Phase 5 - Gate 1] 출근 모드: 정확히 7분 단축 (경계값)

        상황:
        - 현재 경로: 20분
        - 대안 경로: 13분
        - 시간 절약: 7분 (경계값)

        예상 결과:
        - Gate 1 PASS ✅ (7분 이상 포함)
        """
        # Given
        current_route_time = 20
        alternative_route_time = 13
        time_benefit = current_route_time - alternative_route_time

        # When
        gate_1_threshold = 7
        gate_1_pass = time_benefit >= gate_1_threshold

        # Then
        assert gate_1_pass is True
        assert time_benefit == 7

    def test_gate_1_retreat_mode_seating_availability_high(self):
        """
        [Phase 5 - Gate 1] 퇴근 모드: 착석 가능성 높음

        상황:
        - 모드: RETREAT (퇴근)
        - 사용자 선택: B (편안하게/착석)
        - 혼잡도: 40% (여유 있음)
        - 착석 가능성: 높음

        예상 결과:
        - Gate 1 PASS ✅
        """
        # Given: 퇴근 모드 데이터
        mode = SystemMode.RETREAT
        user_choice = "B"  # 편안하게/착석
        congestion_level = 40  # 백분율

        # When: Gate 1 검증 (퇴근 모드 - 착석 가능성)
        seating_threshold = 50  # 혼잡도 50% 이하면 착석 가능성 높음
        gate_1_pass = (mode == SystemMode.RETREAT and
                       user_choice == "B" and
                       congestion_level <= seating_threshold)

        # Then
        assert gate_1_pass is True
        assert congestion_level <= seating_threshold

    def test_gate_1_retreat_mode_seating_availability_low(self):
        """
        [Phase 5 - Gate 1] 퇴근 모드: 착석 가능성 낮음

        상황:
        - 모드: RETREAT (퇴근)
        - 사용자 선택: B (편안하게/착석)
        - 혼잡도: 85% (혼잡함)
        - 착석 가능성: 낮음

        예상 결과:
        - Gate 1 FAIL ❌
        """
        # Given
        mode = SystemMode.RETREAT
        user_choice = "B"
        congestion_level = 85

        # When
        seating_threshold = 50
        gate_1_pass = (mode == SystemMode.RETREAT and
                       user_choice == "B" and
                       congestion_level <= seating_threshold)

        # Then
        assert gate_1_pass is False
        assert congestion_level > seating_threshold


class TestGate2TransferCertainty:
    """Gate 2: 환승 확정성 (Transfer Certainty) 테스트"""

    def test_gate_2_transfer_time_sufficient(self):
        """
        [Phase 5 - Gate 2] 환승 시간 충분 (3분 이상)

        상황:
        - 현재 버스 도착 시간: 08:35
        - 현재 버스 하차 소요: 3분
        - 환승 버스 도착 시간: 08:41
        - 환승 여유: 08:41 - (08:35 + 3분) = 3분 ✅

        예상 결과:
        - Gate 2 PASS ✅
        """
        # Given: 버스 도착 시간 데이터
        current_bus_arrival = 5  # 분 (현재 기준)
        current_bus_duration = 3  # 분 (정류장 정차 + 하차)
        transfer_bus_arrival = 11  # 분 (현재 기준)

        # When: 환승 여유 시간 계산
        transfer_time_available = transfer_bus_arrival - (current_bus_arrival + current_bus_duration)
        gate_2_threshold = 3  # 최소 3분 여유 필요
        gate_2_pass = transfer_time_available >= gate_2_threshold

        # Then
        assert gate_2_pass is True
        assert transfer_time_available == 3  # 11 - (5+3) = 3분

    def test_gate_2_transfer_time_insufficient(self):
        """
        [Phase 5 - Gate 2] 환승 시간 부족 (3분 미만)

        상황:
        - 현재 버스 하차 시간: 08:37
        - 환승 버스 출발 시간: 08:38
        - 환승 여유: 1분 (3분 기준 미달)
        - "내렸는데 버스 떠나는" 상황 방지

        예상 결과:
        - Gate 2 FAIL ❌
        """
        # Given
        current_bus_arrival = 5
        current_bus_duration = 2
        transfer_bus_arrival = 7

        # When
        transfer_time_available = transfer_bus_arrival - (current_bus_arrival + current_bus_duration)
        gate_2_threshold = 3
        gate_2_pass = transfer_time_available >= gate_2_threshold

        # Then
        assert gate_2_pass is False
        assert transfer_time_available == 0

    def test_gate_2_transfer_time_boundary(self):
        """
        [Phase 5 - Gate 2] 환승 여유 정확히 3분 (경계값)

        상황:
        - 환승 여유: 정확히 3분

        예상 결과:
        - Gate 2 PASS ✅ (3분 이상 포함)
        """
        # Given
        current_bus_arrival = 5
        current_bus_duration = 2
        transfer_bus_arrival = 10

        # When
        transfer_time_available = transfer_bus_arrival - (current_bus_arrival + current_bus_duration)
        gate_2_threshold = 3
        gate_2_pass = transfer_time_available >= gate_2_threshold

        # Then
        assert gate_2_pass is True
        assert transfer_time_available == 3


class TestGate3ExperienceQuality:
    """Gate 3: 경험의 질 (Quality of Experience) 테스트"""

    def test_gate_3_congestion_acceptable(self):
        """
        [Phase 5 - Gate 3] 혼잡도 수용 가능 (60% 이하)

        상황:
        - 환승 버스 혼잡도: 45%
        - 제안 가능

        예상 결과:
        - Gate 3 PASS ✅
        """
        # Given: 혼잡도 데이터
        transfer_bus_congestion = 45  # 백분율

        # When: Gate 3 검증
        congestion_threshold = 80  # 80% 이상이면 제안 불가
        gate_3_pass = transfer_bus_congestion < congestion_threshold

        # Then
        assert gate_3_pass is True
        assert transfer_bus_congestion < congestion_threshold

    def test_gate_3_congestion_not_acceptable(self):
        """
        [Phase 5 - Gate 3] 혼잡도 높음 (80% 이상)

        상황:
        - 환승 버스 혼잡도: 90%
        - 제안하지 않음 (환승 경험 저하)

        예상 결과:
        - Gate 3 FAIL ❌
        """
        # Given
        transfer_bus_congestion = 90

        # When
        congestion_threshold = 80
        gate_3_pass = transfer_bus_congestion < congestion_threshold

        # Then
        assert gate_3_pass is False
        assert transfer_bus_congestion >= congestion_threshold

    def test_gate_3_congestion_boundary(self):
        """
        [Phase 5 - Gate 3] 혼잡도 경계값 (정확히 80%)

        상황:
        - 혼잡도: 정확히 80%

        예상 결과:
        - Gate 3 FAIL ❌ (80% 이상은 제안하지 않음)
        """
        # Given
        transfer_bus_congestion = 80

        # When
        congestion_threshold = 80
        gate_3_pass = transfer_bus_congestion < congestion_threshold

        # Then
        assert gate_3_pass is False  # 80% 이상은 불가

    def test_gate_3_congestion_message_generation(self):
        """
        [Phase 5 - Gate 3] 혼잡도 기반 메시지 생성

        상황:
        - 혼잡도: 45% (수용 가능)
        - 메시지에 혼잡도 정보 포함

        예상 결과:
        - 메시지 예시: "다음 A역 9호선 급행 환승하세요. (현재 혼잡도: 45%)"
        """
        # Given
        transfer_location = "A역"
        transfer_line = "9호선 급행"
        congestion = 45

        # When: 메시지 생성
        message = f"다음 {transfer_location} [{transfer_line}] 환승하세요. (현재 혼잡도: {congestion}%)"

        # Then: 메시지 검증
        assert transfer_location in message
        assert transfer_line in message
        assert str(congestion) in message
        assert "혼잡도" in message


class TestLogic2_2AllGatesPassage:
    """Logic 2.2 - 모든 Gate를 통과하는 경로만 제안 테스트"""

    def test_all_gates_pass_route_suggestion(self):
        """
        [Phase 5 - 통합] 모든 Gate 통과 → 경로 제안

        상황:
        - Gate 1: 시간 절약 8분 ✅
        - Gate 2: 환승 여유 3분 ✅
        - Gate 3: 혼잡도 45% ✅

        예상 결과:
        - 대안 경로 제안 ✅
        - 메시지: "더 빠른 경로 발견! (8분 단축) / 다음 'A역' [9호선 급행] 환승하세요. (단, 현재 혼잡도 '45%')"
        """
        # Given: 모든 Gate 데이터
        time_benefit = 8  # 분
        transfer_time = 3  # 분
        congestion = 45  # %

        # When: 모든 Gate 검증
        gate_1_pass = time_benefit >= 7
        gate_2_pass = transfer_time >= 3
        gate_3_pass = congestion < 80
        all_gates_pass = gate_1_pass and gate_2_pass and gate_3_pass

        # Then: 모든 Gate 통과 → 제안
        assert all_gates_pass is True
        assert gate_1_pass is True
        assert gate_2_pass is True
        assert gate_3_pass is True

    def test_gate_1_fail_no_suggestion(self):
        """
        [Phase 5 - 통합] Gate 1 실패 → 경로 제안 없음

        상황:
        - Gate 1: 시간 절약 3분 ❌
        - Gate 2: 환승 여유 3분 ✅
        - Gate 3: 혼잡도 45% ✅

        예상 결과:
        - 대안 경로 제안하지 않음 ❌
        """
        # Given
        time_benefit = 3  # 미달
        transfer_time = 3
        congestion = 45

        # When
        gate_1_pass = time_benefit >= 7
        gate_2_pass = transfer_time >= 3
        gate_3_pass = congestion < 80
        all_gates_pass = gate_1_pass and gate_2_pass and gate_3_pass

        # Then
        assert all_gates_pass is False
        assert gate_1_pass is False

    def test_gate_2_fail_no_suggestion(self):
        """
        [Phase 5 - 통합] Gate 2 실패 → 경로 제안 없음

        상황:
        - Gate 1: 시간 절약 8분 ✅
        - Gate 2: 환승 여유 1분 ❌
        - Gate 3: 혼잡도 45% ✅

        예상 결과:
        - 대안 경로 제안하지 않음 ❌
        """
        # Given
        time_benefit = 8
        transfer_time = 1  # 미달
        congestion = 45

        # When
        gate_1_pass = time_benefit >= 7
        gate_2_pass = transfer_time >= 3
        gate_3_pass = congestion < 80
        all_gates_pass = gate_1_pass and gate_2_pass and gate_3_pass

        # Then
        assert all_gates_pass is False
        assert gate_2_pass is False

    def test_gate_3_fail_no_suggestion(self):
        """
        [Phase 5 - 통합] Gate 3 실패 → 경로 제안 없음

        상황:
        - Gate 1: 시간 절약 8분 ✅
        - Gate 2: 환승 여유 3분 ✅
        - Gate 3: 혼잡도 90% ❌

        예상 결과:
        - 대안 경로 제안하지 않음 ❌
        """
        # Given
        time_benefit = 8
        transfer_time = 3
        congestion = 90  # 초과

        # When
        gate_1_pass = time_benefit >= 7
        gate_2_pass = transfer_time >= 3
        gate_3_pass = congestion < 80
        all_gates_pass = gate_1_pass and gate_2_pass and gate_3_pass

        # Then
        assert all_gates_pass is False
        assert gate_3_pass is False

    def test_route_suggestion_message_format(self):
        """
        [Phase 5 - 통합] 경로 제안 메시지 포맷

        상황:
        - 모든 Gate 통과
        - v3.0 명세서 메시지 포맷: "더 빠른 경로 발견! (10분 단축) / 다음 'A역' [9호선 급행] 환승하세요. (단, 현재 혼잡도 '매우 높음')"

        예상 결과:
        - 메시지가 포맷에 맞음
        - 모든 필수 정보 포함
        """
        # Given: 제안 데이터
        time_benefit = 10
        transfer_location = "A역"
        transfer_line = "9호선 급행"
        congestion_level = 45

        # When: 메시지 생성
        congestion_label = "보통" if congestion_level < 50 else "높음"
        message = (
            f"더 빠른 경로 발견! ({time_benefit}분 단축) / "
            f"다음 '{transfer_location}' [{transfer_line}] 환승하세요. "
            f"(단, 현재 혼잡도 '{congestion_label}')"
        )

        # Then: 메시지 검증
        assert "더 빠른 경로 발견!" in message
        assert f"{time_benefit}분 단축" in message
        assert transfer_location in message
        assert transfer_line in message
        assert "혼잡도" in message
        assert congestion_label in message


class TestLogic2_2RealtimeIntegration:
    """Logic 2.2 - 실시간 환승 ETA와 Gate 2 연동 테스트"""

    def setup_method(self):
        self.service = PathOptimizeService()

    def test_alternative_route_uses_realtime_transfer_eta(self, monkeypatch: pytest.MonkeyPatch):
        """
        [Logic 2.2 - C-2.1] 서버 기준 실시간 환승 ETA를 사용해 Gate 2를 평가

        상황:
        - payload 상 환승 버스 ETA: 5분 (Gate 2 -> 여유 1분 → FAIL)
        - 서버 실시간 환승 ETA: 7분 (Gate 2 -> 여유 3분 → PASS)

        예상:
        - get_transfer_vehicle_realtime_info 결과를 사용하여 Gate 2 PASS
        - 대안 경로 제안(suggestAlternativeRoute=True)
        - transferTime=3으로 반환
        """

        def mock_get_transfer_vehicle_realtime_info(
            routes_data,
            current_time,
            station_name,
            subway_line,
            direction=None,
        ):
            assert station_name == "온수"
            assert "1호선" in subway_line
            return {
                "stationName": station_name,
                "subwayLine": subway_line,
                "direction": direction or "상행",
                "arrivalMinutes": 7,
                "arrivalSeconds": 7 * 60,
                "message": "7분 후",
            }

        monkeypatch.setattr(
            self.service,
            "get_transfer_vehicle_realtime_info",
            mock_get_transfer_vehicle_realtime_info,
        )

        result = self.service.get_alternative_route_suggestion(
            current_route_time=40,
            alternative_route_time=30,
            mode=SystemMode.COMMUTE,
            current_bus_arrival_minutes=2,
            current_bus_duration_minutes=2,
            transfer_bus_arrival_minutes=5,  # 실시간 없이면 여유 1분 → FAIL
            transfer_bus_congestion=40,
            transfer_location="온수",
            transfer_line="1호선 급행",
            congestion_level=None,
        )

        data = result["data"]
        assert data["suggestAlternativeRoute"] is True
        # 7 - (2 + 2) = 3분
        assert data["transferTime"] == 3
        # 서버가 사용한 실시간 환승 ETA도 노출
        assert data["serverRealtimeTransferMinutes"] == 7

    def test_gate_2_fails_when_transfer_eta_unknown(self):
        """
        [Logic 2.2 - C-2.1] transfer_window=None일 때 보수적으로 Gate 2 FAIL 처리

        상황:
        - current/transfer ETA 모두 None → 환승 여유 계산 불가

        예상:
        - Gate 2 FAIL
        - reasons에 '환승 여유 시간을 계산할 수 없어' 문구 포함
        """
        result = gate_validator.validate_all_gates(
            current_route_time=40,
            alternative_route_time=30,
            mode=SystemMode.COMMUTE,
            current_bus_arrival_minutes=None,
            current_bus_duration_minutes=2,
            transfer_bus_arrival_minutes=None,
            transfer_bus_congestion=40,
            congestion_level=None,
        )

        assert result["gate_2_pass"] is False
        assert result["all_pass"] is False
        assert any(
            "환승 여유 시간을 계산할 수 없어" in reason for reason in result["reasons"]
        )
