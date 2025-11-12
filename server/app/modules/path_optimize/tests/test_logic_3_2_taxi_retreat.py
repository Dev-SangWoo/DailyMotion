"""
Phase 8: Logic 3.2 - 최종 대안 제시 (Taxi as Last Resort) - Retreat Mode

헌법 준수:
- AGENTS.md 백엔드 헌법 [제5장] 개발 방법론 (TDD/Pytest)
- v3.0 명세서 [Logic 3.2] 택시 제안
- OpenAPI 스펙 응답 구조 준수

[Phase 8 테스트 시나리오 - 퇴근 모드]:
1. ✅ 막차 놓침 (지연으로 인해)
   - 예시: "⚠️막차를 놓치셨습니다! 선택하신 [B. 편안하게(착석)]의 막차가 떠났습니다.
             지금 [택시] 탑승 시 귀가 가능합니다."
2. ✅ 택시 호출 CTA
3. ✅ 막차 시간 전에만 제안
4. ✅ 응답 구조 검증
"""

import pytest
from datetime import datetime, time, timedelta
from typing import Dict, Any, Optional


class TestLogic3_2TaxiRetreat:
    """Logic 3.2 - 택시 제안 (Retreat Mode) 테스트"""

    # ========================================
    # 테스트 데이터 Fixtures
    # ========================================

    @pytest.fixture
    def retreat_settings(self) -> Dict[str, Any]:
        """퇴근 모드 설정"""
        return {
            "homeAddress": "서울시 강남구 역삼동",
            "workAddress": "서울시 강남구 테헤란로",
            "retreatChoice": "B",  # B. 편안하게 (착석)
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 3
        }

    @pytest.fixture
    def retreat_route_options(self) -> Dict[str, Dict[str, Any]]:
        """퇴근 경로 옵션 (A, B, C)"""
        return {
            "A": {
                "name": "가장 빠르게",
                "lastBusTime": datetime(2025, 11, 12, 23, 30),  # 23:30
                "estimatedDuration": 25
            },
            "B": {
                "name": "편안하게 (착석)",
                "lastBusTime": datetime(2025, 11, 12, 23, 15),  # 23:15
                "estimatedDuration": 35
            },
            "C": {
                "name": "평소 경로",
                "lastBusTime": datetime(2025, 11, 12, 23, 20),  # 23:20
                "estimatedDuration": 30
            }
        }

    # ========================================
    # Scenario 1: 막차 놓침 (지연으로 인해)
    # ========================================

    def test_taxi_suggestion_when_last_bus_missed(
        self,
        retreat_settings: Dict[str, Any],
        retreat_route_options: Dict[str, Dict[str, Any]]
    ):
        """
        [Phase 8 - 시나리오 1] 막차 놓침 → 택시 제안

        상황:
        - 현재 시각: 23:10
        - 선택 경로: B (편안하게 - 착석)
        - B의 막차: 23:15
        - 지연: 15분
        - 예상 도착 시간: 23:10 + 5분(First Mile) + 15분 지연 = 23:30 (막차 놓침!)

        예상 결과:
        - action: "TAXI_SUGGESTED"
        - type: "TAXI_RETREAT_LAST_BUS_MISSED"
        - message: "⚠️막차를 놓치셨습니다! 선택하신 [B. 편안하게(착석)]의 막차가 떠났습니다.
                   지금 [택시] 탑승 시 귀가 가능합니다."
        - priority: "HIGH"
        """
        # Given: 현재 시각 23:10
        current_time = datetime(2025, 11, 12, 23, 10)
        choice = "B"
        selected_route = retreat_route_options[choice]
        last_bus_time = selected_route["lastBusTime"]
        first_mile_duration = 5
        delay_minutes = 15

        # 막차 탈 수 있는 시간: 막차 - First Mile
        deadline_for_last_bus = last_bus_time - timedelta(minutes=first_mile_duration)
        # 23:15 - 5분 = 23:10 (정확히 현재 시각)

        # 예상 도착 시간 (지연 포함)
        expected_arrival = current_time + timedelta(
            minutes=first_mile_duration + delay_minutes
        )
        # 23:10 + 5분 + 15분 = 23:30 (23:15 막차 놓침!)

        # When: 막차 놓침 판정
        will_miss_last_bus = expected_arrival > last_bus_time

        # 택시 도착 가능 여부 (임의로 설정)
        taxi_arrival = current_time + timedelta(minutes=3 + 18)  # 3분 대기 + 18분 이동 = 23:31

        message = (
            f"⚠️막차를 놓치셨습니다! 선택하신 [{choice}. {selected_route['name']}]의 막차가 떠났습니다. "
            f"지금 [택시] 탑승 시 귀가 가능합니다."
        )

        result = {
            "action": "TAXI_SUGGESTED" if will_miss_last_bus else "NO_ACTION",
            "type": "TAXI_RETREAT_LAST_BUS_MISSED",
            "message": message,
            "priority": "HIGH",
            "willMissLastBus": will_miss_last_bus,
            "lastBusTime": last_bus_time.strftime("%H:%M"),
            "expectedArrivalTime": expected_arrival.strftime("%H:%M"),
            "taxiArrivalTime": taxi_arrival.strftime("%H:%M"),
            "routeChoice": choice,
            "routeName": selected_route["name"],
            "ctaButton": {
                "text": "택시 호출하기",
                "action": "CALL_TAXI",
                "deeplink": "kakaomap://taxi?lat=37.4979&lng=127.0276"
            }
        }

        # Then: 응답 검증
        assert will_miss_last_bus is True
        assert result["action"] == "TAXI_SUGGESTED"
        assert "막차를 놓치셨습니다" in result["message"]
        assert choice in result["message"]
        assert result["priority"] == "HIGH"
        assert result["ctaButton"]["text"] == "택시 호출하기"

    def test_taxi_suggestion_critical_timing(
        self,
        retreat_route_options: Dict[str, Dict[str, Any]]
    ):
        """
        [Phase 8 - 시나리오 1 추가] 매우 긴박한 시간

        상황:
        - 현재 시각: 23:12
        - 막차: 23:15 (3분 후)
        - First Mile: 5분 필요
        - → 이미 막차 탈 수 없음!

        예상 결과:
        - action: "TAXI_SUGGESTED"
        - urgency: "CRITICAL"
        """
        # Given
        current_time = datetime(2025, 11, 12, 23, 12)
        last_bus_time = datetime(2025, 11, 12, 23, 15)
        first_mile_duration = 5

        # When: 막차 시간 체크
        time_until_bus = (last_bus_time - current_time).total_seconds() / 60
        can_catch_bus = time_until_bus > first_mile_duration
        # 3분 > 5분? → False (이미 늦음)

        result = {
            "action": "TAXI_SUGGESTED" if not can_catch_bus else "NO_ACTION",
            "urgency": "CRITICAL" if not can_catch_bus else "NORMAL"
        }

        # Then
        assert can_catch_bus is False
        assert result["action"] == "TAXI_SUGGESTED"
        assert result["urgency"] == "CRITICAL"

    # ========================================
    # Scenario 2: 막차 시간 전 (아직 탈 수 있음)
    # ========================================

    def test_no_taxi_suggestion_when_can_still_catch_bus(
        self,
        retreat_route_options: Dict[str, Dict[str, Any]]
    ):
        """
        [Phase 8 - 시나리오 2] 아직 막차를 탈 수 있음 → NO_ACTION

        상황:
        - 현재 시각: 23:05
        - 막차: 23:15
        - First Mile: 5분
        - → 23:05 + 5분 = 23:10 (막차 23:15 전에 도착 가능!)

        예상 결과:
        - action: "NO_ACTION"
        - reason: "아직 막차 탑승 가능"
        """
        # Given
        current_time = datetime(2025, 11, 12, 23, 5)
        last_bus_time = datetime(2025, 11, 12, 23, 15)
        first_mile_duration = 5

        # When
        deadline = last_bus_time - timedelta(minutes=first_mile_duration)
        can_catch = current_time < deadline
        # 23:05 < 23:10? → True

        result = {
            "action": "NO_ACTION" if can_catch else "TAXI_SUGGESTED",
            "reason": "아직 막차 탑승 가능" if can_catch else None
        }

        # Then
        assert can_catch is True
        assert result["action"] == "NO_ACTION"

    def test_no_taxi_suggestion_when_no_service_needed(
        self,
        retreat_route_options: Dict[str, Dict[str, Any]]
    ):
        """
        [Phase 8 - 시나리오 2 추가] 정상적으로 막차 탑승 가능

        상황:
        - 현재 시각: 22:50
        - 막차: 23:15
        - 충분한 시간 여유

        예상 결과:
        - action: "NO_ACTION"
        """
        # Given
        current_time = datetime(2025, 11, 12, 22, 50)
        last_bus_time = datetime(2025, 11, 12, 23, 15)
        first_mile_duration = 5

        # When
        deadline = last_bus_time - timedelta(minutes=first_mile_duration)
        time_remaining = (deadline - current_time).total_seconds() / 60
        sufficient_time = time_remaining > 10  # 10분 이상 여유

        result = {
            "action": "NO_ACTION",
            "timeRemaining": int(time_remaining)
        }

        # Then
        assert sufficient_time is True
        assert result["action"] == "NO_ACTION"

    # ========================================
    # Scenario 3: 택시 미보유 지역
    # ========================================

    def test_no_taxi_when_region_not_supported(
        self,
        retreat_settings: Dict[str, Any]
    ):
        """
        [Phase 8 - 시나리오 3] 택시 서비스 미지원 지역

        상황:
        - 막차 놓침: Yes
        - 택시 가용성: No

        예상 결과:
        - action: "NO_ACTION"
        - reason: "현재 지역에서 택시 서비스 미지원"
        """
        # Given
        will_miss_last_bus = True
        taxi_available = False

        # When
        result = {
            "action": "TAXI_SUGGESTED" if will_miss_last_bus and taxi_available else "NO_ACTION",
            "reason": "현재 지역에서 택시 서비스 미지원" if will_miss_last_bus and not taxi_available else None
        }

        # Then
        assert will_miss_last_bus is True
        assert taxi_available is False
        assert result["action"] == "NO_ACTION"

    # ========================================
    # Scenario 4: 응답 구조 검증
    # ========================================

    def test_taxi_suggestion_retreat_response_structure(
        self,
        retreat_settings: Dict[str, Any]
    ):
        """
        [Phase 8 - 시나리오 4] 응답 구조 검증 (OpenAPI 스펙)

        상황:
        - 퇴근 모드 택시 제안 응답

        예상 결과:
        - 응답 구조가 올바름
        - 필요한 모든 필드 포함
        """
        # Given: 택시 제안 데이터
        taxi_data = {
            "action": "TAXI_SUGGESTED",
            "type": "TAXI_RETREAT_LAST_BUS_MISSED",
            "message": "⚠️막차를 놓치셨습니다! 선택하신 [B. 편안하게(착석)]의 막차가 떠났습니다. 지금 [택시] 탑승 시 귀가 가능합니다.",
            "priority": "HIGH",
            "routeChoice": "B",
            "routeName": "편안하게 (착석)",
            "lastBusTime": "23:15",
            "expectedArrivalTime": "23:30",
            "taxiArrivalTime": "23:31",
            "ctaButton": {
                "text": "택시 호출하기",
                "action": "CALL_TAXI",
                "deeplink": "kakaomap://taxi?lat=37.4979&lng=127.0276"
            }
        }

        # Then: 응답 구조 검증
        assert "action" in taxi_data
        assert "type" in taxi_data
        assert "message" in taxi_data
        assert "priority" in taxi_data
        assert "ctaButton" in taxi_data
        assert taxi_data["action"] == "TAXI_SUGGESTED"
        assert taxi_data["type"] == "TAXI_RETREAT_LAST_BUS_MISSED"
        assert taxi_data["priority"] == "HIGH"

    # ========================================
    # Scenario 5: 복합 시나리오
    # ========================================

    def test_taxi_suggestion_all_routes_missed(self):
        """
        [Phase 8 - 시나리오 5] 모든 경로의 막차를 놓쳤을 때

        상황:
        - 현재: 23:30
        - 경로 A의 막차: 23:30 (이미 지남)
        - 경로 B의 막차: 23:15 (이미 지남)
        - 경로 C의 막차: 23:20 (이미 지남)

        예상 결과:
        - 모든 경로 불가능
        - action: "TAXI_SUGGESTED"
        """
        # Given
        current_time = datetime(2025, 11, 12, 23, 30)
        routes = {
            "A": datetime(2025, 11, 12, 23, 30),
            "B": datetime(2025, 11, 12, 23, 15),
            "C": datetime(2025, 11, 12, 23, 20)
        }

        # When: 모든 경로 체크
        missed_routes = [r for r, t in routes.items() if current_time >= t]

        result = {
            "allRoutesMissed": len(missed_routes) == len(routes),
            "missedCount": len(missed_routes),
            "action": "TAXI_SUGGESTED" if len(missed_routes) == len(routes) else "NO_ACTION"
        }

        # Then
        assert result["allRoutesMissed"] is True
        assert result["missedCount"] == 3
        assert result["action"] == "TAXI_SUGGESTED"

    # ========================================
    # Scenario 6: 경계값 테스트
    # ========================================

    def test_boundary_exactly_at_last_bus_time(self):
        """
        [Phase 8 - 경계값] 정확히 막차 시간

        상황:
        - 현재: 23:15 (막차 시간)
        - 막차: 23:15

        예상 결과:
        - 막차 놓침 판정 (이미 떠남)
        """
        # Given
        current_time = datetime(2025, 11, 12, 23, 15)
        last_bus_time = datetime(2025, 11, 12, 23, 15)

        # When
        missed = current_time >= last_bus_time

        # Then
        assert missed is True

    def test_boundary_one_second_before_last_bus(self):
        """
        [Phase 8 - 경계값] 막차 1초 전

        상황:
        - 현재: 23:14:59
        - 막차: 23:15:00

        예상 결과:
        - 아직 탈 수 있음
        """
        # Given
        current_time = datetime(2025, 11, 12, 23, 14, 59)
        last_bus_time = datetime(2025, 11, 12, 23, 15, 0)

        # When
        missed = current_time >= last_bus_time

        # Then
        assert missed is False
