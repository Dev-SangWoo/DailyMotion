"""
Taxi Suggester Service

Phase 8: Logic 3.2 - 최종 대안 제시 (Taxi as Last Resort)

v3.0 명세서:
- Logic 3.2: 지연으로 인한 지각/막차 놓침 → 택시 제안
  * 출근 모드: 목표 도착 시간 초과 → 택시로 도착 가능한지 판정
  * 퇴근 모드: 막차 놓침 → 택시 제안
  * 택시 호출 CTA (Call-to-Action) 포함
"""

from typing import Dict, Any, Optional
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class TaxiSuggester:
    """
    택시 제안 엔진

    Phase 3.2: Logic 3.2 - 최종 대안 제시
    """

    def __init__(self):
        """TaxiSuggester 초기화"""
        logger.info("✅ TaxiSuggester 초기화")

    # ========================================
    # 출근 모드: 지각 확정 시 택시 제안
    # ========================================

    def suggest_taxi_for_commute(
        self,
        current_time: datetime,
        target_arrival_time: datetime,
        transit_arrival_time: datetime,
        taxi_arrival_time: datetime,
        home_location: Optional[Dict[str, float]] = None,
        current_location: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        출근 모드 택시 제안

        Args:
            current_time: 현재 시각
            target_arrival_time: 목표 도착 시간 (9:00 AM 등)
            transit_arrival_time: 대중교통 예상 도착 시간
            taxi_arrival_time: 택시 예상 도착 시간
            home_location: 현재 위치 (위도, 경도)
            current_location: 현재 위치

        Returns:
            {
                "action": "TAXI_SUGGESTED" or "NO_ACTION",
                "type": "TAXI_COMMUTE_LATENESS_CONFIRMED",
                "message": "지각 확정! ...",
                "priority": "CRITICAL",
                "targetArrivalTime": "09:00",
                "transitArrivalTime": "09:05",
                "taxiArrivalTime": "08:40",
                "delayMinutes": 5,
                "timeBenefit": 25,
                "ctaButton": {...}
            }
        """
        # 1️⃣ 지각 판정
        is_late_with_transit = transit_arrival_time > target_arrival_time
        can_arrive_with_taxi = taxi_arrival_time <= target_arrival_time

        if not is_late_with_transit:
            # 대중교통으로 충분히 도착
            logger.info("✅ 대중교통으로 정상 도착 가능")
            return {
                "action": "NO_ACTION",
                "reason": "대중교통으로 충분히 도착 가능"
            }

        if not can_arrive_with_taxi:
            # 택시도 못 감
            logger.warning("⚠️ 택시도 목표 시간까지 도착 불가능")
            return {
                "action": "NO_ACTION",
                "reason": "택시도 목표 시간까지 도착 불가능"
            }

        # 2️⃣ 택시 제안 구성
        delay_minutes = (transit_arrival_time - target_arrival_time).total_seconds() // 60
        time_benefit = (transit_arrival_time - taxi_arrival_time).total_seconds() // 60

        message = (
            f"🚨지각 확정! 대중교통 이용 시 {transit_arrival_time.strftime('%H:%M')} 도착 예상. "
            f"지금 [택시] 탑승 시 {taxi_arrival_time.strftime('%H:%M')} 도착 가능합니다."
        )

        logger.warning(f"🚕 택시 제안: {message}")

        # 3️⃣ CTA 생성
        latitude = home_location.get("latitude") if home_location else 37.4979
        longitude = home_location.get("longitude") if home_location else 127.0276

        cta_button = {
            "text": "택시 호출하기",
            "action": "CALL_TAXI",
            "deeplink": f"kakaomap://taxi?lat={latitude}&lng={longitude}"
        }

        result = {
            "action": "TAXI_SUGGESTED",
            "type": "TAXI_COMMUTE_LATENESS_CONFIRMED",
            "message": message,
            "priority": "CRITICAL",
            "targetArrivalTime": target_arrival_time.strftime("%H:%M"),
            "transitArrivalTime": transit_arrival_time.strftime("%H:%M"),
            "taxiArrivalTime": taxi_arrival_time.strftime("%H:%M"),
            "delayMinutes": delay_minutes,
            "timeBenefit": time_benefit,
            "ctaButton": cta_button
        }

        return result

    # ========================================
    # 퇴근 모드: 막차 놓침 시 택시 제안
    # ========================================

    def suggest_taxi_for_retreat(
        self,
        current_time: datetime,
        selected_route_choice: str,  # "A", "B", or "C"
        selected_route_name: str,  # "가장 빠르게", "편안하게", etc.
        last_bus_time: datetime,
        first_mile_duration: int,  # 5분 등
        taxi_arrival_time: datetime,
        home_location: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        퇴근 모드 택시 제안

        Args:
            current_time: 현재 시각
            selected_route_choice: 사용자가 선택한 경로 ("A", "B", "C")
            selected_route_name: 경로명 ("가장 빠르게", "편안하게", etc.)
            last_bus_time: 막차 시간
            first_mile_duration: First Mile 도보 시간 (분)
            taxi_arrival_time: 택시 예상 도착 시간
            home_location: 현재 위치

        Returns:
            {
                "action": "TAXI_SUGGESTED" or "NO_ACTION",
                "type": "TAXI_RETREAT_LAST_BUS_MISSED",
                "message": "막차를 놓치셨습니다! ...",
                "priority": "HIGH",
                "routeChoice": "B",
                "routeName": "편안하게 (착석)",
                "lastBusTime": "23:15",
                "expectedArrivalTime": "23:30",
                "taxiArrivalTime": "23:31",
                "ctaButton": {...}
            }
        """
        # 1️⃣ 막차 탈 수 있는지 판정
        deadline_for_last_bus = last_bus_time - timedelta(minutes=first_mile_duration)
        can_catch_last_bus = current_time < deadline_for_last_bus

        if can_catch_last_bus:
            # 아직 막차를 탈 수 있음
            logger.info(f"✅ 아직 막차 탑승 가능 (시간: {deadline_for_last_bus.strftime('%H:%M')})")
            return {
                "action": "NO_ACTION",
                "reason": "아직 막차 탑승 가능"
            }

        # 2️⃣ 택시 제안 구성
        expected_arrival_without_taxi = current_time + timedelta(
            minutes=first_mile_duration + 30  # 임의로 30분 추가
        )

        message = (
            f"⚠️막차를 놓치셨습니다! 선택하신 [{selected_route_choice}. {selected_route_name}]의 막차가 떠났습니다. "
            f"지금 [택시] 탑승 시 귀가 가능합니다."
        )

        logger.warning(f"🚕 택시 제안 (퇴근): {message}")

        # 3️⃣ CTA 생성
        latitude = home_location.get("latitude") if home_location else 37.4979
        longitude = home_location.get("longitude") if home_location else 127.0276

        cta_button = {
            "text": "택시 호출하기",
            "action": "CALL_TAXI",
            "deeplink": f"kakaomap://taxi?lat={latitude}&lng={longitude}"
        }

        result = {
            "action": "TAXI_SUGGESTED",
            "type": "TAXI_RETREAT_LAST_BUS_MISSED",
            "message": message,
            "priority": "HIGH",
            "routeChoice": selected_route_choice,
            "routeName": selected_route_name,
            "lastBusTime": last_bus_time.strftime("%H:%M"),
            "expectedArrivalTime": expected_arrival_without_taxi.strftime("%H:%M"),
            "taxiArrivalTime": taxi_arrival_time.strftime("%H:%M"),
            "ctaButton": cta_button
        }

        return result

    # ========================================
    # 택시 가용성 확인
    # ========================================

    def check_taxi_availability(
        self,
        current_location: Dict[str, float],
        destination: Dict[str, float],
        service_region: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        택시 가용성 확인

        Args:
            current_location: 현재 위치 (latitude, longitude)
            destination: 목적지 (latitude, longitude)
            service_region: 서비스 지역 코드

        Returns:
            {
                "available": True/False,
                "estimatedArrivalMinutes": 5,
                "estimatedTripDuration": 15,
                "reason": "Not available reason if False"
            }
        """
        # 실제 구현에서는 Kakao Map API 또는 Naver API 호출
        # 현재는 Mock 구현
        logger.info(
            f"📍 택시 가용성 확인: "
            f"현재 위치 ({current_location['latitude']}, {current_location['longitude']})"
        )

        # Mock: 항상 사용 가능 (실제로는 API 응답 기반)
        result = {
            "available": True,
            "estimatedArrivalMinutes": 3,  # 3분 후 도착 예상
            "estimatedTripDuration": 18,  # 목적지까지 18분 예상
            "currentLocation": current_location,
            "destination": destination,
            "provider": "kakaomap"
        }

        return result

    # ========================================
    # 택시 제안 여부 종합 판정
    # ========================================

    def should_suggest_taxi_commute(
        self,
        target_arrival_time: datetime,
        transit_arrival_time: datetime,
        taxi_arrival_time: Optional[datetime] = None,
        taxi_available: bool = True
    ) -> bool:
        """
        출근 모드에서 택시 제안할지 판정

        Returns:
            True: 택시 제안 필요
            False: 제안 불필요
        """
        # 대중교통으로 지각할 것인가?
        is_late = transit_arrival_time > target_arrival_time
        if not is_late:
            return False

        # 택시가 가능한가?
        if not taxi_available:
            return False

        # 택시로 도착 가능한가?
        if taxi_arrival_time is None:
            return False

        can_arrive_with_taxi = taxi_arrival_time <= target_arrival_time
        return can_arrive_with_taxi

    def should_suggest_taxi_retreat(
        self,
        current_time: datetime,
        last_bus_time: datetime,
        first_mile_duration: int,
        taxi_available: bool = True
    ) -> bool:
        """
        퇴근 모드에서 택시 제안할지 판정

        Returns:
            True: 택시 제안 필요
            False: 제안 불필요
        """
        # 막차를 탈 수 있는가?
        deadline = last_bus_time - timedelta(minutes=first_mile_duration)
        can_catch_bus = current_time < deadline
        if can_catch_bus:
            return False

        # 택시가 가능한가?
        return taxi_available


# 전역 인스턴스
taxi_suggester = TaxiSuggester()
