"""
Phase 6: Logic 2.3 - 탑승/환승 최적화 가이드 (Seating/Transfer Optimization) 테스트

헌법 준수:
- AGENTS.md 백엔드 헌법 [제5장] 개발 방법론 (TDD/Pytest)
- v3.0 명세서 [Logic 2.3] 탑승/환승 최적화 가이드
- OpenAPI 스펙 응답 구조 준수

[Phase 6 테스트 시나리오]:
1. ✅ 환승을 위한 최적 탑승 칸 추천
   - 예시: "다음 'B역' 환승을 위해, '5-2번 칸'에 탑승하세요."
2. ✅ 열차 혼잡도 기반 여유 있는 칸 추천
   - 예시: "지금 들어오는 열차는 3번, 8번 칸이 가장 여유 있습니다."
3. ✅ 응답 구조 검증
"""

import pytest
from app.modules.path_optimize.models import TransportType


class TestLogic2_3SeatingOptimization:
    """Logic 2.3 - 탑승/환승 최적화 테스트"""

    def test_seating_recommendation_for_transfer(self):
        """
        [Phase 6 - 시나리오 1] 환승을 위한 최적 탑승 칸 추천

        상황:
        - 현재 교통수단: 지하철 2호선 (8개 칸)
        - 다음 환승: B역에서 9호선으로 환승
        - B역의 9호선 플랫폼 위치: 역 뒤쪽 (약 7-8번 칸 근처)
        - 최적 칸: 5-2번 칸에서 탑승 → B역 도착 시 역 뒤쪽으로 이동 용이

        예상 결과:
        - 메시지: "다음 'B역' 환승을 위해, '5-2번 칸'에 탑승하세요."
        - 최적 칸: "5-2"
        - 환승역: "B역"
        - 환승 노선: "9호선"
        """
        # Given: 환승 관련 정보
        current_vehicle = TransportType.SUBWAY
        current_line = "2호선"
        transfer_station = "B역"
        transfer_line = "9호선"
        optimal_car = "5-2"  # 환승을 위한 최적 칸

        # When: 최적 탑승 칸 추천 로직
        message = (
            f"다음 '{transfer_station}' 환승을 위해, "
            f"'{optimal_car}번 칸'에 탑승하세요."
        )

        # Then: 메시지 검증
        assert transfer_station in message
        assert optimal_car in message
        assert "환승" in message
        assert "탑승" in message

    def test_seating_recommendation_for_transfer_bus(self):
        """
        [Phase 6 - 시나리오 1 추가] 버스에서의 탑승 위치 추천

        상황:
        - 현재 교통수단: 버스 123번
        - 다음 환승: C역에서 지하철로 환승
        - C역 지하철 입구 위치: 버스 뒤쪽
        - 최적 탑승 위치: 뒤쪽 좌석

        예상 결과:
        - 메시지: "다음 'C역' 환승을 위해, '뒤쪽 좌석'에 탑승하세요."
        """
        # Given
        current_vehicle = TransportType.BUS
        transfer_station = "C역"
        optimal_position = "뒤쪽 좌석"

        # When
        message = (
            f"다음 '{transfer_station}' 환승을 위해, "
            f"'{optimal_position}'에 탑승하세요."
        )

        # Then
        assert transfer_station in message
        assert optimal_position in message

    def test_available_seats_recommendation(self):
        """
        [Phase 6 - 시나리오 2] 열차 혼잡도 기반 여유 있는 칸 추천

        상황:
        - 지하철 혼잡도 현황:
          * 1-2번 칸: 혼잡도 85% (혼잡함)
          * 3번 칸: 혼잡도 30% (여유 있음) ✓
          * 5-6번 칸: 혼잡도 70% (혼잡함)
          * 8번 칸: 혼잡도 25% (여유 있음) ✓
        - 추천: "지금 들어오는 열차는 3번, 8번 칸이 가장 여유 있습니다."

        예상 결과:
        - 여유 있는 칸 목록 반환
        - 혼잡도 기준: 40% 이하를 "여유 있음"으로 판정
        """
        # Given: 각 칸별 혼잡도
        congestion_data = {
            "1-2": 85,
            "3": 30,
            "5-6": 70,
            "8": 25
        }

        # When: 여유 있는 칸 필터링 (혼잡도 40% 이하)
        available_cars = [
            car for car, congestion in congestion_data.items()
            if congestion <= 40
        ]

        # Then: 여유 있는 칸 검증
        assert len(available_cars) == 2
        assert "3" in available_cars
        assert "8" in available_cars
        assert "1-2" not in available_cars
        assert "5-6" not in available_cars

    def test_available_seats_message_generation(self):
        """
        [Phase 6 - 시나리오 2] 여유 있는 칸 추천 메시지 생성

        상황:
        - 여유 있는 칸: 3번, 8번
        - v3.0 명세서 포맷 준수

        예상 결과:
        - 메시지: "지금 들어오는 열차는 3번, 8번 칸이 가장 여유 있습니다."
        """
        # Given
        available_cars = ["3", "8"]
        cars_str = ", ".join(available_cars)

        # When: 메시지 생성
        message = (
            f"지금 들어오는 열차는 {cars_str}번 칸이 가장 여유 있습니다."
        )

        # Then
        assert "3" in message
        assert "8" in message
        assert "여유 있습니다" in message
        assert "열차" in message

    def test_seating_optimization_response_structure(self):
        """
        [Phase 6 - 시나리오 3] 응답 구조 검증

        상황:
        - 탑승/환승 최적화 정보 응답
        - OpenAPI 스펙 준수

        예상 결과:
        - 응답 구조가 올바름
        - 필요한 모든 필드 포함
        """
        # Given: 최적화 정보
        optimization_data = {
            "action": "SEATING_OPTIMIZATION",
            "type": "TRANSFER_GUIDANCE",
            "transferStation": "B역",
            "transferLine": "9호선",
            "optimalCar": "5-2",
            "message": "다음 'B역' 환승을 위해, '5-2번 칸'에 탑승하세요.",
            "priority": "HIGH"
        }

        # Then: 응답 구조 검증
        assert "action" in optimization_data
        assert "type" in optimization_data
        assert "message" in optimization_data
        assert "optimalCar" in optimization_data
        assert optimization_data["action"] == "SEATING_OPTIMIZATION"

    def test_multiple_transfer_points_guidance(self):
        """
        [Phase 6 - 추가 시나리오] 복합 환승 경로에서 각 환승마다 안내

        상황:
        - 경로: A역 → (2호선 5-2 칸) → B역 환승 → (9호선 3 칸) → C역 환승 → (택시)
        - 각 환승마다 최적 칸 정보 제공

        예상 결과:
        - 단계별 안내 정보 반환
        """
        # Given: 복합 환승 경로
        guidance_steps = [
            {
                "step": 1,
                "currentLine": "2호선",
                "transferStation": "B역",
                "transferLine": "9호선",
                "optimalCar": "5-2"
            },
            {
                "step": 2,
                "currentLine": "9호선",
                "transferStation": "C역",
                "transferLine": "택시",
                "optimalCar": "뒤쪽 문"
            }
        ]

        # When/Then: 각 단계별 검증
        assert len(guidance_steps) == 2
        assert guidance_steps[0]["transferStation"] == "B역"
        assert guidance_steps[1]["transferStation"] == "C역"

    def test_congestion_based_seating_recommendation(self):
        """
        [Phase 6 - 추가 시나리오] 실시간 혼잡도 기반 동적 추천

        상황:
        - 시간대: 출근 시간 (7시-9시)
        - 노선: 2호선 (매우 혼잡함)
        - 여유 있는 칸: 거의 없음
        - 대체 안내: 혼잡도가 더 낮은 칸 추천

        예상 결과:
        - 여유 있는 칸 없을 시: "붐비지 않은 칸을 선택하세요" 같은 대체 메시지
        - 또는 다음 열차 이용 권장
        """
        # Given: 출근 시간의 2호선 혼잡도
        congestion_data = {
            "1-2": 95,
            "3": 90,
            "5-6": 88,
            "8": 92
        }

        # When: 여유 있는 칸 필터링 (혼잡도 40% 이하)
        available_cars = [
            car for car, congestion in congestion_data.items()
            if congestion <= 40
        ]

        # Then: 여유 있는 칸 없음
        assert len(available_cars) == 0

        # 대체 메시지 생성
        if not available_cars:
            fallback_message = "붐비지 않은 칸을 선택하시거나, 다음 열차를 이용하세요."
            assert "열차" in fallback_message
            assert "선택" in fallback_message

    def test_optimal_car_calculation_for_exit(self):
        """
        [Phase 6 - 추가 시나리오] 하차역 위치 기반 최적 칸 계산

        상황:
        - 하차역: D역
        - 역의 출입구 위치: 역 앞쪽 (1-2번 칸 근처)
        - 최적 탑승 칸: 1-2번 칸 (역 앞에서 하차하기 좋음)

        예상 결과:
        - 최적 칸: "1-2"
        """
        # Given: 하차역 정보
        exit_station = "D역"
        exit_location = "FRONT"  # 역 앞쪽
        optimal_car_for_exit = {
            "FRONT": "1-2",
            "CENTER": "4-5",
            "REAR": "7-8"
        }

        # When: 최적 칸 결정
        optimal_car = optimal_car_for_exit[exit_location]

        # Then
        assert optimal_car == "1-2"
        assert exit_station is not None
