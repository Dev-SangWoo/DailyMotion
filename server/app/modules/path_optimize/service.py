"""
경로 최적화 서비스
최적의 경로를 계산하는 비즈니스 로직입니다.

v3.0 명세서:
- Logic 1.1: 출발 알림
- Logic 1.2: 마지노선 경고 (출근 모드 & 퇴근 모드)
- Logic 2.1: 자동 모드 전환 (Context Awareness)
- Logic 2.2: 고신뢰 대안 경로 제안
- Logic 2.3: 탑승/환승 최적화 가이드
- Logic 3.1: 돌발상황 감지 (지연 감지)
- Logic 3.2: 최종 대안 제시 (택시 제안)
- Logic 4.1: 퇴근 모드 사용자 목표 설정 (Phase 9)
- Logic 4.2: 퇴근 목표별 경로 제안 (Phase 9)
- Logic 4.3: 배터리 최적화 폴링 전략 (Phase 10)
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, time
import logging

from app.services.context_detector import context_detector
from app.services.gate_validator import gate_validator
from app.services.seating_optimizer import seating_optimizer
from app.services.delay_detector import delay_detector
from app.services.taxi_suggester import taxi_suggester
from app.services.retreat_mode_handler import retreat_mode_handler
from app.services.route_selector_by_goal import route_selector_by_goal
from app.services.polling_scheduler import (
    polling_scheduler,
    PollingFrequency,
    UserLocation,
    TransitState,
    AlertState,
)
from app.modules.path_optimize.models import (
    UserContextData,
    SystemMode,
    TransportType
)

logger = logging.getLogger(__name__)


class PathOptimizeService:
    """경로 최적화 서비스 클래스"""
    
    def optimize_path(
        self,
        start_point: Dict[str, Any],
        end_point: Dict[str, Any],
        constraints: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        경로를 최적화합니다.
        
        Args:
            start_point: 시작 지점
            end_point: 종료 지점
            constraints: 제약 조건 (예: 위험 지역 회피)
            
        Returns:
            최적화된 경로
        """
        # TODO: 실제 경로 최적화 로직 구현
        # - PostGIS를 사용한 공간 쿼리
        # - 위험 지역 회피
        # - 최단 경로 계산
        return {
            "optimized_path": [],
            "distance": 0,
            "estimated_time": 0,
            "risk_score": 0.0
        }
    
    def get_optimization_history(self, user_id: int) -> List[Dict[str, Any]]:
        """
        최적화 이력을 조회합니다.
        
        Args:
            user_id: 사용자 ID
            
        Returns:
            최적화 이력 목록
        """
        # TODO: 데이터베이스에서 이력 조회
        return []
    
    def calculate_risk_score(self, path: List[Dict[str, Any]]) -> float:
        """
        경로의 위험도를 계산합니다.
        
        Args:
            path: 경로 좌표 리스트
            
        Returns:
            위험도 점수 (0.0 ~ 1.0)
        """
        # TODO: 위험 지역과의 거리 계산
        # TODO: 리포트 데이터 기반 위험도 계산
        return 0.0
    
    def get_commute_briefing(
        self,

        commute_settings: Dict[str, Any],
        current_time: datetime
    ) -> Dict[str, Any]:
        """
        출근 브리핑 조회
        v3.0 명세서 [Logic 1.1] 출발 알림 + [Logic 1.2] 마지노선 경고 구현

        Args:
            commute_settings: 사용자 출퇴근 설정
                - homeAddress: 집 주소
                - workAddress: 회사 주소
                - targetArrivalTime: 목표 도착 시간 (time 객체)
                - firstMileDefaultDuration: First Mile 도보 시간 (분)
                - lastMileDefaultDuration: Last Mile 도보 시간 (분)
            current_time: 현재 시간 (datetime 객체)

        Returns:
            OpenAPI 스펙 준수 응답 구조:
            {
                "data": {
                    "alertType": "GO_NOW" | "LAST_CHANCE" | "NO_ACTION",
                    "message": "사용자 메시지",
                    "recommendedTransport": {
                        "type": "BUS" | "SUBWAY" | "WALK" | "TAXI",
                        "name": "교통수단 이름",
                        "departureInMinutes": 출발까지 남은 시간 (분)
                    }
                }
            }
        """
        # 목표 도착 시간을 datetime으로 변환 (오늘 날짜 기준)
        target_arrival = datetime.combine(
            current_time.date(),
            commute_settings["targetArrivalTime"]
        )

        # 현재 시간과 목표 도착 시간의 차이 계산
        time_until_arrival = target_arrival - current_time
        minutes_until_arrival = int(time_until_arrival.total_seconds() / 60)

        # First Mile 도보 시간
        first_mile_duration = commute_settings.get("firstMileDefaultDuration", 5)

        # ❌ 목표 도착 시간을 이미 지난 경우
        if minutes_until_arrival < 0:
            # 이미 지난 경우 NO_ACTION
            return {
                "data": {
                    "alertType": "NO_ACTION",
                    "message": "목표 도착 시간이 이미 지났습니다.",
                    "recommendedTransport": None
                }
            }

        # [Logic 1.1] 출발 알림 로직
        # 목표 도착 시간까지 충분한 시간이 있는 경우 "GO_NOW" 알림
        if minutes_until_arrival >= first_mile_duration + 10:  # 여유 시간 10분 포함
            # v3.0 명세서 예시 메시지 형식
            target_time_str = commute_settings["targetArrivalTime"].strftime("%H:%M")
            message = (
                f"{target_time_str} 도착을 위해, 지금 집에서 출발하셔서 "
                f"{first_mile_duration}분 뒤 오는 [123번 버스]를 타세요."
            )

            return {
                "data": {
                    "alertType": "GO_NOW",
                    "message": message,
                    "recommendedTransport": {
                        "type": "BUS",
                        "name": "123번",
                        "departureInMinutes": first_mile_duration
                    }
                }
            }

        # [Logic 1.2] 마지노선 경고 로직
        # Logic 1.1을 놓쳤을 경우, 마지막 교통수단 알림
        if 0 <= minutes_until_arrival <= first_mile_duration + 10:
            target_time_str = commute_settings["targetArrivalTime"].strftime("%H:%M")

            # 마지노선 버스 정보 (v3.0 명세서 예시)
            last_bus_departure = minutes_until_arrival
            last_bus_number = "456번"

            message = (
                f"⚠️지각 주의! {target_time_str} 도착을 위한 마지막 버스[{last_bus_number}]가 "
                f"{last_bus_departure}분 뒤 도착합니다. (도보 {first_mile_duration}분 포함, 지금 출발하셔야 합니다!)"
            )

            return {
                "data": {
                    "alertType": "LAST_CHANCE",
                    "message": message,
                    "recommendedTransport": {
                        "type": "BUS",
                        "name": last_bus_number,
                        "departureInMinutes": last_bus_departure
                    }
                }
            }

        # 기본 응답 (예상치 못한 경우)
        # 이 코드에 도달하면 안 됨 (위 조건들이 모든 경우를 커버)
        target_time_str = commute_settings["targetArrivalTime"].strftime("%H:%M")
        fallback_message = (
            f"{target_time_str} 도착을 위해, 지금 집에서 출발하셔서 "
            f"{first_mile_duration}분 뒤 오는 교통수단을 이용하세요."
        )
        return {
            "data": {
                "alertType": "GO_NOW",
                "message": fallback_message,
                "recommendedTransport": {
                    "type": "BUS",
                    "name": "123번",
                    "departureInMinutes": first_mile_duration
                }
            }
        }

    def get_retreat_mode_last_bus_alert(
        self,
        retreat_settings: Dict[str, Any],
        current_time: datetime
    ) -> Dict[str, Any]:
        """
        퇴근 모드 막차 알림 조회
        v3.0 명세서 [Logic 1.2 퇴근모드] 막차 알림 (Last Bus Alert in Retreat Mode) 구현

        Args:
            retreat_settings: 사용자 퇴근 설정
                - homeAddress: 집 주소
                - workAddress: 회사 주소
                - targetArrivalTime: None (퇴근 모드는 시간 제약 없음)
                - firstMileDefaultDuration: First Mile 도보 시간 (분)
                - lastMileDefaultDuration: Last Mile 도보 시간 (분)
                - mode: "RETREAT" (퇴근 모드 표시)
                - userSelectedRoute: "A" | "B" | "C" (사용자 선택 경로)
            current_time: 현재 시간 (datetime 객체)

        Returns:
            OpenAPI 스펙 준수 응답 구조:
            {
                "data": {
                    "message": "선택하신 [B. 편안한 경로]의 막차가 30분 뒤입니다.",
                    "recommendedTransport": {
                        "type": "BUS" | "SUBWAY",
                        "name": "막차 정보",
                        "departureInMinutes": 막차까지 남은 시간 (분)
                    }
                }
            }
        """
        # 사용자 선택 경로별 막차 시간 (실제로는 API에서 조회되어야 함)
        # 현재는 v3.0 명세서 예시에 따른 하드코딩
        last_bus_times = {
            "A": 10,    # A. 가장 빠르게: 막차 10분 뒤
            "B": 30,    # B. 편안하게: 막차 30분 뒤
            "C": 25,    # C. 평소 경로: 막차 25분 뒤
        }

        user_selected_route = retreat_settings.get("userSelectedRoute", "C")
        minutes_until_last_bus = last_bus_times.get(user_selected_route, 25)

        # 경로별 한글 이름
        route_names = {
            "A": "A. 가장 빠르게",
            "B": "B. 편안하게(착석)",
            "C": "C. 평소 경로",
        }

        route_name = route_names.get(user_selected_route, "C. 평소 경로")

        # v3.0 명세서 예시 메시지 형식
        message = f"선택하신 [{route_name}]의 막차가 {minutes_until_last_bus}분 뒤입니다."

        return {
            "data": {
                "message": message,
                "recommendedTransport": {
                    "type": "BUS",  # 실제로는 선택 경로에 따라 결정됨
                    "name": f"막차 ({user_selected_route})",
                    "departureInMinutes": minutes_until_last_bus
                }
            }
        }

    def get_auto_mode_switch_action(
        self,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        자동 모드 전환 (Logic 2.1 - Context Awareness)
        v3.0 명세서 [Logic 2.1] 자동 모드 전환 구현

        GPS 기반 사용자 상태 감지:
        - WAITING: 집/회사 근처 대기 (화면 전환 없음)
        - WALKING: 도보 이동 중 (화면 전환 없음)
        - ON_TRIP: 버스/지하철 탑승 중 (화면 전환 → 최종 목적지 ETA 표시)

        Args:
            user_context: {
                "currentGPS": { "latitude": 37.4979, "longitude": 127.0276, "accuracy": 5.0 },
                "commute_settings": { ... },
                "mode": "COMMUTE"
            }

        Returns:
            화면 전환 응답 또는 NO_ACTION:
            {
                "data": {
                    "action": "AUTO_SWITCH_TO_ETA",
                    "destinationArrivalTime": "08:45:00",
                    "estimatedMinutes": 15,
                    "currentLocation": { "latitude": 37.4979, "longitude": 127.0276 },
                    "destination": { "address": "...", "latitude": 37.5662, "longitude": 126.9778 }
                }
            }
            또는
            {
                "data": {
                    "action": "NO_ACTION"
                }
            }
        """
        try:
            # 1️⃣ UserContextData 모델로 변환
            context = UserContextData(
                currentGPS=user_context["currentGPS"],
                commute_settings=user_context["commute_settings"],
                mode=user_context.get("mode", "COMMUTE")
            )

            # 2️⃣ Context Awareness 분석
            analysis_result = context_detector.analyze_context(context)

            # 3️⃣ 화면 전환 응답 생성
            if analysis_result.screenSwitchNeeded:
                switch_response = context_detector.generate_screen_switch_response(
                    context,
                    analysis_result
                )
                if switch_response:
                    return {"data": switch_response}

            # 4️⃣ 화면 전환 불필요
            return {
                "data": {
                    "action": "NO_ACTION",
                    "state": analysis_result.state.value,
                    "message": f"현재 상태: {analysis_result.state.value}"
                }
            }

        except Exception as e:
            logger.error(f"❌ 자동 모드 전환 오류: {str(e)}")
            return {
                "data": {
                    "action": "NO_ACTION",
                    "error": str(e)
                }
            }

    def get_alternative_route_suggestion(
        self,
        current_route_time: int,
        alternative_route_time: int,
        mode: SystemMode,
        current_bus_arrival_minutes: int,
        current_bus_duration_minutes: int,
        transfer_bus_arrival_minutes: int,
        transfer_bus_congestion: int,
        transfer_location: str,
        transfer_line: str,
        congestion_level: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        고신뢰 대안 경로 제안 (Logic 2.2)
        v3.0 명세서 [Logic 2.2] 고신뢰 대안 경로 제안 구현

        3가지 엄격한 조건(Gate)을 통과한 경로만 제안:
        1. Gate 1: 확실한 이득 (출근: 7분 이상 단축, 퇴근: 착석 가능성 높음)
        2. Gate 2: 환승 확정성 (최소 3분 환승 여유)
        3. Gate 3: 경험의 질 (혼잡도 80% 미만)

        Args:
            current_route_time: 현재 경로 소요 시간 (분)
            alternative_route_time: 대안 경로 소요 시간 (분)
            mode: 시스템 모드 (COMMUTE/RETREAT)
            current_bus_arrival_minutes: 현재 버스 도착까지 시간 (분)
            current_bus_duration_minutes: 현재 버스 정차 + 하차 시간 (분)
            transfer_bus_arrival_minutes: 환승 버스 도착까지 시간 (분)
            transfer_bus_congestion: 환승 버스 혼잡도 (백분율)
            transfer_location: 환승 지점 (예: "A역")
            transfer_line: 환승 노선 (예: "9호선 급행")
            congestion_level: 혼잡도 (퇴근 모드)

        Returns:
            OpenAPI 스펙 준수 응답:
            모든 Gate 통과 시:
            {
                "data": {
                    "suggestAlternativeRoute": True,
                    "message": "더 빠른 경로 발견! (8분 단축) / 다음 'A역' [9호선 급행] 환승하세요. (단, 현재 혼잡도 '보통')",
                    "timeBenefit": 8,
                    "transferLocation": "A역",
                    "transferLine": "9호선 급행",
                    "transferCongestion": 45
                }
            }

            Gate 실패 시:
            {
                "data": {
                    "suggestAlternativeRoute": False,
                    "reasons": ["Gate 1 실패: 시간 단축이 3분으로 7분 미만", ...]
                }
            }
        """
        # 1️⃣ 모든 Gate 검증
        validation_result = gate_validator.validate_all_gates(
            current_route_time=current_route_time,
            alternative_route_time=alternative_route_time,
            mode=mode,
            current_bus_arrival_minutes=current_bus_arrival_minutes,
            current_bus_duration_minutes=current_bus_duration_minutes,
            transfer_bus_arrival_minutes=transfer_bus_arrival_minutes,
            transfer_bus_congestion=transfer_bus_congestion,
            congestion_level=congestion_level
        )

        # 2️⃣ Gate 통과 여부에 따른 응답
        if validation_result["all_pass"]:
            # 모든 Gate 통과 → 경로 제안
            message = gate_validator.generate_route_suggestion_message(
                time_benefit=validation_result["time_benefit"],
                transfer_location=transfer_location,
                transfer_line=transfer_line,
                transfer_bus_congestion=transfer_bus_congestion
            )

            return {
                "data": {
                    "suggestAlternativeRoute": True,
                    "message": message,
                    "timeBenefit": validation_result["time_benefit"],
                    "transferLocation": transfer_location,
                    "transferLine": transfer_line,
                    "transferCongestion": transfer_bus_congestion,
                    "transferTime": validation_result["transfer_time"]
                }
            }
        else:
            # Gate 실패 → 제안하지 않음
            logger.warning(
                f"❌ 대안 경로 제안 거절: {', '.join(validation_result['reasons'])}"
            )

            return {
                "data": {
                    "suggestAlternativeRoute": False,
                    "reasons": validation_result["reasons"],
                    "timeBenefit": validation_result["time_benefit"],
                    "failedGates": {
                        "gate_1": not validation_result["gate_1_pass"],
                        "gate_2": not validation_result["gate_2_pass"],
                        "gate_3": not validation_result["gate_3_pass"]
                    }
                }
            }

    def get_seating_optimization(
        self,
        guidance_type: str,
        current_vehicle: Optional[TransportType] = None,
        transfer_station: Optional[str] = None,
        transfer_line: Optional[str] = None,
        exit_location: Optional[str] = None,
        congestion_data: Optional[Dict[str, int]] = None,
        transfer_steps: Optional[List[Dict[str, Any]]] = None,
        has_transfer: bool = False
    ) -> Dict[str, Any]:
        """
        탑승/환승 최적화 가이드 제공
        v3.0 명세서 [Logic 2.3] 탑승/환승 최적화 가이드 구현

        Args:
            guidance_type: 안내 유형
                - "TRANSFER": 환승을 위한 최적 탑승 칸
                - "COMFORTABLE": 혼잡도 기반 여유 있는 칸
                - "EXIT": 하차역 위치 기반 탑승 칸
                - "MULTI_TRANSFER": 복합 환승 경로
            current_vehicle: 현재 교통수단
            transfer_station: 환승역 (예: "B역")
            transfer_line: 환승 노선 (예: "9호선")
            exit_location: 출입구 위치 (예: "FRONT", "CENTER", "REAR")
            congestion_data: 각 칸별 혼잡도 (예: {"1-2": 85, "3": 30})
            transfer_steps: 복합 환승 경로 데이터
            has_transfer: 환승 여부

        Returns:
            탑승/환승 최적화 정보:
            {
                "data": {
                    "action": "SEATING_OPTIMIZATION",
                    "type": "TRANSFER_GUIDANCE" | "CONGESTION_BASED_GUIDANCE" | "EXIT_GUIDANCE" | "MULTI_TRANSFER_GUIDANCE",
                    "message": "안내 메시지",
                    "optimalCar": "칸 정보" (type별로 다름),
                    "availableCars": [...] (type이 CONGESTION_BASED_GUIDANCE일 때만 포함),
                    "steps": [...] (type이 MULTI_TRANSFER_GUIDANCE일 때만 포함),
                    "priority": "HIGH" | "MEDIUM" | "LOW"
                }
            }
        """
        logger.info(f"🎯 탑승/환승 최적화 가이드 제공: {guidance_type}")

        if guidance_type == "TRANSFER":
            # 환승을 위한 최적 탑승 칸 추천
            result = seating_optimizer.recommend_car_for_transfer(
                transfer_station=transfer_station,
                transfer_line=transfer_line,
                exit_location=exit_location,
                current_vehicle=current_vehicle
            )
            return {"data": {**result, "action": "SEATING_OPTIMIZATION"}}

        elif guidance_type == "COMFORTABLE":
            # 혼잡도 기반 여유 있는 칸 추천
            if not congestion_data:
                logger.warning("⚠️ 혼잡도 데이터 없음")
                return {
                    "data": {
                        "action": "SEATING_OPTIMIZATION",
                        "type": "CONGESTION_BASED_GUIDANCE",
                        "availableCars": [],
                        "message": "혼잡도 정보를 불러올 수 없습니다.",
                        "priority": "LOW"
                    }
                }

            result = seating_optimizer.recommend_comfortable_cars(congestion_data)
            return {"data": {**result, "action": "SEATING_OPTIMIZATION"}}

        elif guidance_type == "EXIT":
            # 하차역 위치 기반 탑승 칸 추천
            result = seating_optimizer.recommend_car_for_exit(
                exit_station=transfer_station,
                exit_location=exit_location
            )
            return {"data": {**result, "action": "SEATING_OPTIMIZATION"}}

        elif guidance_type == "MULTI_TRANSFER":
            # 복합 환승 경로 안내
            if not transfer_steps:
                logger.warning("⚠️ 환승 경로 데이터 없음")
                return {
                    "data": {
                        "action": "SEATING_OPTIMIZATION",
                        "type": "MULTI_TRANSFER_GUIDANCE",
                        "steps": [],
                        "message": "환승 경로 정보를 불러올 수 없습니다.",
                        "totalSteps": 0
                    }
                }

            result = seating_optimizer.generate_multi_transfer_guidance(transfer_steps)
            return {"data": {**result, "action": "SEATING_OPTIMIZATION"}}

        else:
            logger.warning(f"⚠️ 알 수 없는 안내 유형: {guidance_type}")
            # 최적화 점수 계산 (기본값)
            score = seating_optimizer.calculate_optimization_score(
                current_vehicle=current_vehicle,
                has_transfer=has_transfer,
                transfer_station=transfer_station
            )

            return {
                "data": {
                    "action": "SEATING_OPTIMIZATION",
                    "type": "OPTIMIZATION_SCORE",
                    "optimizationScore": score,
                    "message": "탑승/환승 최적화 점수 계산 완료",
                    "priority": "LOW" if score < 0.5 else "MEDIUM" if score < 0.8 else "HIGH"
                }
            }

    # ========================================
    # Logic 3.1: 돌발상황 감지 (Delay Detection)
    # ========================================

    def get_exception_alert(
        self,
        segments: List[Dict[str, Any]],
        current_hour: int,
        current_day_of_week: int,
        statistical_data_map: Optional[Dict[str, Dict[str, Any]]] = None,
        real_time_data_map: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        경로의 지연 감지 (Logic 3.1)

        Args:
            segments: 구간 정보 리스트
                예: [
                    {
                        "segment_id": "SEG_001",
                        "segment_name": "A정류장 → B정류장",
                        "from_station": "A정류장",
                        "to_station": "B정류장"
                    },
                    ...
                ]
            current_hour: 현재 시간 (0-23)
            current_day_of_week: 현재 요일 (0=일, 1=월, ...)
            statistical_data_map: 구간별 평균 소요시간 데이터 (선택)
            real_time_data_map: 구간별 실시간 예상 데이터 (선택)

        Returns:
            {
                "action": "EXCEPTION_DETECTED" or "NO_ACTION",
                "totalSegments": 3,
                "delayedCount": 1,
                "delayedSegments": [
                    {
                        "segmentId": "SEG_001",
                        "segmentName": "A정류장 → B정류장",
                        "isDelayed": True,
                        "delayMinutes": 5,
                        "type": "DELAY_WARNING",
                        "message": "⚠️지연 감지! [A정류장] 부근이...",
                        "priority": "HIGH"
                    }
                ],
                "mostCritical": {...},
                "hasCritical": False
            }
        """
        logger.info(f"🚨 지연 감지 시작: {len(segments)}개 구간")

        # 빈 리스트 체크
        if not segments:
            logger.warning("⚠️ 구간 정보 없음")
            return {
                "action": "NO_ACTION",
                "totalSegments": 0,
                "delayedCount": 0,
                "delayedSegments": [],
                "mostCritical": None,
                "hasCritical": False
            }

        # DelayDetector를 사용한 경로 지연 분석
        route_analysis = delay_detector.detect_delays_on_route(
            segments=segments,
            current_hour=current_hour,
            current_day_of_week=current_day_of_week,
            statistical_data_map=statistical_data_map or {},
            real_time_data_map=real_time_data_map or {}
        )

        # 응답 구조 변환 (camelCase)
        delayed_segments_response = []
        for segment in route_analysis["delayed_segments"]:
            delayed_segments_response.append({
                "segmentId": segment["segment_id"],
                "segmentName": segment["segment_name"],
                "isDelayed": segment["is_delayed"],
                "delayMinutes": segment["delay_minutes"],
                "type": segment["type"],
                "message": segment["message"],
                "priority": segment["priority"],
                "dataSource": segment["data_source"],
                "confidence": segment["confidence"]
            })

        # 가장 심각한 구간 응답
        most_critical_response = None
        if route_analysis["most_critical"]:
            most_critical = route_analysis["most_critical"]
            most_critical_response = {
                "segmentId": most_critical["segment_id"],
                "segmentName": most_critical["segment_name"],
                "delayMinutes": most_critical["delay_minutes"],
                "priority": most_critical["priority"],
                "message": most_critical["message"]
            }

        # 결과 반환
        result = {
            "action": "EXCEPTION_DETECTED" if delayed_segments_response else "NO_ACTION",
            "totalSegments": route_analysis["total_segments"],
            "delayedCount": route_analysis["delayed_count"],
            "delayedSegments": delayed_segments_response,
            "mostCritical": most_critical_response,
            "hasCritical": route_analysis["has_critical"]
        }

        logger.info(
            f"✅ 지연 감지 완료: {route_analysis['delayed_count']}개 구간 지연 감지"
        )

        return {"data": result}

    # ========================================
    # Logic 3.2: 최종 대안 제시 - 택시 제안
    # ========================================

    def get_taxi_suggestion(
        self,
        mode: SystemMode,
        current_time: datetime,
        target_arrival_time: Optional[datetime] = None,
        transit_arrival_time: Optional[datetime] = None,
        taxi_arrival_time: Optional[datetime] = None,
        selected_route_choice: Optional[str] = None,
        selected_route_name: Optional[str] = None,
        last_bus_time: Optional[datetime] = None,
        first_mile_duration: int = 5,
        home_location: Optional[Dict[str, float]] = None,
        taxi_available: bool = True
    ) -> Dict[str, Any]:
        """
        택시 제안 (Logic 3.2)

        Args (Commute Mode):
            mode: SystemMode.COMMUTE
            current_time: 현재 시각
            target_arrival_time: 목표 도착 시간
            transit_arrival_time: 대중교통 예상 도착 시간
            taxi_arrival_time: 택시 예상 도착 시간
            home_location: 위치 정보 (위도, 경도)
            taxi_available: 택시 가용성

        Args (Retreat Mode):
            mode: SystemMode.RETREAT
            current_time: 현재 시각
            selected_route_choice: 선택 경로 ("A", "B", "C")
            selected_route_name: 선택 경로명
            last_bus_time: 막차 시간
            first_mile_duration: First Mile 도보 시간
            home_location: 위치 정보
            taxi_available: 택시 가용성

        Returns:
            {
                "action": "TAXI_SUGGESTED" or "NO_ACTION",
                "type": "TAXI_COMMUTE_LATENESS_CONFIRMED" or "TAXI_RETREAT_LAST_BUS_MISSED",
                "message": "택시 제안 메시지",
                "priority": "CRITICAL" or "HIGH",
                ...
            }
        """
        logger.info(f"🚕 택시 제안 시작: {mode.value} 모드")

        # 출근 모드: 지각 확정 시 택시 제안
        if mode == SystemMode.COMMUTE:
            logger.info("📍 출근 모드 택시 제안")

            # 필수 파라미터 체크
            if not all([target_arrival_time, transit_arrival_time, taxi_arrival_time]):
                logger.warning("⚠️ 출근 모드 필수 데이터 부족")
                return {
                    "data": {
                        "action": "NO_ACTION",
                        "reason": "필수 데이터 부족"
                    }
                }

            # TaxiSuggester를 사용한 제안 로직
            should_suggest = taxi_suggester.should_suggest_taxi_commute(
                target_arrival_time=target_arrival_time,
                transit_arrival_time=transit_arrival_time,
                taxi_arrival_time=taxi_arrival_time,
                taxi_available=taxi_available
            )

            if not should_suggest:
                logger.info("✅ 택시 제안 불필요")
                return {
                    "data": {
                        "action": "NO_ACTION",
                        "reason": "택시 제안 필요 없음"
                    }
                }

            # 택시 제안 생성
            result = taxi_suggester.suggest_taxi_for_commute(
                current_time=current_time,
                target_arrival_time=target_arrival_time,
                transit_arrival_time=transit_arrival_time,
                taxi_arrival_time=taxi_arrival_time,
                home_location=home_location
            )

            return {"data": result}

        # 퇴근 모드: 막차 놓침 시 택시 제안
        elif mode == SystemMode.RETREAT:
            logger.info("📍 퇴근 모드 택시 제안")

            # 필수 파라미터 체크
            if not all([selected_route_choice, selected_route_name, last_bus_time]):
                logger.warning("⚠️ 퇴근 모드 필수 데이터 부족")
                return {
                    "data": {
                        "action": "NO_ACTION",
                        "reason": "필수 데이터 부족"
                    }
                }

            # TaxiSuggester를 사용한 제안 로직
            should_suggest = taxi_suggester.should_suggest_taxi_retreat(
                current_time=current_time,
                last_bus_time=last_bus_time,
                first_mile_duration=first_mile_duration,
                taxi_available=taxi_available
            )

            if not should_suggest:
                logger.info("✅ 택시 제안 불필요")
                return {
                    "data": {
                        "action": "NO_ACTION",
                        "reason": "택시 제안 필요 없음"
                    }
                }

            # 택시 제안 생성
            result = taxi_suggester.suggest_taxi_for_retreat(
                current_time=current_time,
                selected_route_choice=selected_route_choice,
                selected_route_name=selected_route_name,
                last_bus_time=last_bus_time,
                first_mile_duration=first_mile_duration,
                taxi_arrival_time=taxi_arrival_time or datetime.now(),
                home_location=home_location
            )

            return {"data": result}

        else:
            logger.warning(f"⚠️ 알 수 없는 모드: {mode}")
            return {
                "data": {
                    "action": "NO_ACTION",
                    "reason": "지원하지 않는 모드"
                }
            }

    # ========================================
    # Phase 9: Logic 4.1 - 퇴근 모드 사용자 목표 설정
    # ========================================

    def get_retreat_mode_goal_selection(
        self, user_id: str, user_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        퇴근 모드 사용자 목표 선택지 제시

        Args:
            user_id: 사용자 ID
            user_name: 사용자 이름 (선택)

        Returns:
            {
                "data": {
                    "action": "ASK_USER_GOAL",
                    "options": [
                        {
                            "choice": "A",
                            "label": "가장 빠르게",
                            "description": "최단 시간으로 집에 도착",
                            "icon": "🚀",
                            "priority": "SPEED"
                        },
                        ...
                    ],
                    "pushNotification": {...},
                    "timestamp": "..."
                }
            }
        """
        # 1️⃣ 퇴근 모드 핸들러 사용
        result = retreat_mode_handler.ask_user_retreat_goal(
            user_name=user_name, user_id=user_id
        )

        logger.info(f"✅ 퇴근 모드 목표 선택지 제시: {user_id}")
        return {"data": result}

    def save_retreat_mode_choice(
        self, user_id: str, selected_choice: str, session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        퇴근 모드 사용자 목표 선택 저장

        Args:
            user_id: 사용자 ID
            selected_choice: 선택 (A/B/C)
            session_id: 세션 ID (선택)

        Returns:
            {
                "data": {
                    "action": "CHOICE_SAVED",
                    "userId": "...",
                    "selectedChoice": "B",
                    "selectedLabel": "편안하게",
                    "nextAction": "GET_ROUTES_BY_GOAL",
                    "message": "..."
                }
            }
        """
        # 1️⃣ 선택 저장
        result = retreat_mode_handler.save_retreat_choice(
            user_id=user_id,
            selected_choice=selected_choice,
            session_id=session_id,
        )

        # 2️⃣ 세션에 유지
        if session_id:
            retreat_mode_handler.persist_choice_in_session(
                user_id=user_id,
                selected_choice=selected_choice,
                session_id=session_id,
            )

        logger.info(f"✅ 퇴근 모드 선택 저장: {user_id} -> {selected_choice}")
        return {"data": result}

    # ========================================
    # Phase 9: Logic 4.2 - 퇴근 목표별 경로 제안
    # ========================================

    def get_routes_by_retreat_goal(
        self, routes: List[Dict[str, Any]], user_goal: str
    ) -> Dict[str, Any]:
        """
        퇴근 모드 사용자 목표에 따른 경로 제안

        Args:
            routes: 사용 가능한 경로 목록
            user_goal: 사용자 목표 (A/B/C)

        Returns:
            {
                "data": {
                    "action": "GET_ROUTES_BY_GOAL",
                    "selectedGoal": "A|B|C",
                    "goalLabel": "...",
                    "routes": [
                        {
                            "routeId": "...",
                            "name": "...",
                            "estimatedDuration": number,
                            "seatingProbability": number,
                            "recommendation": "...",
                            "metadata": {...}
                        },
                        ...
                    ],
                    "message": "...",
                    "timestamp": "..."
                }
            }
        """
        # 1️⃣ 목표 유효성 검증
        valid_goals = ["A", "B", "C"]
        if user_goal not in valid_goals:
            logger.warning(f"⚠️ 유효하지 않은 목표: {user_goal}")
            return {
                "data": {
                    "action": "ERROR",
                    "error": f"Invalid goal: {user_goal}. Must be A, B, or C",
                }
            }

        # 2️⃣ 경로 선택 및 필터링
        result = route_selector_by_goal.get_routes_by_goal(
            routes=routes, goal=user_goal
        )

        logger.info(f"✅ 퇴근 목표별 경로 제안: {user_goal}")
        return {"data": result}

    # ========================================
    # Logic 4.3: 스마트 폴링 (Smart Polling)
    # ========================================

    def get_smart_polling_frequency(
        self,
        user_latitude: float,
        user_longitude: float,
        user_speed: float,
        transit_mode: str,
        distance_to_transfer: float = float("inf"),
        in_congestion_zone: bool = False,
        minutes_until_alert: int = float("inf"),
    ) -> Dict[str, Any]:
        """
        사용자 상태 기반 스마트 폴링 빈도 계산

        배터리/데이터 효율성을 위해 사용자 상태에 따라 폴링 빈도를 동적으로 조절한다.

        Args:
            user_latitude: 사용자 위도
            user_longitude: 사용자 경도
            user_speed: 사용자 속도 (km/h)
            transit_mode: 대중교통 모드 (SUBWAY, BUS, TRAIN, WALKING, WAITING)
            distance_to_transfer: 환승 지점까지 거리 (미터)
            in_congestion_zone: 정체 구간 여부
            minutes_until_alert: 알림까지 남은 시간 (분)

        Returns:
            {
                "data": {
                    "frequency": "HIGH" | "MEDIUM" | "LOW",
                    "intervalSeconds": 10 | 30 | 300,
                    "reason": "...",
                    "nextCheckTime": "ISO 8601 timestamp",
                    "metadata": {
                        "description": "...",
                        "useCases": [...],
                        "batteryImpact": "...",
                        "estimatedBatteryDrainPerHour": "..."
                    }
                }
            }
        """
        try:
            # 1️⃣ 사용자 상태 객체 생성
            location = UserLocation(
                latitude=user_latitude,
                longitude=user_longitude,
                speed=user_speed,
            )

            transit_state = TransitState(
                mode=transit_mode,
                distance_to_transfer=distance_to_transfer,
                in_congestion_zone=in_congestion_zone,
            )

            alert_state = AlertState(
                minutes_until_alert=minutes_until_alert,
            )

            # 2️⃣ 폴링 빈도 계산
            frequency_result = polling_scheduler.calculate_polling_frequency(
                location=location,
                transit_state=transit_state,
                alert_state=alert_state,
            )

            # 3️⃣ 메타데이터 추가
            frequency_obj = frequency_result["frequency"]
            metadata = polling_scheduler.get_frequency_metadata(frequency_obj)

            # 4️⃣ 응답 구성
            result = {
                "frequency": frequency_result["frequency"].name,
                "intervalSeconds": frequency_result["intervalSeconds"],
                "reason": frequency_result["reason"],
                "nextCheckTime": frequency_result["nextCheckTime"],
                "metadata": metadata,
                "timestamp": datetime.utcnow().isoformat(),
            }

            logger.info(
                f"✅ 스마트 폴링 빈도 계산: {result['frequency']} "
                f"({result['intervalSeconds']}초) - {result['reason']}"
            )
            return {"data": result}

        except Exception as e:
            logger.error(f"❌ 폴링 빈도 계산 실패: {str(e)}")
            return {
                "error": {
                    "code": "E010",
                    "message": f"Failed to calculate polling frequency: {str(e)}",
                }
            }

    def get_polling_status(
        self,
        current_frequency: str,  # "HIGH", "MEDIUM", "LOW"
        last_poll_timestamp: str,  # ISO 8601
        last_calc_timestamp: str,  # ISO 8601
    ) -> Dict[str, Any]:
        """
        현재 폴링 상태 조회

        Args:
            current_frequency: 현재 폴링 빈도 ("HIGH" | "MEDIUM" | "LOW")
            last_poll_timestamp: 마지막 폴링 시간 (ISO 8601)
            last_calc_timestamp: 마지막 빈도 재계산 시간 (ISO 8601)

        Returns:
            {
                "data": {
                    "currentFrequency": "HIGH" | "MEDIUM" | "LOW",
                    "intervalSeconds": 10 | 30 | 300,
                    "elapsedSincePoll": number,
                    "timeUntilNextPoll": number,
                    "elapsedSinceFrequencyRecalc": number,
                    "shouldPollNow": boolean,
                    "shouldRecalculateFrequency": boolean,
                    "timestamp": "ISO 8601"
                }
            }
        """
        try:
            # 1️⃣ 타임스탐프 파싱
            last_poll_time = datetime.fromisoformat(last_poll_timestamp)
            last_calc_time = datetime.fromisoformat(last_calc_timestamp)

            # 2️⃣ 빈도 변환
            frequency = PollingFrequency[current_frequency]

            # 3️⃣ 폴링 상태 조회
            status = polling_scheduler.get_polling_status(
                current_frequency=frequency,
                last_poll_time=last_poll_time,
                last_calc_time=last_calc_time,
            )

            logger.info(f"✅ 폴링 상태 조회: {status['currentFrequency']}")
            return {"data": status}

        except Exception as e:
            logger.error(f"❌ 폴링 상태 조회 실패: {str(e)}")
            return {
                "error": {
                    "code": "E011",
                    "message": f"Failed to get polling status: {str(e)}",
                }
            }

