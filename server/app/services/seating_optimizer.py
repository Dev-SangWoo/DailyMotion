"""
Seating Optimizer Service

Phase 6: Logic 2.3 - 탑승/환승 최적화 가이드 (Seating/Transfer Optimization)

v3.0 명세서:
- Logic 2.3: 현재 경로 이용 시, 이동 경험을 미세하게 최적화
  * 예시 1: "다음 'B역' 환승을 위해, '5-2번 칸'에 탑승하세요."
  * 예시 2: "지금 들어오는 열차는 3번, 8번 칸이 가장 여유 있습니다."
"""

from typing import Dict, Any, List, Optional
import logging

from app.modules.path_optimize.models import TransportType

logger = logging.getLogger(__name__)


class SeatingOptimizer:
    """
    탑승/환승 최적화 가이드 제공

    Phase 2.3: Logic 2.3 - 탑승/환승 최적화 가이드
    """

    # 여유 있는 칸의 혼잡도 기준 (40% 이하)
    COMFORTABLE_CONGESTION_THRESHOLD = 40

    # 각 위치별 칸 매핑
    EXIT_LOCATION_TO_CAR_MAPPING = {
        "FRONT": "1-2",      # 역 앞쪽
        "CENTER": "4-5",     # 역 중앙
        "REAR": "7-8"        # 역 뒤쪽
    }

    def __init__(self):
        """SeatingOptimizer 초기화"""
        logger.info("✅ SeatingOptimizer 초기화")

    # ========================================
    # 환승을 위한 탑승 칸 추천
    # ========================================

    def recommend_car_for_transfer(
        self,
        transfer_station: str,
        transfer_line: str,
        exit_location: Optional[str] = None,
        current_vehicle: Optional[TransportType] = None
    ) -> Dict[str, Any]:
        """
        환승을 위한 최적 탑승 칸 추천

        Args:
            transfer_station: 환승역 (예: "B역")
            transfer_line: 환승 노선 (예: "9호선")
            exit_location: 환승역의 출입구 위치 (예: "REAR" = 역 뒤쪽)
            current_vehicle: 현재 탑승 중인 교통수단

        Returns:
            {
                "type": "TRANSFER_GUIDANCE",
                "transferStation": "B역",
                "transferLine": "9호선",
                "optimalCar": "5-2",
                "message": "다음 'B역' 환승을 위해, '5-2번 칸'에 탑승하세요.",
                "priority": "HIGH"
            }
        """
        # 1️⃣ 환승역의 출입구 위치 기반 최적 칸 결정
        if exit_location and exit_location in self.EXIT_LOCATION_TO_CAR_MAPPING:
            optimal_car = self.EXIT_LOCATION_TO_CAR_MAPPING[exit_location]
            logger.info(
                f"📍 환승역 위치: {exit_location} → 최적 칸: {optimal_car}"
            )
        else:
            # 기본값: 중앙
            optimal_car = self.EXIT_LOCATION_TO_CAR_MAPPING["CENTER"]
            logger.info(f"📍 기본 최적 칸: {optimal_car}")

        # 2️⃣ 메시지 생성
        message = (
            f"다음 '{transfer_station}' 환승을 위해, "
            f"'{optimal_car}번 칸'에 탑승하세요."
        )

        logger.info(f"💬 메시지: {message}")

        result = {
            "type": "TRANSFER_GUIDANCE",
            "transferStation": transfer_station,
            "transferLine": transfer_line,
            "optimalCar": optimal_car,
            "message": message,
            "priority": "HIGH"
        }

        return result

    # ========================================
    # 혼잡도 기반 여유 있는 칸 추천
    # ========================================

    def recommend_comfortable_cars(
        self,
        congestion_data: Dict[str, int]
    ) -> Dict[str, Any]:
        """
        각 칸별 혼잡도를 기반으로 여유 있는 칸 추천

        Args:
            congestion_data: {
                "1-2": 85,  # 1-2번 칸 혼잡도 85%
                "3": 30,    # 3번 칸 혼잡도 30% (여유 있음)
                "5-6": 70,
                "8": 25     # 8번 칸 혼잡도 25% (여유 있음)
            }

        Returns:
            {
                "type": "CONGESTION_BASED_GUIDANCE",
                "availableCars": ["3", "8"],
                "message": "지금 들어오는 열차는 3번, 8번 칸이 가장 여유 있습니다.",
                "priority": "MEDIUM"
            }
        """
        # 1️⃣ 여유 있는 칸 필터링 (혼잡도 40% 이하)
        available_cars = [
            car for car, congestion in congestion_data.items()
            if congestion <= self.COMFORTABLE_CONGESTION_THRESHOLD
        ]

        logger.info(
            f"🚆 여유 있는 칸: {available_cars} "
            f"(혼잡도 {self.COMFORTABLE_CONGESTION_THRESHOLD}% 이하)"
        )

        # 2️⃣ 응답 생성
        if available_cars:
            # 여유 있는 칸이 있는 경우
            cars_str = ", ".join(available_cars)
            message = (
                f"지금 들어오는 열차는 {cars_str}번 칸이 가장 여유 있습니다."
            )

            result = {
                "type": "CONGESTION_BASED_GUIDANCE",
                "availableCars": available_cars,
                "message": message,
                "priority": "MEDIUM"
            }

            logger.info(f"💬 메시지: {message}")
        else:
            # 여유 있는 칸이 없는 경우 (출근 시간 등)
            fallback_message = (
                "붐비지 않은 칸을 선택하시거나, 다음 열차를 이용하세요."
            )

            result = {
                "type": "CONGESTION_BASED_GUIDANCE",
                "availableCars": [],
                "message": fallback_message,
                "priority": "LOW",
                "fallback": True
            }

            logger.warning(f"⚠️ 여유 있는 칸 없음: {fallback_message}")

        return result

    # ========================================
    # 하차역 기반 탑승 위치 추천
    # ========================================

    def recommend_car_for_exit(
        self,
        exit_station: str,
        exit_location: str
    ) -> Dict[str, Any]:
        """
        하차역의 출입구 위치를 고려한 탑승 칸 추천

        Args:
            exit_station: 하차역 (예: "D역")
            exit_location: 하차역 출입구 위치 (예: "FRONT", "CENTER", "REAR")

        Returns:
            {
                "type": "EXIT_GUIDANCE",
                "exitStation": "D역",
                "exitLocation": "FRONT",
                "optimalCar": "1-2",
                "message": "'D역' 하차를 위해, '1-2번 칸'에 탑승하세요.",
                "priority": "MEDIUM"
            }
        """
        # 1️⃣ 하차역의 출입구 위치 기반 최적 칸 결정
        if exit_location in self.EXIT_LOCATION_TO_CAR_MAPPING:
            optimal_car = self.EXIT_LOCATION_TO_CAR_MAPPING[exit_location]
        else:
            optimal_car = self.EXIT_LOCATION_TO_CAR_MAPPING["CENTER"]

        # 2️⃣ 메시지 생성
        message = (
            f"'{exit_station}' 하차를 위해, "
            f"'{optimal_car}번 칸'에 탑승하세요."
        )

        logger.info(f"💬 메시지: {message}")

        result = {
            "type": "EXIT_GUIDANCE",
            "exitStation": exit_station,
            "exitLocation": exit_location,
            "optimalCar": optimal_car,
            "message": message,
            "priority": "MEDIUM"
        }

        return result

    # ========================================
    # 복합 환승 경로 안내
    # ========================================

    def generate_multi_transfer_guidance(
        self,
        transfer_steps: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        복합 환승 경로에서 각 환승마다 최적 칸 정보 제공

        Args:
            transfer_steps: [
                {
                    "step": 1,
                    "currentLine": "2호선",
                    "transferStation": "B역",
                    "transferLine": "9호선",
                    "exitLocation": "REAR"
                },
                {
                    "step": 2,
                    "currentLine": "9호선",
                    "transferStation": "C역",
                    "transferLine": "택시",
                    "exitLocation": "FRONT"
                }
            ]

        Returns:
            {
                "type": "MULTI_TRANSFER_GUIDANCE",
                "steps": [
                    {
                        "step": 1,
                        "guidance": "다음 'B역' 환승을 위해, '7-8번 칸'에 탑승하세요.",
                        "optimalCar": "7-8"
                    },
                    {
                        "step": 2,
                        "guidance": "'C역' 하차를 위해, '1-2번 칸'에 탑승하세요.",
                        "optimalCar": "1-2"
                    }
                ]
            }
        """
        guidance_list = []

        for step_data in transfer_steps:
            step_num = step_data.get("step", 0)
            transfer_station = step_data.get("transferStation")
            transfer_line = step_data.get("transferLine")
            exit_location = step_data.get("exitLocation", "CENTER")

            # 최적 칸 결정
            optimal_car = self.EXIT_LOCATION_TO_CAR_MAPPING.get(
                exit_location,
                self.EXIT_LOCATION_TO_CAR_MAPPING["CENTER"]
            )

            # 단계별 안내 메시지
            if step_num < len(transfer_steps):
                # 환승 단계
                message = (
                    f"다음 '{transfer_station}' 환승을 위해, "
                    f"'{optimal_car}번 칸'에 탑승하세요."
                )
            else:
                # 최종 하차 단계
                message = (
                    f"'{transfer_station}' 하차를 위해, "
                    f"'{optimal_car}번 칸'에 탑승하세요."
                )

            guidance_list.append({
                "step": step_num,
                "guidance": message,
                "optimalCar": optimal_car,
                "transferStation": transfer_station,
                "transferLine": transfer_line
            })

            logger.info(f"📍 Step {step_num}: {message}")

        result = {
            "type": "MULTI_TRANSFER_GUIDANCE",
            "steps": guidance_list,
            "totalSteps": len(guidance_list)
        }

        return result

    # ========================================
    # 최적화 점수 계산
    # ========================================

    def calculate_optimization_score(
        self,
        current_vehicle: TransportType,
        has_transfer: bool,
        transfer_station: Optional[str] = None,
        congestion_level: Optional[int] = None
    ) -> float:
        """
        탑승/환승 최적화의 필요성 점수 계산

        Args:
            current_vehicle: 현재 교통수단
            has_transfer: 환승 여부
            transfer_station: 환승역
            congestion_level: 혼잡도

        Returns:
            최적화 점수 (0.0 ~ 1.0)
            - 0.8 이상: 즉시 안내 필요
            - 0.5 ~ 0.8: 권장
            - 0.5 이하: 선택사항
        """
        score = 0.0

        # 1️⃣ 교통수단별 점수
        if current_vehicle == TransportType.SUBWAY:
            score += 0.4  # 지하철은 칸 위치가 중요
        elif current_vehicle == TransportType.BUS:
            score += 0.2

        # 2️⃣ 환승 여부
        if has_transfer:
            score += 0.4  # 환승이 있으면 점수 증가
        else:
            score += 0.1

        # 3️⃣ 혼잡도
        if congestion_level:
            if congestion_level > 80:
                score += 0.1  # 매우 혼잡하면 안내 필요
            elif congestion_level < 40:
                score += 0.0  # 여유 있으면 안내 불필요

        logger.info(
            f"📊 최적화 점수: {score:.2f} "
            f"(교통수단: {current_vehicle.value}, 환승: {has_transfer})"
        )

        return min(score, 1.0)


# 전역 인스턴스
seating_optimizer = SeatingOptimizer()
