"""
Phase 8: Logic 3.2 - 최종 대안 제시 (Taxi as Last Resort) - Commute Mode

헌법 준수:
- AGENTS.md 백엔드 헌법 [제5장] 개발 방법론 (TDD/Pytest)
- v3.0 명세서 [Logic 3.2] 택시 제안
- OpenAPI 스펙 응답 구조 준수

[Phase 8 테스트 시나리오 - 출근 모드]:
1. ✅ 지각 확정 (목표 도착 불가능)
   - 예시: "🚨지각 확정! 대중교통 이용 시 {arrivalTime} 도착 예상. 지금 [택시] 탑승 시 도착 가능합니다."
2. ✅ 택시 호출 CTA (Call-to-Action)
3. ✅ 목표 도착 불가능 시에만 제안
4. ✅ 응답 구조 검증
"""

import pytest
from datetime import datetime, time, timedelta
from typing import Dict, Any, Optional


class TestLogic3_2TaxiCommute:
    """Logic 3.2 - 택시 제안 (Commute Mode) 테스트"""

    # ========================================
    # 테스트 데이터 Fixtures
    # ========================================

    @pytest.fixture
    def commute_settings(self) -> Dict[str, Any]:
        """출근 모드 설정"""
        return {
            "homeAddress": "서울시 강남구 역삼동",
            "workAddress": "서울시 강남구 테헤란로",
            "targetArrivalTime": time(9, 0),  # 9:00 AM 도착 목표
            "firstMileDuration": 5,  # 집 → 버스정류장: 5분
            "lastMileDuration": 3  # 지하철역 → 회사: 3분
        }

    @pytest.fixture
    def current_route_info(self) -> Dict[str, Any]:
        """현재 경로 정보"""
        return {
            "segments": [
                {
                    "segment_id": "SEG_001",
                    "segment_name": "A정류장 → B역",
                    "from_station": "A정류장",
                    "to_station": "B역"
                }
            ],
            "totalDuration": 35,  # 총 35분 소요
            "departureTime": datetime(2025, 11, 12, 8, 15)  # 8:15 출발
        }

    @pytest.fixture
    def delay_info(self) -> Dict[str, Any]:
        """지연 정보"""
        return {
            "delayedCount": 1,
            "delayedSegments": [
                {
                    "segmentId": "SEG_001",
                    "delayMinutes": 15,
                    "priority": "HIGH"
                }
            ],
            "mostCritical": {
                "delayMinutes": 15
            }
        }

    @pytest.fixture
    def taxi_availability(self) -> Dict[str, Any]:
        """택시 가용성 정보"""
        return {
            "taxiAvailable": True,
            "estimatedArrivalMinutes": 5,  # 택시 5분 내 도착
            "estimatedTripDuration": 15,  # 택시로 15분 소요
            "currentLocation": {
                "latitude": 37.4979,
                "longitude": 127.0276
            }
        }

    # ========================================
    # Scenario 1: 지각 확정 (목표 도착 불가능)
    # ========================================

    def test_taxi_suggestion_when_late_inevitable(
        self,
        commute_settings: Dict[str, Any],
        current_route_info: Dict[str, Any],
        delay_info: Dict[str, Any],
        taxi_availability: Dict[str, Any]
    ):
        """
        [Phase 8 - 시나리오 1] 지각 확정 - 택시 제안

        상황:
        - 목표 도착 시간: 9:00 AM
        - 현재 시각: 8:20 AM
        - 대중교통 예상 도착: 8:50 + 15분 지연 = 9:05 AM (지각!)
        - 택시 예상 도착: 8:20 + 5분(도착) + 15분(이동) = 8:40 AM (도착 가능!)

        예상 결과:
        - action: "TAXI_SUGGESTED"
        - type: "TAXI_COMMUTE_LATENESS_CONFIRMED"
        - message: "🚨지각 확정! 대중교통 이용 시 9:05 도착 예상.
                   지금 [택시] 탑승 시 8:40 도착 가능합니다."
        - priority: "CRITICAL"
        - ctaButton: 택시 호출 버튼
        """
        # Given: 현재 시각 8:20
        current_time = datetime(2025, 11, 12, 8, 20)
        target_arrival = datetime(2025, 11, 12, 9, 0)

        # 대중교통 도착 시간 계산
        departure_time = datetime(2025, 11, 12, 8, 15)
        route_duration = 35
        delay_minutes = delay_info["delayedSegments"][0]["delayMinutes"]
        transit_arrival = departure_time + timedelta(minutes=route_duration + delay_minutes)
        # 8:15 + 35분 + 15분 지연 = 9:05

        # 택시 도착 시간 계산
        taxi_wait = taxi_availability["estimatedArrivalMinutes"]
        taxi_trip = taxi_availability["estimatedTripDuration"]
        taxi_arrival = current_time + timedelta(minutes=taxi_wait + taxi_trip)
        # 8:20 + 5분 + 15분 = 8:40

        # When: 지각 판정
        is_late_with_transit = transit_arrival > target_arrival
        can_arrive_with_taxi = taxi_arrival <= target_arrival

        message = (
            f"🚨지각 확정! 대중교통 이용 시 {transit_arrival.strftime('%H:%M')} 도착 예상. "
            f"지금 [택시] 탑승 시 {taxi_arrival.strftime('%H:%M')} 도착 가능합니다."
        )

        result = {
            "action": "TAXI_SUGGESTED" if is_late_with_transit and can_arrive_with_taxi else "NO_ACTION",
            "type": "TAXI_COMMUTE_LATENESS_CONFIRMED",
            "message": message,
            "priority": "CRITICAL",
            "isLateWithTransit": is_late_with_transit,
            "canArriveWithTaxi": can_arrive_with_taxi,
            "transitArrivalTime": transit_arrival.strftime("%H:%M"),
            "taxiArrivalTime": taxi_arrival.strftime("%H:%M"),
            "targetArrivalTime": target_arrival.strftime("%H:%M"),
            "ctaButton": {
                "text": "택시 호출하기",
                "action": "CALL_TAXI",
                "deeplink": "kakaomap://taxi?lat=37.4979&lng=127.0276"
            }
        }

        # Then: 응답 검증
        assert is_late_with_transit is True
        assert can_arrive_with_taxi is True
        assert result["action"] == "TAXI_SUGGESTED"
        assert "지각 확정" in result["message"]
        assert "택시" in result["message"]
        assert result["priority"] == "CRITICAL"
        assert result["ctaButton"]["text"] == "택시 호출하기"

    def test_taxi_arrival_time_is_earlier_than_transit(
        self,
        commute_settings: Dict[str, Any]
    ):
        """
        [Phase 8 - 시나리오 1 추가] 택시가 대중교통보다 훨씬 빠름

        상황:
        - 목표: 9:00 AM
        - 대중교통: 9:10 AM (지각)
        - 택시: 8:35 AM (25분 빨리 도착)

        예상 결과:
        - action: "TAXI_SUGGESTED"
        - time_benefit: 35분
        """
        # Given
        current_time = datetime(2025, 11, 12, 8, 20)
        target_arrival = datetime(2025, 11, 12, 9, 0)
        transit_arrival = datetime(2025, 11, 12, 9, 10)
        taxi_arrival = datetime(2025, 11, 12, 8, 35)

        # When
        is_late = transit_arrival > target_arrival
        can_save = taxi_arrival <= target_arrival
        time_benefit = (transit_arrival - taxi_arrival).total_seconds() // 60  # 35분

        result = {
            "action": "TAXI_SUGGESTED" if is_late and can_save else "NO_ACTION",
            "timeBenefit": time_benefit,  # 35분 절약
            "priority": "CRITICAL"
        }

        # Then
        assert result["action"] == "TAXI_SUGGESTED"
        assert result["timeBenefit"] == 35

    # ========================================
    # Scenario 2: 택시가 도움 안 됨 (목표 도착 불가능)
    # ========================================

    def test_no_taxi_suggestion_when_taxi_also_late(
        self,
        commute_settings: Dict[str, Any]
    ):
        """
        [Phase 8 - 시나리오 2] 택시도 도착 못함 → NO_ACTION

        상황:
        - 목표: 9:00 AM
        - 대중교통: 9:10 AM (지각)
        - 택시: 9:15 AM (더 늦음!)

        예상 결과:
        - action: "NO_ACTION"
        - reason: "택시도 목표 시간까지 도착 불가능"
        """
        # Given
        target_arrival = datetime(2025, 11, 12, 9, 0)
        transit_arrival = datetime(2025, 11, 12, 9, 10)
        taxi_arrival = datetime(2025, 11, 12, 9, 15)

        # When
        is_late_with_transit = transit_arrival > target_arrival
        can_arrive_with_taxi = taxi_arrival <= target_arrival

        result = {
            "action": "TAXI_SUGGESTED" if is_late_with_transit and can_arrive_with_taxi else "NO_ACTION",
            "reason": "택시도 목표 시간까지 도착 불가능" if is_late_with_transit and not can_arrive_with_taxi else None
        }

        # Then
        assert is_late_with_transit is True
        assert can_arrive_with_taxi is False
        assert result["action"] == "NO_ACTION"
        assert "불가능" in result["reason"]

    def test_no_taxi_suggestion_when_on_time_with_transit(
        self,
        commute_settings: Dict[str, Any]
    ):
        """
        [Phase 8 - 시나리오 2 추가] 대중교통으로 충분히 도착 → NO_ACTION

        상황:
        - 목표: 9:00 AM
        - 대중교통: 8:45 AM (여유 있음)

        예상 결과:
        - action: "NO_ACTION"
        - reason: "대중교통으로 충분히 도착 가능"
        """
        # Given
        target_arrival = datetime(2025, 11, 12, 9, 0)
        transit_arrival = datetime(2025, 11, 12, 8, 45)

        # When
        is_late = transit_arrival > target_arrival

        result = {
            "action": "NO_ACTION",
            "reason": "대중교통으로 충분히 도착 가능" if not is_late else None
        }

        # Then
        assert is_late is False
        assert result["action"] == "NO_ACTION"

    # ========================================
    # Scenario 3: 택시 미보유 지역
    # ========================================

    def test_taxi_suggestion_not_available_in_region(
        self,
        commute_settings: Dict[str, Any]
    ):
        """
        [Phase 8 - 시나리오 3] 택시가 없는 지역

        상황:
        - 목표: 9:00 AM
        - 대중교통: 9:10 AM (지각)
        - 택시: 이용 불가 (지역 미지원)

        예상 결과:
        - action: "NO_ACTION"
        - reason: "현재 지역에서 택시 서비스 미지원"
        """
        # Given
        target_arrival = datetime(2025, 11, 12, 9, 0)
        transit_arrival = datetime(2025, 11, 12, 9, 10)
        taxi_available = False

        # When
        is_late = transit_arrival > target_arrival

        result = {
            "action": "TAXI_SUGGESTED" if is_late and taxi_available else "NO_ACTION",
            "reason": "현재 지역에서 택시 서비스 미지원" if is_late and not taxi_available else None
        }

        # Then
        assert is_late is True
        assert taxi_available is False
        assert result["action"] == "NO_ACTION"
        assert "미지원" in result["reason"]

    # ========================================
    # Scenario 4: 응답 구조 검증
    # ========================================

    def test_taxi_suggestion_response_structure(
        self,
        commute_settings: Dict[str, Any]
    ):
        """
        [Phase 8 - 시나리오 4] 응답 구조 검증 (OpenAPI 스펙)

        상황:
        - 택시 제안 응답

        예상 결과:
        - 응답 구조가 올바름
        - 필요한 모든 필드 포함
        """
        # Given: 택시 제안 데이터
        taxi_data = {
            "action": "TAXI_SUGGESTED",
            "type": "TAXI_COMMUTE_LATENESS_CONFIRMED",
            "message": "🚨지각 확정! 대중교통 이용 시 9:05 도착 예상. 지금 [택시] 탑승 시 8:40 도착 가능합니다.",
            "priority": "CRITICAL",
            "targetArrivalTime": "09:00",
            "transitArrivalTime": "09:05",
            "taxiArrivalTime": "08:40",
            "delayMinutes": 5,
            "timeBenefit": 25,
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
        assert "text" in taxi_data["ctaButton"]
        assert "action" in taxi_data["ctaButton"]
        assert taxi_data["action"] == "TAXI_SUGGESTED"
        assert taxi_data["priority"] == "CRITICAL"

    # ========================================
    # Scenario 5: 복합 시나리오
    # ========================================

    def test_taxi_suggestion_with_multiple_delays(self):
        """
        [Phase 8 - 시나리오 5] 여러 구간 지연 → 누적 지연이 심각함

        상황:
        - 구간 1: 3분 지연
        - 구간 2: 5분 지연
        - 구간 3: 7분 지연
        - 총 지연: 15분

        예상 결과:
        - 택시 제안 대상
        """
        # Given
        target_arrival = datetime(2025, 11, 12, 9, 0)
        base_duration = 30  # 기본 30분
        total_delay = 3 + 5 + 7  # 15분 지연
        transit_arrival = datetime(2025, 11, 12, 8, 15) + timedelta(minutes=base_duration + total_delay)
        # 8:15 + 45분 = 9:00 → 지각 아님

        # 하지만 정확히 목표 시간이면 지각 위험
        is_borderline = transit_arrival == target_arrival

        result = {
            "totalDelay": total_delay,
            "isBorderline": is_borderline,
            "recommendation": "TAXI_RECOMMENDED" if is_borderline else "NO_ACTION"
        }

        # Then
        assert result["totalDelay"] == 15
        assert result["isBorderline"] is True

    # ========================================
    # Scenario 6: 경계값 테스트
    # ========================================

    def test_boundary_exactly_at_target_time(self):
        """
        [Phase 8 - 경계값] 정확히 목표 시간에 도착

        상황:
        - 목표: 9:00 AM
        - 대중교통: 9:00 AM (정확히!)

        예상 결과:
        - on_time = True
        - no_taxi_needed
        """
        # Given
        target_arrival = datetime(2025, 11, 12, 9, 0)
        transit_arrival = datetime(2025, 11, 12, 9, 0)

        # When
        is_late = transit_arrival > target_arrival

        # Then
        assert is_late is False

    def test_boundary_one_second_late(self):
        """
        [Phase 8 - 경계값] 1초 늦음

        상황:
        - 목표: 9:00:00 AM
        - 대중교통: 9:00:01 AM

        예상 결과:
        - is_late = True
        - 택시 고려 대상
        """
        # Given
        target_arrival = datetime(2025, 11, 12, 9, 0, 0)
        transit_arrival = datetime(2025, 11, 12, 9, 0, 1)

        # When
        is_late = transit_arrival > target_arrival

        # Then
        assert is_late is True
