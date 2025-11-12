"""
Context Detector Service

Phase 2.1: 자동 모드 전환 (Auto Mode Switch)
GPS 기반 사용자 상태 감지 (Context Awareness)

v3.0 명세서:
- Logic 2.1: GPS 기반 '탑승' 상태 인지 시, '정류장 기준'에서 '최종 목적지(문 앞) 도착 예정 시간'으로 화면 자동 전환
- 사용자 상태 감지: Waiting (대기) / Walking (도보) / OnTrip (탑승)
"""

from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import math
import logging

from app.modules.path_optimize.models import (
    UserState,
    TransportType,
    UserContextData,
    ContextAwarenessResult,
    ScreenSwitchResponse,
    CommuteSettings
)

logger = logging.getLogger(__name__)


class ContextDetector:
    """
    Context Awareness를 통한 사용자 상태 감지

    GPS 위치 정보와 사용자 설정을 기반으로 현재 상태 판단
    """

    # 지구 반지름 (미터)
    EARTH_RADIUS_M = 6371000

    # 상태 판단을 위한 거리 임계값 (미터)
    THRESHOLD_HOME_WAITING = 200      # 집 근처 대기: 200m 이내
    THRESHOLD_WALKING = 800           # 도보 중: 200m ~ 800m
    THRESHOLD_WORK_ARRIVAL = 300      # 회사 도착: 300m 이내

    # GPS 정확도 임계값
    THRESHOLD_GPS_ACCURACY = 50       # 50m 이상 오차면 부정확

    # 버스/지하철 평균 속도 (m/s)
    BUS_SPEED_MS = 10                 # 약 36km/h
    SUBWAY_SPEED_MS = 15              # 약 54km/h
    WALKING_SPEED_MS = 1.4            # 약 5km/h

    def __init__(self):
        """ContextDetector 초기화"""
        logger.info("✅ ContextDetector 초기화")

    # ========================================
    # 거리 계산 (Haversine Formula)
    # ========================================

    def calculate_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        두 지점 간의 직선 거리 계산 (Haversine Formula)

        Args:
            lat1, lon1: 출발점 (위도, 경도)
            lat2, lon2: 도착점 (위도, 경도)

        Returns:
            거리 (미터)

        참고:
        - 실제로는 PostGIS ST_Distance()를 사용하는 것이 정확함
        - 현재는 테스트 목적으로 간단한 계산만 수행
        """
        # 라디안으로 변환
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)

        # 위도/경도 차이
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        # Haversine 공식
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.asin(math.sqrt(a))
        distance = self.EARTH_RADIUS_M * c

        return distance

    # ========================================
    # 사용자 상태 감지
    # ========================================

    def detect_user_state(
        self,
        context: UserContextData
    ) -> UserState:
        """
        GPS 위치와 설정을 기반으로 사용자 상태 감지

        States:
        1. WAITING: 집/회사 근처에서 대기 (움직이지 않음)
        2. WALKING: 집→정류장 또는 역→회사 도보 이동 중
        3. ON_TRIP: 버스/지하철 탑승 중
        4. UNKNOWN: GPS 신호 없음 또는 판단 불가

        Args:
            context: 사용자 컨텍스트 (GPS + 설정)

        Returns:
            UserState: 감지된 사용자 상태
        """
        # 1️⃣ GPS 정확도 확인
        if context.currentGPS.accuracy and context.currentGPS.accuracy > self.THRESHOLD_GPS_ACCURACY:
            logger.warning(f"⚠️ GPS 정확도 부족: {context.currentGPS.accuracy}m")
            return UserState.UNKNOWN

        # 2️⃣ 현재 위치
        current_lat = context.currentGPS.latitude
        current_lon = context.currentGPS.longitude

        # 3️⃣ 집과의 거리
        home_lat = context.commute_settings.homeLatitude
        home_lon = context.commute_settings.homeLongitude

        if home_lat and home_lon:
            distance_to_home = self.calculate_distance(
                current_lat, current_lon,
                home_lat, home_lon
            )
        else:
            distance_to_home = float('inf')

        # 4️⃣ 회사와의 거리
        work_lat = context.commute_settings.workLatitude
        work_lon = context.commute_settings.workLongitude

        if work_lat and work_lon:
            distance_to_work = self.calculate_distance(
                current_lat, current_lon,
                work_lat, work_lon
            )
        else:
            distance_to_work = float('inf')

        # 5️⃣ 상태 판단 로직
        # 집 근처 → WAITING
        if distance_to_home <= self.THRESHOLD_HOME_WAITING:
            logger.info(f"✅ 상태: WAITING (집 근처, 거리: {distance_to_home:.0f}m)")
            return UserState.WAITING

        # 회사 근처 → WAITING
        if distance_to_work <= self.THRESHOLD_WORK_ARRIVAL:
            logger.info(f"✅ 상태: WAITING (회사 근처, 거리: {distance_to_work:.0f}m)")
            return UserState.WAITING

        # 집과 회사 사이, 가까운 곳이 800m 이상 → ON_TRIP (탑승 중)
        min_distance = min(distance_to_home, distance_to_work)
        if min_distance > self.THRESHOLD_WALKING:
            logger.info(f"✅ 상태: ON_TRIP (탑승 중, 가까운 지점까지 {min_distance:.0f}m)")
            return UserState.ON_TRIP

        # 집과 회사 사이, 200m ~ 800m → WALKING (도보 중)
        logger.info(f"✅ 상태: WALKING (도보 중, 가까운 지점까지 {min_distance:.0f}m)")
        return UserState.WALKING

    # ========================================
    # 탑승 중인 교통수단 감지
    # ========================================

    def detect_current_vehicle(
        self,
        context: UserContextData
    ) -> Optional[TransportType]:
        """
        현재 탑승 중인 교통수단 추정

        현재는 간단한 휴리스틱만 적용
        - 출근 모드에서 ON_TRIP 상태 → BUS (기본값)
        - 실제로는 Bluetooth, WiFi 신호 또는 실시간 API로 감지 필요

        Args:
            context: 사용자 컨텍스트

        Returns:
            TransportType: 추정된 교통수단 (또는 None)
        """
        state = self.detect_user_state(context)

        if state != UserState.ON_TRIP:
            return None

        # 현재는 BUS를 기본값으로 반환
        # TODO: 실제 교통수단 감지 (Bluetooth, 실시간 API 연동)
        logger.info("🚌 추정 교통수단: BUS (기본값)")
        return TransportType.BUS

    # ========================================
    # ETA 계산
    # ========================================

    def calculate_eta_to_destination(
        self,
        context: UserContextData
    ) -> Optional[int]:
        """
        현재 위치에서 최종 목적지(회사)까지의 예상 도착 시간

        Args:
            context: 사용자 컨텍스트

        Returns:
            예상 시간 (분) 또는 None (판단 불가)

        계산 로직:
        1. 현재 상태 감지
        2. 상태별 남은 거리 계산
        3. 상태별 평균 속도로 시간 추정
        """
        state = self.detect_user_state(context)

        # 현재 위치
        current_lat = context.currentGPS.latitude
        current_lon = context.currentGPS.longitude

        # 회사 위치
        work_lat = context.commute_settings.workLatitude
        work_lon = context.commute_settings.workLongitude

        if not (work_lat and work_lon):
            logger.warning("⚠️ 회사 좌표 없음")
            return None

        # 현재 위치에서 회사까지의 직선 거리
        distance_to_work = self.calculate_distance(
            current_lat, current_lon,
            work_lat, work_lon
        )

        # 상태별 ETA 계산
        if state == UserState.WAITING:
            # 대기 중: First Mile + 탑승 시간 포함
            first_mile = context.commute_settings.firstMileDefaultDuration  # 분
            # 대기 상태에서는 정확한 ETA 계산 어려움
            logger.info(f"⏳ 상태: WAITING - ETA 계산 불가")
            return None

        elif state == UserState.WALKING:
            # 도보 중: 걷기 속도로 계산
            walking_time_seconds = distance_to_work / self.WALKING_SPEED_MS
            walking_time_minutes = int(walking_time_seconds / 60)
            logger.info(f"🚶 상태: WALKING - ETA: {walking_time_minutes}분")
            return walking_time_minutes

        elif state == UserState.ON_TRIP:
            # 탑승 중: 버스 속도로 계산 + Last Mile
            vehicle = self.detect_current_vehicle(context)
            speed = self.BUS_SPEED_MS if vehicle == TransportType.BUS else self.SUBWAY_SPEED_MS
            transit_time_seconds = distance_to_work / speed
            transit_time_minutes = int(transit_time_seconds / 60)
            last_mile = context.commute_settings.lastMileDefaultDuration  # 분
            total_minutes = transit_time_minutes + last_mile
            logger.info(f"🚌 상태: ON_TRIP - ETA: {total_minutes}분 (탑승 {transit_time_minutes}분 + Last Mile {last_mile}분)")
            return total_minutes

        else:  # UNKNOWN
            logger.warning("⚠️ 상태: UNKNOWN - ETA 계산 불가")
            return None

    # ========================================
    # Context Awareness 통합 분석
    # ========================================

    def analyze_context(
        self,
        context: UserContextData
    ) -> ContextAwarenessResult:
        """
        사용자 컨텍스트 종합 분석

        GPS 위치 + 설정 정보를 기반으로 현재 상태, 교통수단, ETA, 화면 전환 여부 판단

        Args:
            context: 사용자 컨텍스트

        Returns:
            ContextAwarenessResult: 분석 결과
        """
        # 1️⃣ 사용자 상태 감지
        state = self.detect_user_state(context)

        # 2️⃣ 탑승 중인 교통수단 감지
        vehicle = self.detect_current_vehicle(context)

        # 3️⃣ 회사까지의 거리 계산
        current_lat = context.currentGPS.latitude
        current_lon = context.currentGPS.longitude
        work_lat = context.commute_settings.workLatitude
        work_lon = context.commute_settings.workLongitude

        if work_lat and work_lon:
            distance_to_work = self.calculate_distance(
                current_lat, current_lon,
                work_lat, work_lon
            )
        else:
            distance_to_work = 0

        # 4️⃣ ETA 계산
        eta_minutes = self.calculate_eta_to_destination(context)

        # 5️⃣ 화면 전환 필요 여부 판단
        screen_switch_needed = state == UserState.ON_TRIP
        switch_message = None

        if screen_switch_needed and eta_minutes:
            switch_message = f"탑승 감지! 직장 도착까지 약 {eta_minutes}분 남았습니다."
            logger.info(f"🔄 화면 전환 필요: {switch_message}")

        # 6️⃣ ETA 시간 계산
        estimated_arrival_time = None
        if eta_minutes:
            arrival = datetime.now() + timedelta(minutes=eta_minutes)
            estimated_arrival_time = arrival.strftime("%H:%M:%S")

        # 7️⃣ 결과 생성
        result = ContextAwarenessResult(
            state=state,
            currentVehicle=vehicle,
            distanceToWork=distance_to_work,
            estimatedArrivalTime=estimated_arrival_time,
            estimatedMinutes=eta_minutes,
            screenSwitchNeeded=screen_switch_needed,
            switchMessage=switch_message
        )

        logger.info(f"✅ Context Awareness 분석 완료: {result.state.value}")
        return result

    # ========================================
    # 화면 전환 응답 생성
    # ========================================

    def generate_screen_switch_response(
        self,
        context: UserContextData,
        analysis_result: ContextAwarenessResult
    ) -> Optional[Dict[str, Any]]:
        """
        화면 자동 전환 응답 생성

        탑승 감지 시 클라이언트에 반환할 응답 구성

        Args:
            context: 사용자 컨텍스트
            analysis_result: Context Awareness 분석 결과

        Returns:
            화면 전환 응답 (또는 None)
        """
        if not analysis_result.screenSwitchNeeded:
            return None

        if not analysis_result.estimatedMinutes:
            return None

        response = ScreenSwitchResponse(
            action="AUTO_SWITCH_TO_ETA",
            destinationArrivalTime=analysis_result.estimatedArrivalTime or "unknown",
            estimatedMinutes=analysis_result.estimatedMinutes,
            currentLocation={
                "latitude": context.currentGPS.latitude,
                "longitude": context.currentGPS.longitude
            },
            destination={
                "address": context.commute_settings.workAddress,
                "latitude": context.commute_settings.workLatitude or 0,
                "longitude": context.commute_settings.workLongitude or 0
            }
        )

        logger.info(f"✅ 화면 전환 응답 생성: {response.action}")
        return response.dict()


# 전역 인스턴스
context_detector = ContextDetector()
