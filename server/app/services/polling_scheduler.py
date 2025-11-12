"""
Polling Scheduler Service

Phase 10: 배터리/데이터 최적화 폴링 전략

v3.0 명세서:
- Logic 4.3: 상태별 폴링 빈도 적응
  * High Frequency (10초): 환승 지점 접근, 정체 구간, 알림 직전
  * Medium Frequency (30초): 일반 이동 중
  * Low Frequency (5분): 순항 구간, 정지 상태
"""

from enum import Enum
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


# ===========================
# Polling Frequency Enum
# ===========================

class PollingFrequency(Enum):
    """폴링 빈도 열거형"""
    HIGH = 10  # 초 단위
    MEDIUM = 30
    LOW = 300  # 5분


# ===========================
# User State Models
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
        mode: str,  # "SUBWAY", "BUS", "WALKING", "TRAIN"
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
# Polling Scheduler Service
# ===========================

class PollingScheduler:
    """
    스마트 폴링 스케줄러

    Phase 10: 배터리/데이터 최적화를 위한 적응형 폴링 전략
    """

    # 트리거 설정
    TRANSFER_PROXIMITY_THRESHOLD = 500  # 환승 지점 접근 (미터)
    ALERT_PROXIMITY_THRESHOLD = 3  # 알림 직전 (분)
    SUBWAY_CRUISE_MIN_SPEED = 30  # 순항 최소 속도 (km/h)

    def __init__(self):
        """PollingScheduler 초기화"""
        logger.info("✅ PollingScheduler 초기화")

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

        우선순위:
        1. 환승 지점 접근 (500m 이내) → High
        2. 주요 정체 구간 → High
        3. 출발/마지노선 알림 직전 (3분 이내) → High
        4. 지하철 순항 구간 (30km/h 이상) → Low
        5. 정지 상태 (0km/h) → Low
        6. 기타 → Medium

        Args:
            location: 사용자 위치
            transit_state: 대중교통 상태
            alert_state: 알림 상태

        Returns:
            {
                "frequency": PollingFrequency,
                "intervalSeconds": int,
                "reason": str,
                "nextCheckTime": str (ISO 8601)
            }
        """
        frequency = PollingFrequency.MEDIUM
        reason = "기본값"

        # 1️⃣ High Frequency 조건 확인 (우선순위 순)
        # - 환승 지점 접근 (500m 이내)
        if transit_state.distance_to_transfer < self.TRANSFER_PROXIMITY_THRESHOLD:
            frequency = PollingFrequency.HIGH
            reason = "환승 지점 접근"
            logger.info(
                f"🔴 High Frequency (환승 지점): "
                f"{transit_state.distance_to_transfer:.0f}m 남음"
            )

        # - 주요 정체 구간
        elif transit_state.in_congestion_zone:
            frequency = PollingFrequency.HIGH
            reason = "정체 구간"
            logger.info("🔴 High Frequency (정체 구간)")

        # - 출발/마지노선 알림 직전 (3분 이내)
        elif alert_state.minutes_until_alert <= self.ALERT_PROXIMITY_THRESHOLD:
            frequency = PollingFrequency.HIGH
            reason = "알림 직전"
            logger.info(
                f"🔴 High Frequency (알림 직전): {alert_state.minutes_until_alert}분 남음"
            )

        # 2️⃣ Low Frequency 조건 확인
        # - 순항 구간 (지하철/기차, 30km/h 이상)
        elif (
            transit_state.mode in ["SUBWAY", "TRAIN"]
            and location.speed >= self.SUBWAY_CRUISE_MIN_SPEED
        ):
            frequency = PollingFrequency.LOW
            reason = "순항 구간 (지하철)"
            logger.info(
                f"🟢 Low Frequency (순항): {transit_state.mode} "
                f"@ {location.speed}km/h"
            )

        # - 정지 상태 (0km/h)
        elif location.speed == 0:
            frequency = PollingFrequency.LOW
            reason = "정지 상태"
            logger.info("🟢 Low Frequency (정지 상태)")

        # 3️⃣ 일반 이동 중 (Medium Frequency - 기본값)
        else:
            frequency = PollingFrequency.MEDIUM
            reason = "일반 이동"
            logger.info(f"🟡 Medium Frequency (일반 이동): {location.speed}km/h")

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

    # ========================================
    # 폴링 실행 여부 결정
    # ========================================

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
        should_poll = elapsed_seconds >= frequency.value

        if should_poll:
            logger.info(
                f"✅ 폴링 실행: {elapsed_seconds:.1f}초 경과 "
                f"(임계값: {frequency.value}초)"
            )
        # else:
        #     logger.debug(f"⏳ 폴링 대기: {elapsed_seconds:.1f}초 경과 / {frequency.value}초")

        return should_poll

    # ========================================
    # 폴링 빈도 재계산 여부 결정
    # ========================================

    def should_recalculate_frequency(
        self,
        last_frequency_calc_time: datetime,
        recalc_interval_seconds: int = 5,
    ) -> bool:
        """
        폴링 빈도를 재계산할지 여부 결정

        사용자 상태가 변할 수 있으므로, 일정 간격마다 폴링 빈도를 재계산한다.

        Args:
            last_frequency_calc_time: 마지막 빈도 재계산 시간
            recalc_interval_seconds: 재계산 간격 (초, 기본값: 5초)

        Returns:
            빈도 재계산 여부
        """
        elapsed_seconds = (
            datetime.utcnow() - last_frequency_calc_time
        ).total_seconds()
        should_recalc = elapsed_seconds >= recalc_interval_seconds

        if should_recalc:
            logger.info(
                f"🔄 빈도 재계산: {elapsed_seconds:.1f}초 경과 "
                f"(재계산 간격: {recalc_interval_seconds}초)"
            )

        return should_recalc

    # ========================================
    # 메타데이터 조회
    # ========================================

    def get_frequency_metadata(self, frequency: PollingFrequency) -> Dict[str, Any]:
        """
        폴링 빈도별 메타데이터 반환

        Args:
            frequency: 폴링 빈도

        Returns:
            빈도 정보 및 메타데이터
        """
        metadata = {
            "HIGH": {
                "intervalSeconds": 10,
                "description": "높은 빈도 폴링 (10초)",
                "useCases": [
                    "환승 지점 접근 (500m 이내)",
                    "정체 구간 진입",
                    "출발/마지노선 알림 직전 (3분 이내)",
                ],
                "batteryImpact": "높음 (최대 배터리 사용)",
                "estimatedBatteryDrainPerHour": "5-10% (배터리 상태에 따라 다름)",
            },
            "MEDIUM": {
                "intervalSeconds": 30,
                "description": "중간 빈도 폴링 (30초)",
                "useCases": [
                    "일반 대중교통 이동 중",
                    "버스/도로 주행",
                ],
                "batteryImpact": "중간",
                "estimatedBatteryDrainPerHour": "2-3%",
            },
            "LOW": {
                "intervalSeconds": 300,
                "description": "낮은 빈도 폴링 (5분)",
                "useCases": [
                    "지하철 순항 구간 (30km/h 이상)",
                    "정지 상태 (회사/집)",
                ],
                "batteryImpact": "낮음 (배터리 절약)",
                "estimatedBatteryDrainPerHour": "0.5-1%",
            },
        }

        return metadata.get(frequency.name, {})

    def get_polling_status(
        self,
        current_frequency: PollingFrequency,
        last_poll_time: datetime,
        last_calc_time: datetime,
    ) -> Dict[str, Any]:
        """
        현재 폴링 상태 조회

        Args:
            current_frequency: 현재 폴링 빈도
            last_poll_time: 마지막 폴링 시간
            last_calc_time: 마지막 빈도 재계산 시간

        Returns:
            폴링 상태 정보
        """
        now = datetime.utcnow()
        elapsed_since_poll = (now - last_poll_time).total_seconds()
        elapsed_since_calc = (now - last_calc_time).total_seconds()

        status = {
            "currentFrequency": current_frequency.name,
            "intervalSeconds": current_frequency.value,
            "elapsedSincePoll": elapsed_since_poll,
            "timeUntilNextPoll": max(
                0, current_frequency.value - elapsed_since_poll
            ),
            "elapsedSinceFrequencyRecalc": elapsed_since_calc,
            "shouldPollNow": self.should_poll_now(last_poll_time, current_frequency),
            "shouldRecalculateFrequency": self.should_recalculate_frequency(last_calc_time),
            "timestamp": now.isoformat(),
        }

        return status


# 전역 인스턴스
polling_scheduler = PollingScheduler()
