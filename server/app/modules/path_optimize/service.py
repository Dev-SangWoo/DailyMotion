"""
경로 최적화 서비스
최적의 경로를 계산하는 비즈니스 로직입니다.
"""
from typing import List, Dict, Any
from datetime import datetime, time


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

