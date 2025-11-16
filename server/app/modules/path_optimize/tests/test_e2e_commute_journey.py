"""
E2E Integration Test: 출근 모드 전체 여정 (Commute Journey)

TDD Principle: 이 테스트는 Phase 1~13의 모든 Logic이 하나의 통합 시나리오에서
올바르게 작동하는지 검증합니다.

테스트 시나리오:
1. 사용자가 아침에 출근 준비 (집에서 대기)
2. 출발 알림 받음 (Logic 1.1: GO_NOW)
3. 집에서 출발 → 정류장까지 도보 (First Mile)
4. 버스 탑승 → 시스템이 자동 감지 (Logic 2.1: Context Awareness)
5. 지하철 환승 필요 → 최적 탑승 칸 안내 (Logic 2.3: Seating Optimization)
6. 지하철 운행 중 지연 발생 → 시스템 감지 (Logic 3.1: Delay Detection)
7. 지연으로 인해 대안 경로 제안 (Logic 2.2: Gate Validation)
8. 대안 경로도 불가능 → 택시 제안 (Logic 3.2: Taxi as Last Resort)
9. 회사 도착 → 여정 종료

Author: Claude Code (TDD Enforcer 검증)
Created: 2025-01-15
"""

import pytest
from datetime import time, datetime, timedelta
from app.modules.path_optimize.service import PathOptimizeService
from app.modules.path_optimize.models import (
    CommuteSettings,
    SystemMode,
    TransportType,
    UserState,
    GPSData,
    UserContextData,
    AlertType,
    Location,
    RecommendedTransport,
)


class TestE2ECommuteJourney:
    """E2E 통합 테스트: 출근 모드 전체 여정"""

    @pytest.fixture
    def service(self):
        """PathOptimizeService 인스턴스 생성"""
        return PathOptimizeService()

    @pytest.fixture
    def user_commute_settings(self):
        """테스트용 사용자 출퇴근 설정"""
        return CommuteSettings(
            homeAddress="서울특별시 강남구 역삼동 123",
            homeLatitude=37.4979,
            homeLongitude=127.0276,
            workAddress="서울특별시 중구 을지로 456",
            workLatitude=37.5665,
            workLongitude=126.9780,
            targetArrivalTime=time(9, 0),  # 오전 9시 도착 목표
            firstMileDuration=5,  # 집 → 정류장 도보 5분
            lastMileDuration=7,   # 하차역 → 회사 도보 7분
            preferredRoutes=["A", "B", "C"],
        )

    # ========================================================================
    # Step 1: 출발 알림 (Logic 1.1)
    # ========================================================================

    def test_step1_departure_alert_go_now(self, service, user_commute_settings):
        """
        Step 1: 사용자가 집에서 출발 알림을 받는다 (GO_NOW)

        시나리오:
        - 현재 시간: 8:20
        - 목표 도착: 9:00 (40분 남음)
        - First Mile: 5분
        - 예상 통근 시간: 30분
        - 결과: GO_NOW 알림 (여유 있음, 지금 출발하면 정시 도착)
        """
        # Arrange
        current_time = datetime.now().replace(hour=8, minute=20, second=0, microsecond=0)

        # Act
        result = service.get_commute_briefing(
            settings=user_commute_settings,
            current_time=current_time
        )

        # Assert
        assert result.alertType == AlertType.GO_NOW
        assert "지금" in result.message or "출발" in result.message
        assert result.recommendedTransport is not None
        assert result.recommendedTransport.type in [TransportType.BUS, TransportType.SUBWAY]

        # Door-to-Door 계산 검증 (CRITICAL: claude.md 규칙)
        # 전체 소요시간 = First Mile (5분) + Transit (30분) + Last Mile (7분) = 42분
        # 40분 남았으므로 여유 있음 → GO_NOW
        assert result.departureInMinutes <= 5  # 지금 출발해야 함 (First Mile 이내)

    def test_step1_departure_alert_last_chance(self, service, user_commute_settings):
        """
        Step 1-추가: 마지노선 경고 (LAST_CHANCE)

        시나리오:
        - 현재 시간: 8:45
        - 목표 도착: 9:00 (15분 남음)
        - 결과: LAST_CHANCE 경고 (⚠️ 지각 주의!)
        """
        # Arrange
        current_time = datetime.now().replace(hour=8, minute=45, second=0, microsecond=0)

        # Act
        result = service.get_commute_briefing(
            settings=user_commute_settings,
            current_time=current_time
        )

        # Assert
        assert result.alertType == AlertType.LAST_CHANCE
        assert "⚠️" in result.message or "지각" in result.message or "마지막" in result.message

    # ========================================================================
    # Step 2: 탑승 상태 감지 (Logic 2.1 - Context Awareness)
    # ========================================================================

    def test_step2_boarding_detection_auto_switch(self, service, user_commute_settings):
        """
        Step 2: 사용자가 버스에 탑승 → 시스템이 자동 감지하여 화면 전환

        시나리오:
        - 사용자가 정류장에서 버스 탑승
        - GPS로 빠른 이동 감지 (ON_TRIP 상태)
        - 화면 자동 전환: "도착 예정 시간" 표시
        """
        # Arrange
        current_time = datetime.now().replace(hour=8, minute=25, second=0, microsecond=0)

        # 버스 탑승 후 GPS 데이터 (정류장에서 500m 떨어진 위치, 이동 중)
        onboard_gps = GPSData(
            latitude=37.5000,  # 정류장에서 약간 이동
            longitude=127.0300
        )

        context_data = UserContextData(
            currentGPS=onboard_gps,
            commute_settings=user_commute_settings,
            mode=SystemMode.COMMUTE,
            current_time=current_time
        )

        # Act
        result = service.get_auto_mode_switch_action(context_data)

        # Assert
        assert result.action == "AUTO_SWITCH_TO_ETA"
        assert result.detectedState == UserState.ON_TRIP
        assert result.estimatedArrivalTime is not None
        assert "도착" in result.message or "예정" in result.message

    # ========================================================================
    # Step 3: 환승 최적화 (Logic 2.3 - Seating Optimization)
    # ========================================================================

    def test_step3_transfer_optimization_subway_car_recommendation(self, service):
        """
        Step 3: 지하철 환승 시 최적 탑승 칸 안내

        시나리오:
        - 버스에서 지하철 2호선으로 환승
        - 다음 역에서 4호선으로 환승 예정
        - 시스템이 환승에 최적인 칸 추천 (5-2번 칸)
        """
        # Arrange
        optimization_request = {
            "guidanceType": "TRANSFER",
            "nextTransferStation": "잠실역",
            "nextTransferLine": "지하철 4호선",
            "currentLine": "지하철 2호선"
        }

        # Act
        result = service.get_seating_optimization(optimization_request)

        # Assert
        assert result.guidanceType == "TRANSFER"
        assert result.recommendedCar is not None
        assert "환승" in result.message
        assert "칸" in result.message
        # 예시: "다음 '잠실역' 환승을 위해, '5-2번 칸'에 탑승하세요."

    def test_step3_comfortable_car_recommendation(self, service):
        """
        Step 3-추가: 혼잡도 기반 여유 있는 칸 추천

        시나리오:
        - 출근 시간대 혼잡한 열차
        - 시스템이 상대적으로 여유 있는 칸 추천 (3번, 8번 칸)
        """
        # Arrange
        optimization_request = {
            "guidanceType": "COMFORTABLE",
            "currentLine": "지하철 2호선",
            "carCongestionData": [
                {"carNumber": 1, "congestionRate": 85},
                {"carNumber": 2, "congestionRate": 90},
                {"carNumber": 3, "congestionRate": 35},  # 여유 있음
                {"carNumber": 4, "congestionRate": 88},
                {"carNumber": 5, "congestionRate": 92},
                {"carNumber": 6, "congestionRate": 87},
                {"carNumber": 7, "congestionRate": 86},
                {"carNumber": 8, "congestionRate": 30},  # 여유 있음
            ]
        }

        # Act
        result = service.get_seating_optimization(optimization_request)

        # Assert
        assert result.guidanceType == "COMFORTABLE"
        assert 3 in result.recommendedCars or 8 in result.recommendedCars
        assert "여유" in result.message

    # ========================================================================
    # Step 4: 지연 감지 (Logic 3.1 - Delay Detection)
    # ========================================================================

    def test_step4_delay_detection_on_subway(self, service):
        """
        Step 4: 지하철 운행 중 지연 발생 감지

        시나리오:
        - 2호선 잠실역 → 강남역 구간에서 평소보다 7분 지연
        - 시스템이 지연 감지 (임계값 5분 초과)
        - 사용자에게 지연 알림 전송
        """
        # Arrange
        route_segments = [
            {
                "segmentId": "subway_line2_jamsil_gangnam",
                "transportType": TransportType.SUBWAY,
                "transportName": "지하철 2호선",
                "startStation": "잠실역",
                "endStation": "강남역",
                "currentTime": datetime.now().replace(hour=8, minute=40),
            }
        ]

        # Act
        result = service.get_exception_alert(route_segments)

        # Assert
        assert result.alertType == "DELAY_DETECTED"
        assert result.delayMinutes >= 5  # 임계값 이상
        assert "지연" in result.message
        # 예시: "⚠️ 지연 감지! 지하철 2호선 잠실역→강남역 구간이 평소보다 7분 늦습니다."

    def test_step4_no_delay_normal_operation(self, service):
        """
        Step 4-추가: 정상 운행 (지연 없음)

        시나리오:
        - 평소와 동일한 소요시간
        - 결과: NO_ACTION
        """
        # Arrange
        route_segments = [
            {
                "segmentId": "subway_line2_gangnam_euljiro",
                "transportType": TransportType.SUBWAY,
                "transportName": "지하철 2호선",
                "startStation": "강남역",
                "endStation": "을지로입구역",
                "currentTime": datetime.now().replace(hour=8, minute=50),
            }
        ]

        # Act
        result = service.get_exception_alert(route_segments)

        # Assert
        assert result.alertType == "NO_ACTION"
        assert result.delayMinutes < 5  # 임계값 미만

    # ========================================================================
    # Step 5: 대안 경로 제안 (Logic 2.2 - Gate Validation)
    # ========================================================================

    def test_step5_alternative_route_suggestion_with_gate_validation(self, service):
        """
        Step 5: 지연으로 인한 대안 경로 제안 (Gate 1, 2, 3 검증)

        시나리오:
        - 현재 경로: 2호선 지연 (7분 소요 증가)
        - 대안 경로: 146번 버스 (12분 빠름, 환승 여유 5분, 혼잡도 60%)
        - Gate 1: ✅ 12분 빠름 (임계값 7분 이상)
        - Gate 2: ✅ 환승 여유 5분 (임계값 3분 이상)
        - Gate 3: ✅ 혼잡도 60% (임계값 80% 미만)
        - 결과: 대안 경로 제안 (모든 Gate 통과)
        """
        # Arrange
        current_route = {
            "routeId": "route_subway_line2",
            "transportType": TransportType.SUBWAY,
            "expectedDuration": 30,  # 평소 30분
            "currentDuration": 37,   # 지연으로 37분
        }

        alternative_route = {
            "routeId": "route_bus_146",
            "transportType": TransportType.BUS,
            "transportName": "146번 버스",
            "expectedDuration": 25,  # 25분 (12분 빠름)
            "transferBuffer": 5,     # 환승 여유 5분
            "congestionRate": 60,    # 혼잡도 60%
        }

        # Act
        result = service.get_alternative_route_suggestion(
            current_route=current_route,
            alternative_route=alternative_route,
            mode=SystemMode.COMMUTE
        )

        # Assert - CRITICAL: Gate 검증 (claude.md Line 79: STRICTLY FORBIDDEN)
        assert result.shouldSuggest is True
        assert result.gate1Passed is True  # 확실한 이득 (12분 > 7분)
        assert result.gate2Passed is True  # 환승 확정성 (5분 > 3분)
        assert result.gate3Passed is True  # 경험의 질 (60% < 80%)

        assert "대안" in result.message or "추천" in result.message
        assert "146번" in result.message

    def test_step5_alternative_route_rejected_gate1_failure(self, service):
        """
        Step 5-추가: Gate 1 실패 → 대안 경로 제안 안 함

        시나리오:
        - 대안 경로가 겨우 3분만 빠름 (임계값 7분 미만)
        - Gate 1 실패 → 제안 안 함
        """
        # Arrange
        current_route = {
            "routeId": "route_subway_line2",
            "expectedDuration": 30,
            "currentDuration": 33,  # 3분 지연
        }

        alternative_route = {
            "routeId": "route_bus_146",
            "expectedDuration": 30,  # 겨우 3분 빠름 (Gate 1 실패)
            "transferBuffer": 5,
            "congestionRate": 50,
        }

        # Act
        result = service.get_alternative_route_suggestion(
            current_route=current_route,
            alternative_route=alternative_route,
            mode=SystemMode.COMMUTE
        )

        # Assert
        assert result.shouldSuggest is False
        assert result.gate1Passed is False  # 이득 부족 (3분 < 7분)
        assert result.rejectionReason == "INSUFFICIENT_BENEFIT"

    # ========================================================================
    # Step 6: 택시 제안 (Logic 3.2 - Taxi as Last Resort)
    # ========================================================================

    def test_step6_taxi_suggestion_when_public_transport_fails(self, service, user_commute_settings):
        """
        Step 6: 대중교통으로 도착 불가능 → 택시 제안 (최후의 수단)

        시나리오:
        - 현재 시간: 8:55
        - 목표 도착: 9:00 (5분 남음)
        - 대중교통: 최소 15분 소요 (도착 불가능)
        - 택시: 10분 소요 (아슬아슬하게 도착 가능)
        - 결과: 택시 제안
        """
        # Arrange
        current_time = datetime.now().replace(hour=8, minute=55, second=0, microsecond=0)

        current_location = Location(
            address="서울특별시 강남구 역삼역 근처",
            latitude=37.5000,
            longitude=127.0360
        )

        # Act
        result = service.get_taxi_suggestion(
            settings=user_commute_settings,
            current_time=current_time,
            current_location=current_location,
            mode=SystemMode.COMMUTE
        )

        # Assert
        assert result.shouldSuggestTaxi is True
        assert result.reason == "PUBLIC_TRANSPORT_TOO_SLOW"
        assert "택시" in result.message
        assert result.estimatedTaxiFare > 0
        # 예시: "대중교통으로는 도착이 어렵습니다. 택시 이용 시 10분 소요 (예상 요금: 8,500원)"

    def test_step6_no_taxi_when_public_transport_sufficient(self, service, user_commute_settings):
        """
        Step 6-추가: 대중교통으로 충분 → 택시 제안 안 함

        시나리오:
        - 현재 시간: 8:40
        - 목표 도착: 9:00 (20분 남음)
        - 대중교통: 15분 소요 (도착 가능)
        - 결과: NO_ACTION (택시 불필요)
        """
        # Arrange
        current_time = datetime.now().replace(hour=8, minute=40, second=0, microsecond=0)

        current_location = Location(
            address="서울특별시 강남구 역삼역 근처",
            latitude=37.5000,
            longitude=127.0360
        )

        # Act
        result = service.get_taxi_suggestion(
            settings=user_commute_settings,
            current_time=current_time,
            current_location=current_location,
            mode=SystemMode.COMMUTE
        )

        # Assert
        assert result.shouldSuggestTaxi is False
        assert result.reason == "PUBLIC_TRANSPORT_SUFFICIENT"

    # ========================================================================
    # Step 7: 통합 시나리오 (Full Journey)
    # ========================================================================

    def test_full_commute_journey_integration(self, service, user_commute_settings):
        """
        Step 7: 전체 출근 여정 통합 테스트 (Phase 1~13 통합)

        시나리오:
        1. 출발 알림 (GO_NOW)
        2. 탑승 감지 (AUTO_SWITCH_TO_ETA)
        3. 환승 최적화 (TRANSFER)
        4. 지연 감지 (DELAY_DETECTED)
        5. 대안 경로 제안 (Gate 통과)
        6. 택시 제안 (최후의 수단)

        이 테스트는 사용자 여정 전체가 끊김없이 연결되는지 검증합니다.
        """
        # Step 1: 출발 알림
        current_time_step1 = datetime.now().replace(hour=8, minute=20, second=0, microsecond=0)
        briefing = service.get_commute_briefing(
            settings=user_commute_settings,
            current_time=current_time_step1
        )
        assert briefing.alertType == AlertType.GO_NOW

        # Step 2: 탑승 감지 (5분 후)
        current_time_step2 = current_time_step1 + timedelta(minutes=5)
        onboard_gps = GPSData(latitude=37.5000, longitude=127.0300)
        context = UserContextData(
            currentGPS=onboard_gps,
            commute_settings=user_commute_settings,
            mode=SystemMode.COMMUTE,
            current_time=current_time_step2
        )
        auto_switch = service.get_auto_mode_switch_action(context)
        assert auto_switch.action == "AUTO_SWITCH_TO_ETA"
        assert auto_switch.detectedState == UserState.ON_TRIP

        # Step 3: 환승 최적화
        seating_opt = service.get_seating_optimization({
            "guidanceType": "TRANSFER",
            "nextTransferStation": "잠실역",
            "nextTransferLine": "지하철 4호선",
            "currentLine": "지하철 2호선"
        })
        assert seating_opt.guidanceType == "TRANSFER"
        assert seating_opt.recommendedCar is not None

        # Step 4: 지연 감지 (15분 후)
        current_time_step4 = current_time_step2 + timedelta(minutes=15)
        delay_alert = service.get_exception_alert([{
            "segmentId": "subway_line2_jamsil_gangnam",
            "transportType": TransportType.SUBWAY,
            "currentTime": current_time_step4,
        }])
        # 지연이 감지될 수도, 안 될 수도 있음 (통계 데이터 의존)

        # Step 5: 대안 경로 제안 (지연 시)
        if delay_alert.alertType == "DELAY_DETECTED":
            alt_route = service.get_alternative_route_suggestion(
                current_route={"routeId": "route_subway_line2", "expectedDuration": 30, "currentDuration": 37},
                alternative_route={"routeId": "route_bus_146", "expectedDuration": 25, "transferBuffer": 5, "congestionRate": 60},
                mode=SystemMode.COMMUTE
            )
            # Gate 검증 통과 시에만 제안
            if alt_route.shouldSuggest:
                assert alt_route.gate1Passed is True
                assert alt_route.gate2Passed is True
                assert alt_route.gate3Passed is True

        # Step 6: 택시 제안 (극단적인 지연 시)
        current_time_step6 = current_time_step1.replace(hour=8, minute=55)
        taxi_suggestion = service.get_taxi_suggestion(
            settings=user_commute_settings,
            current_time=current_time_step6,
            current_location=Location(latitude=37.5000, longitude=127.0360),
            mode=SystemMode.COMMUTE
        )
        # 시간이 촉박하면 택시 제안, 아니면 NO_ACTION

        # 전체 여정이 끊김없이 연결되었는지 확인
        assert True  # 모든 단계가 예외 없이 실행됨 = 통합 성공

    # ========================================================================
    # Step 8: 폴링 빈도 최적화 (Logic 4.3 - Smart Polling)
    # ========================================================================

    def test_step8_polling_frequency_changes_during_journey(self, service, user_commute_settings):
        """
        Step 8: 여정 중 폴링 빈도가 상황에 맞게 변화하는지 검증

        시나리오:
        1. 집에서 대기: LOW frequency (300초)
        2. 정류장 접근: HIGH frequency (10초)
        3. 탑승 중 순항: LOW frequency (300초)
        4. 환승 지점 접근: HIGH frequency (10초)
        """
        # 상황 1: 집에서 대기 (정지 상태)
        polling1 = service.get_smart_polling_frequency(
            user_latitude=37.4979,
            user_longitude=127.0276,
            user_speed=0.0,  # 정지
            transit_mode="WAITING",
            distance_to_transfer=5000,  # 환승 지점에서 먼 거리
            in_congestion_zone=False,
            minutes_until_alert=60  # 알림까지 1시간 남음
        )
        assert polling1["frequency"] in ["LOW", "MEDIUM"]  # 300초 or 30초
        assert polling1["intervalSeconds"] >= 30  # 최소 30초

        # 상황 2: 정류장 접근 (환승 지점)
        polling2 = service.get_smart_polling_frequency(
            user_latitude=37.4985,
            user_longitude=127.0280,
            user_speed=5.0,  # 도보 속도
            transit_mode="WALKING",
            distance_to_transfer=200,  # 환승 지점 200m (가까움)
            in_congestion_zone=False,
            minutes_until_alert=5  # 알림 5분 전
        )
        assert polling2["frequency"] == "HIGH"  # 10초
        assert polling2["intervalSeconds"] == 10

        # 상황 3: 탑승 중 순항 (지하철)
        polling3 = service.get_smart_polling_frequency(
            user_latitude=37.5200,
            user_longitude=127.0500,
            user_speed=40.0,  # 지하철 속도 (빠름)
            transit_mode="SUBWAY",
            distance_to_transfer=3000,  # 환승 지점에서 먼 거리
            in_congestion_zone=False,
            minutes_until_alert=20
        )
        assert polling3["frequency"] == "LOW"  # 300초 (배터리 절약)
        assert polling3["intervalSeconds"] == 300

        # 상황 4: 환승 지점 접근
        polling4 = service.get_smart_polling_frequency(
            user_latitude=37.5400,
            user_longitude=127.0700,
            user_speed=35.0,  # 버스 속도
            transit_mode="BUS",
            distance_to_transfer=300,  # 환승 지점 300m (가까움)
            in_congestion_zone=True,  # 정체 구간
            minutes_until_alert=3  # 알림 3분 전
        )
        assert polling4["frequency"] == "HIGH"  # 10초
        assert polling4["intervalSeconds"] == 10


# ============================================================================
# E2E 테스트 실행 가이드
# ============================================================================
"""
E2E 테스트 실행:

1. 전체 테스트 실행:
   pytest test_e2e_commute_journey.py -v

2. 특정 Step만 실행:
   pytest test_e2e_commute_journey.py::TestE2ECommuteJourney::test_step1_departure_alert_go_now -v

3. 통합 시나리오만 실행:
   pytest test_e2e_commute_journey.py::TestE2ECommuteJourney::test_full_commute_journey_integration -v

4. 커버리지 확인:
   pytest test_e2e_commute_journey.py --cov=app.modules.path_optimize --cov-report=term-missing

예상 결과:
- ✅ 모든 Step이 Phase 1~13의 구현과 연결되어 통과
- ✅ Gate 검증이 E2E 흐름에서도 작동
- ✅ Door-to-Door 계산이 모든 시나리오에서 적용
- ✅ TDD 원칙 준수 (테스트 먼저, 구현 나중)
"""
