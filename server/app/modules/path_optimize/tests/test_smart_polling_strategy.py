"""
Smart Polling Strategy Tests

Phase 10: 배터리/데이터 최적화 폴링 전략

v3.0 명세서:
- Logic 4.3: 상태별 폴링 빈도 적응
  * High Frequency (10초): 환승 지점 접근, 정체 구간, 알림 직전
  * Medium Frequency (30초): 일반 이동 중
  * Low Frequency (5분): 순항 구간, 정지 상태
"""

import pytest
from enum import Enum
from typing import Dict, Any
from datetime import datetime, timedelta


# ===========================
# Polling Frequency Enum
# ===========================

class PollingFrequency(Enum):
    """폴링 빈도 열거형"""
    HIGH = 10  # 초 단위
    MEDIUM = 30
    LOW = 300  # 5분


# ===========================
# User State Model
# ===========================

class UserLocation:
    """사용자 위치 정보"""
    def __init__(
        self,
        latitude: float,
        longitude: float,
        speed: float = 0.0,
    ):
        self.latitude = latitude
        self.longitude = longitude
        self.speed = speed  # km/h


class TransitState:
    """대중교통 상태"""
    def __init__(
        self,
        mode: str,  # "SUBWAY", "BUS", "WALKING"
        estimated_duration: int = 0,  # 분 단위
        distance_to_transfer: float = float("inf"),  # 미터 단위
        in_congestion_zone: bool = False,
    ):
        self.mode = mode
        self.estimated_duration = estimated_duration
        self.distance_to_transfer = distance_to_transfer
        self.in_congestion_zone = in_congestion_zone


class AlertState:
    """알림 상태"""
    def __init__(
        self,
        has_go_now: bool = False,  # 출발 알림 (15분 이상)
        has_last_chance: bool = False,  # 마지노선 경고 (0~15분)
        minutes_until_alert: int = float("inf"),
    ):
        self.has_go_now = has_go_now
        self.has_last_chance = has_last_chance
        self.minutes_until_alert = minutes_until_alert


# ===========================
# Smart Polling Scheduler
# ===========================

class PollingScheduler:
    """스마트 폴링 스케줄러"""

    def __init__(self):
        """PollingScheduler 초기화"""
        pass

    # ========================================
    # 폴링 빈도 계산
    # ========================================

    def calculate_polling_frequency(
        self,
        location: UserLocation,
        transit_state: TransitState,
        alert_state: AlertState,
    ) -> Dict[str, Any]:
        """
        현재 상태 기반 폴링 빈도 계산

        Args:
            location: 사용자 위치
            transit_state: 대중교통 상태
            alert_state: 알림 상태

        Returns:
            {
                "frequency": PollingFrequency,
                "intervalSeconds": 10|30|300,
                "reason": "환승 지점 접근" | "정체 구간" | "알림 직전" | "일반 이동" | "순항 구간" | "정지 상태",
                "nextCheckTime": "ISO 8601 timestamp"
            }
        """
        frequency = PollingFrequency.MEDIUM
        reason = "기본값"

        # 1️⃣ High Frequency 조건 확인
        # - 환승 지점 접근 (500m 이내)
        if transit_state.distance_to_transfer < 500:
            frequency = PollingFrequency.HIGH
            reason = "환승 지점 접근"

        # - 주요 정체 구간
        elif transit_state.in_congestion_zone:
            frequency = PollingFrequency.HIGH
            reason = "정체 구간"

        # - 출발/마지노선 알림 직전 (3분 이내)
        elif alert_state.minutes_until_alert <= 3:
            frequency = PollingFrequency.HIGH
            reason = "알림 직전"

        # 2️⃣ Low Frequency 조건 확인
        # - 순항 구간 (지하철 또는 고속도로, 정속도)
        elif transit_state.mode in ["SUBWAY", "TRAIN"] and location.speed > 30:
            frequency = PollingFrequency.LOW
            reason = "순항 구간 (지하철)"

        # - 정지 상태 (회사/집)
        elif location.speed == 0:
            frequency = PollingFrequency.LOW
            reason = "정지 상태"

        # 3️⃣ 일반 이동 중 (Medium Frequency)
        else:
            frequency = PollingFrequency.MEDIUM
            reason = "일반 이동"

        # 다음 폴링 시간 계산
        next_check_time = (
            datetime.utcnow() + timedelta(seconds=frequency.value)
        ).isoformat()

        result = {
            "frequency": frequency,
            "intervalSeconds": frequency.value,
            "reason": reason,
            "nextCheckTime": next_check_time,
        }

        return result

    def should_poll_now(
        self,
        last_poll_time: datetime,
        frequency: PollingFrequency,
    ) -> bool:
        """
        현재 폴링을 수행할지 여부 결정

        Args:
            last_poll_time: 마지막 폴링 시간
            frequency: 폴링 빈도

        Returns:
            폴링 수행 여부
        """
        elapsed_seconds = (datetime.utcnow() - last_poll_time).total_seconds()
        return elapsed_seconds >= frequency.value

    def should_recalculate_frequency(
        self,
        last_frequency_calc_time: datetime,
        recalc_interval_seconds: int = 5,
    ) -> bool:
        """
        폴링 빈도를 재계산할지 여부 결정

        Args:
            last_frequency_calc_time: 마지막 빈도 재계산 시간
            recalc_interval_seconds: 재계산 간격 (초)

        Returns:
            빈도 재계산 여부
        """
        elapsed_seconds = (
            datetime.utcnow() - last_frequency_calc_time
        ).total_seconds()
        return elapsed_seconds >= recalc_interval_seconds


# ===========================
# Tests: High Frequency
# ===========================

class TestSmartPollingHighFrequency:
    """High Frequency 폴링 테스트"""

    def test_high_frequency_when_near_transfer_point(self):
        """환승 지점 접근 시 High Frequency 반환"""
        scheduler = PollingScheduler()

        location = UserLocation(latitude=37.5, longitude=127.0, speed=20)
        transit_state = TransitState(
            mode="BUS",
            estimated_duration=10,
            distance_to_transfer=200,  # 200m (500m 이내)
        )
        alert_state = AlertState(minutes_until_alert=10)

        result = scheduler.calculate_polling_frequency(
            location, transit_state, alert_state
        )

        assert result["frequency"] == PollingFrequency.HIGH
        assert result["intervalSeconds"] == 10
        assert "환승 지점 접근" in result["reason"]

    def test_high_frequency_in_congestion_zone(self):
        """정체 구간 진입 시 High Frequency 반환"""
        scheduler = PollingScheduler()

        location = UserLocation(latitude=37.5, longitude=127.0, speed=10)
        transit_state = TransitState(
            mode="BUS",
            estimated_duration=15,
            distance_to_transfer=1000,
            in_congestion_zone=True,  # 정체 구간
        )
        alert_state = AlertState(minutes_until_alert=20)

        result = scheduler.calculate_polling_frequency(
            location, transit_state, alert_state
        )

        assert result["frequency"] == PollingFrequency.HIGH
        assert result["intervalSeconds"] == 10
        assert "정체 구간" in result["reason"]

    def test_high_frequency_before_alert(self):
        """알림 직전 (3분 이내) High Frequency 반환"""
        scheduler = PollingScheduler()

        location = UserLocation(latitude=37.5, longitude=127.0, speed=30)
        transit_state = TransitState(
            mode="SUBWAY",
            estimated_duration=2,
            distance_to_transfer=2000,
        )
        alert_state = AlertState(minutes_until_alert=2)  # 2분 남음

        result = scheduler.calculate_polling_frequency(
            location, transit_state, alert_state
        )

        assert result["frequency"] == PollingFrequency.HIGH
        assert result["intervalSeconds"] == 10
        assert "알림 직전" in result["reason"]

    def test_high_frequency_response_structure(self):
        """High Frequency 응답 구조 검증"""
        scheduler = PollingScheduler()

        location = UserLocation(latitude=37.5, longitude=127.0)
        transit_state = TransitState(
            mode="BUS", distance_to_transfer=300
        )
        alert_state = AlertState()

        result = scheduler.calculate_polling_frequency(
            location, transit_state, alert_state
        )

        # 필수 필드 확인
        assert "frequency" in result
        assert "intervalSeconds" in result
        assert "reason" in result
        assert "nextCheckTime" in result

        # 타입 확인
        assert isinstance(result["frequency"], PollingFrequency)
        assert isinstance(result["intervalSeconds"], int)
        assert isinstance(result["reason"], str)


# ===========================
# Tests: Low Frequency
# ===========================

class TestSmartPollingLowFrequency:
    """Low Frequency 폴링 테스트"""

    def test_low_frequency_in_subway_cruise(self):
        """지하철 순항 구간 Low Frequency 반환"""
        scheduler = PollingScheduler()

        location = UserLocation(
            latitude=37.5, longitude=127.0, speed=40
        )  # 40km/h
        transit_state = TransitState(
            mode="SUBWAY",
            estimated_duration=10,
            distance_to_transfer=5000,
        )
        alert_state = AlertState(minutes_until_alert=15)

        result = scheduler.calculate_polling_frequency(
            location, transit_state, alert_state
        )

        assert result["frequency"] == PollingFrequency.LOW
        assert result["intervalSeconds"] == 300
        assert "순항 구간" in result["reason"]

    def test_low_frequency_at_stationary_state(self):
        """정지 상태 Low Frequency 반환"""
        scheduler = PollingScheduler()

        location = UserLocation(
            latitude=37.5, longitude=127.0, speed=0
        )  # 정지 상태
        transit_state = TransitState(
            mode="WAITING",
            estimated_duration=0,
            distance_to_transfer=float("inf"),
        )
        alert_state = AlertState(minutes_until_alert=float("inf"))

        result = scheduler.calculate_polling_frequency(
            location, transit_state, alert_state
        )

        assert result["frequency"] == PollingFrequency.LOW
        assert result["intervalSeconds"] == 300
        assert "정지 상태" in result["reason"]


# ===========================
# Tests: Medium Frequency
# ===========================

class TestSmartPollingMediumFrequency:
    """Medium Frequency 폴링 테스트"""

    def test_medium_frequency_during_normal_movement(self):
        """일반 이동 중 Medium Frequency 반환"""
        scheduler = PollingScheduler()

        location = UserLocation(
            latitude=37.5, longitude=127.0, speed=20
        )
        transit_state = TransitState(
            mode="BUS",
            estimated_duration=20,
            distance_to_transfer=2000,
        )
        alert_state = AlertState(minutes_until_alert=15)

        result = scheduler.calculate_polling_frequency(
            location, transit_state, alert_state
        )

        assert result["frequency"] == PollingFrequency.MEDIUM
        assert result["intervalSeconds"] == 30
        assert "일반 이동" in result["reason"]


# ===========================
# Tests: should_poll_now
# ===========================

class TestShouldPollNow:
    """폴링 수행 여부 결정 테스트"""

    def test_should_poll_high_frequency_after_10_seconds(self):
        """High Frequency: 10초 경과 후 폴링"""
        scheduler = PollingScheduler()

        last_poll_time = datetime.utcnow() - timedelta(seconds=10)
        should_poll = scheduler.should_poll_now(
            last_poll_time, PollingFrequency.HIGH
        )

        assert should_poll is True

    def test_should_not_poll_high_frequency_before_10_seconds(self):
        """High Frequency: 10초 미경과 시 폴링 안함"""
        scheduler = PollingScheduler()

        last_poll_time = datetime.utcnow() - timedelta(seconds=5)
        should_poll = scheduler.should_poll_now(
            last_poll_time, PollingFrequency.HIGH
        )

        assert should_poll is False

    def test_should_poll_low_frequency_after_300_seconds(self):
        """Low Frequency: 300초(5분) 경과 후 폴링"""
        scheduler = PollingScheduler()

        last_poll_time = datetime.utcnow() - timedelta(seconds=300)
        should_poll = scheduler.should_poll_now(
            last_poll_time, PollingFrequency.LOW
        )

        assert should_poll is True

    def test_should_not_poll_low_frequency_before_300_seconds(self):
        """Low Frequency: 300초 미경과 시 폴링 안함"""
        scheduler = PollingScheduler()

        last_poll_time = datetime.utcnow() - timedelta(seconds=200)
        should_poll = scheduler.should_poll_now(
            last_poll_time, PollingFrequency.LOW
        )

        assert should_poll is False


# ===========================
# Tests: Frequency Recalculation
# ===========================

class TestFrequencyRecalculation:
    """폴링 빈도 재계산 테스트"""

    def test_should_recalculate_after_5_seconds(self):
        """5초 경과 후 빈도 재계산"""
        scheduler = PollingScheduler()

        last_calc_time = datetime.utcnow() - timedelta(seconds=5)
        should_recalc = scheduler.should_recalculate_frequency(last_calc_time)

        assert should_recalc is True

    def test_should_not_recalculate_before_5_seconds(self):
        """5초 미경과 시 재계산 안함"""
        scheduler = PollingScheduler()

        last_calc_time = datetime.utcnow() - timedelta(seconds=2)
        should_recalc = scheduler.should_recalculate_frequency(last_calc_time)

        assert should_recalc is False

    def test_custom_recalculation_interval(self):
        """커스텀 재계산 간격 테스트"""
        scheduler = PollingScheduler()

        last_calc_time = datetime.utcnow() - timedelta(seconds=15)
        should_recalc = scheduler.should_recalculate_frequency(
            last_calc_time, recalc_interval_seconds=10
        )

        assert should_recalc is True


# ===========================
# Tests: Integration
# ===========================

class TestSmartPollingIntegration:
    """스마트 폴링 통합 테스트"""

    def test_full_polling_cycle(self):
        """전체 폴링 사이클 테스트"""
        scheduler = PollingScheduler()

        # 1️⃣ 초기 상태: 일반 이동 (Medium)
        location = UserLocation(latitude=37.5, longitude=127.0, speed=20)
        transit_state = TransitState(
            mode="BUS", distance_to_transfer=2000
        )
        alert_state = AlertState(minutes_until_alert=15)

        result = scheduler.calculate_polling_frequency(
            location, transit_state, alert_state
        )
        assert result["frequency"] == PollingFrequency.MEDIUM

        # 2️⃣ 환승 지점 접근 (High)
        transit_state.distance_to_transfer = 300
        result = scheduler.calculate_polling_frequency(
            location, transit_state, alert_state
        )
        assert result["frequency"] == PollingFrequency.HIGH

        # 3️⃣ 탑승 후 지하철 순항 (Low)
        location.speed = 40
        transit_state.mode = "SUBWAY"
        transit_state.distance_to_transfer = 5000
        result = scheduler.calculate_polling_frequency(
            location, transit_state, alert_state
        )
        assert result["frequency"] == PollingFrequency.LOW

    def test_frequency_change_triggers_recalculation(self):
        """빈도 변경 시 재계산 트리거"""
        scheduler = PollingScheduler()

        # 첫 번째 계산
        last_frequency_calc = datetime.utcnow()

        # 2초 경과: 재계산 필요 없음
        assert (
            scheduler.should_recalculate_frequency(
                last_frequency_calc, recalc_interval_seconds=5
            )
            is False
        )

        # 6초 경과: 재계산 필요
        last_frequency_calc = datetime.utcnow() - timedelta(seconds=6)
        assert (
            scheduler.should_recalculate_frequency(
                last_frequency_calc, recalc_interval_seconds=5
            )
            is True
        )

    def test_priority_of_conditions(self):
        """조건 우선순위 테스트 (환승 > 정체 > 알림 > 기본)"""
        scheduler = PollingScheduler()

        # 환승 지점 접근 (High) vs 알림 직전 (High): 환승 우선
        location = UserLocation(latitude=37.5, longitude=127.0, speed=20)
        transit_state = TransitState(
            mode="BUS",
            distance_to_transfer=300,  # 환승 접근
            in_congestion_zone=False,
        )
        alert_state = AlertState(minutes_until_alert=2)  # 알림 직전

        result = scheduler.calculate_polling_frequency(
            location, transit_state, alert_state
        )
        # 첫 번째로 체크되는 환승 지점 조건에서 High Frequency
        assert result["frequency"] == PollingFrequency.HIGH
        assert "환승 지점 접근" in result["reason"]
