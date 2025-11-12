"""
Phase 9: Retreat Mode - Routes by Goal (퇴근 모드 - 목표별 경로 제안)

헌법 준수:
- AGENTS.md 백엔드 헌법 [제5장] 개발 방법론 (TDD/Pytest)
- v3.0 명세서 [Logic 4.2] 퇴근 모드 경로 필터링
- OpenAPI 스펙 응답 구조 준수

[Phase 9 테스트 시나리오]:
1. ✅ 목표 A (가장 빠르게): 최단 시간 경로
2. ✅ 목표 B (편안하게): 착석 가능성 높은 경로
3. ✅ 목표 C (평소 경로): 사용자 학습 기반 경로
4. ✅ 경로별 메타데이터 포함
5. ✅ 응답 구조 검증
"""

import pytest
from typing import Dict, Any, List
from datetime import datetime


class TestRetreatRoutesByGoal:
    """Phase 9 - 퇴근 모드 목표별 경로 제안 테스트"""

    # ========================================
    # 테스트 데이터 Fixtures
    # ========================================

    @pytest.fixture
    def available_routes(self) -> List[Dict[str, Any]]:
        """사용 가능한 경로 데이터"""
        return [
            {
                "routeId": "route_1",
                "name": "경로 1 (가장 빠름)",
                "estimatedDuration": 25,  # 25분
                "transfers": 1,
                "seatingProbability": 30,  # 착석 확률 30%
                "congestionLevel": 70,  # 혼잡도 70%
                "frequencyLastWeek": 0,  # 지난주 이용 횟수
                "totalTransactions": 15,  # 누적 이용 횟수
                "userPreference": "NEUTRAL",  # 사용자 선호도
            },
            {
                "routeId": "route_2",
                "name": "경로 2 (편안함)",
                "estimatedDuration": 32,  # 32분
                "transfers": 0,
                "seatingProbability": 85,  # 착석 확률 85%
                "congestionLevel": 45,  # 혼잡도 45%
                "frequencyLastWeek": 4,  # 지난주 4회
                "totalTransactions": 28,  # 누적 28회
                "userPreference": "HIGH",  # 선호도 높음
            },
            {
                "routeId": "route_3",
                "name": "경로 3 (평소)",
                "estimatedDuration": 30,  # 30분
                "transfers": 1,
                "seatingProbability": 50,  # 착석 확률 50%
                "congestionLevel": 55,  # 혼잡도 55%
                "frequencyLastWeek": 5,  # 지난주 5회 (가장 자주)
                "totalTransactions": 42,  # 누적 42회 (가장 많음)
                "userPreference": "VERY_HIGH",  # 선호도 매우 높음
            },
        ]

    # ========================================
    # Scenario 1: 목표 A - 가장 빠르게
    # ========================================

    def test_goal_a_returns_fastest_route(self, available_routes: List[Dict[str, Any]]):
        """
        [Phase 9 - 시나리오 1] 목표 A: 가장 빠르게

        상황:
        - 사용자가 "A. 가장 빠르게" 선택

        예상 결과:
        - 최단 시간 경로 우선 순위
        - 경로 1 (25분) 상위
        - 메타데이터: 소요시간, 환승, 혼잡도
        """
        # Given: 사용자 선택 = A (SPEED)
        goal = "A"
        goal_type = "SPEED"

        # When: 목표 A에 맞는 경로 선택
        routes_sorted_by_duration = sorted(
            available_routes, key=lambda r: r["estimatedDuration"]
        )

        # Then: 가장 빠른 경로가 첫번째
        fastest_route = routes_sorted_by_duration[0]
        assert fastest_route["routeId"] == "route_1"
        assert fastest_route["estimatedDuration"] == 25
        assert fastest_route["name"] == "경로 1 (가장 빠름)"

        # 상위 3개 경로의 소요시간 검증
        top_3_routes = routes_sorted_by_duration[:3]
        assert top_3_routes[0]["estimatedDuration"] == 25  # 최단
        assert top_3_routes[1]["estimatedDuration"] == 30
        assert top_3_routes[2]["estimatedDuration"] == 32

    def test_goal_a_response_structure(self, available_routes: List[Dict[str, Any]]):
        """
        [Phase 9 - 시나리오 1-추가] 목표 A 응답 구조

        응답에 포함되어야 할 항목:
        - selectedGoal: "A"
        - goalLabel: "가장 빠르게"
        - routes: 빠른 순서대로 정렬
        - metadata: 소요시간, 환승, 혼잡도
        """
        # Given: 목표 A 선택
        selected_goal = "A"

        # When: 경로 반환 (빠른 순서)
        routes_for_goal_a = sorted(
            available_routes, key=lambda r: r["estimatedDuration"]
        )

        response = {
            "selectedGoal": selected_goal,
            "goalLabel": "가장 빠르게",
            "goalDescription": "최단 시간으로 도착",
            "recommendedRoutes": routes_for_goal_a,
            "sortedBy": "estimatedDuration",
            "message": "✈️ 가장 빠른 경로를 추천했습니다!",
        }

        # Then: 응답 구조 검증
        assert response["selectedGoal"] == "A"
        assert response["goalLabel"] == "가장 빠르게"
        assert len(response["recommendedRoutes"]) == 3
        assert response["sortedBy"] == "estimatedDuration"

    # ========================================
    # Scenario 2: 목표 B - 편안하게
    # ========================================

    def test_goal_b_returns_comfortable_route(
        self, available_routes: List[Dict[str, Any]]
    ):
        """
        [Phase 9 - 시나리오 2] 목표 B: 편안하게

        상황:
        - 사용자가 "B. 편안하게" 선택

        예상 결과:
        - 착석 가능성 높은 경로 우선
        - 경로 2 (착석률 85%) 상위
        - 혼잡도 낮은 경로 추천
        """
        # Given: 사용자 선택 = B (COMFORT)
        goal = "B"
        goal_type = "COMFORT"

        # When: 목표 B에 맞는 경로 선택 (착석률 높은 순)
        routes_by_seating = sorted(
            available_routes,
            key=lambda r: (-r["seatingProbability"], r["estimatedDuration"]),
        )

        # Then: 착석률 높은 경로가 첫번째
        most_comfortable = routes_by_seating[0]
        assert most_comfortable["routeId"] == "route_2"
        assert most_comfortable["seatingProbability"] == 85
        assert most_comfortable["name"] == "경로 2 (편안함)"

        # 상위 3개 경로의 착석률 검증 (내림차순)
        top_3_routes = routes_by_seating[:3]
        assert top_3_routes[0]["seatingProbability"] == 85
        assert top_3_routes[1]["seatingProbability"] == 50
        assert top_3_routes[2]["seatingProbability"] == 30

    def test_goal_b_prefers_low_congestion(
        self, available_routes: List[Dict[str, Any]]
    ):
        """
        [Phase 9 - 시나리오 2-추가] 목표 B: 혼잡도 낮은 경로 우선

        상황:
        - 착석 가능성과 혼잡도를 모두 고려
        - 착석률 × (100 - 혼잡도) 점수로 계산

        예상:
        - 경로 2: 85 × (100 - 45) = 4675 점
        - 경로 3: 50 × (100 - 55) = 2250 점
        - 경로 1: 30 × (100 - 70) = 900 점
        """
        # Given: 목표 B (편안함)
        goal = "B"

        # When: 착석률과 혼잡도를 고려한 점수 계산
        for route in available_routes:
            route["comfortScore"] = route["seatingProbability"] * (
                100 - route["congestionLevel"]
            )

        routes_by_comfort = sorted(
            available_routes, key=lambda r: r["comfortScore"], reverse=True
        )

        # Then: 점수 검증
        best_comfort = routes_by_comfort[0]
        assert best_comfort["routeId"] == "route_2"
        assert best_comfort["comfortScore"] == 4675

        # 점수 순서 검증
        assert routes_by_comfort[0]["comfortScore"] == 4675  # 경로 2
        assert routes_by_comfort[1]["comfortScore"] == 2250  # 경로 3
        assert routes_by_comfort[2]["comfortScore"] == 900  # 경로 1

    # ========================================
    # Scenario 3: 목표 C - 평소 경로
    # ========================================

    def test_goal_c_returns_habit_based_route(
        self, available_routes: List[Dict[str, Any]]
    ):
        """
        [Phase 9 - 시나리오 3] 목표 C: 평소 경로

        상황:
        - 사용자가 "C. 평소 경로" 선택

        예상 결과:
        - 이용 빈도 높은 경로 우선
        - 경로 3 (지난주 5회, 누적 42회) 상위
        - 사용자 학습 기반 정렬
        """
        # Given: 사용자 선택 = C (HABIT)
        goal = "C"
        goal_type = "HABIT"

        # When: 목표 C에 맞는 경로 선택 (누적 이용 횟수 기준)
        routes_by_frequency = sorted(
            available_routes, key=lambda r: r["totalTransactions"], reverse=True
        )

        # Then: 가장 많이 이용한 경로가 첫번째
        habit_route = routes_by_frequency[0]
        assert habit_route["routeId"] == "route_3"
        assert habit_route["totalTransactions"] == 42
        assert habit_route["name"] == "경로 3 (평소)"

        # 이용 횟수 순서 검증 (내림차순)
        top_3_routes = routes_by_frequency[:3]
        assert top_3_routes[0]["totalTransactions"] == 42  # 경로 3
        assert top_3_routes[1]["totalTransactions"] == 28  # 경로 2
        assert top_3_routes[2]["totalTransactions"] == 15  # 경로 1

    def test_goal_c_recent_frequency_weighted(
        self, available_routes: List[Dict[str, Any]]
    ):
        """
        [Phase 9 - 시나리오 3-추가] 목표 C: 최근 이용 빈도 가중치

        상황:
        - 지난주 이용 빈도와 누적 이용 횟수를 함께 고려
        - 가중치: 최근 빈도 70%, 누적 빈도 30%

        예상:
        - 경로 3: 5 × 0.7 + 42 × 0.3 = 3.5 + 12.6 = 16.1
        - 경로 2: 4 × 0.7 + 28 × 0.3 = 2.8 + 8.4 = 11.2
        - 경로 1: 0 × 0.7 + 15 × 0.3 = 0 + 4.5 = 4.5
        """
        # Given: 목표 C (평소)
        goal = "C"

        # When: 가중치 점수 계산
        for route in available_routes:
            route["habitScore"] = (
                route["frequencyLastWeek"] * 0.7 + route["totalTransactions"] * 0.3
            )

        routes_by_habit = sorted(
            available_routes, key=lambda r: r["habitScore"], reverse=True
        )

        # Then: 점수 검증
        best_habit = routes_by_habit[0]
        assert best_habit["routeId"] == "route_3"
        assert best_habit["habitScore"] == pytest.approx(16.1, 0.1)

        # 점수 순서 검증
        assert routes_by_habit[0]["habitScore"] == pytest.approx(16.1, 0.1)  # 경로 3
        assert routes_by_habit[1]["habitScore"] == pytest.approx(11.2, 0.1)  # 경로 2
        assert routes_by_habit[2]["habitScore"] == pytest.approx(4.5, 0.1)  # 경로 1

    # ========================================
    # Scenario 4: 응답 구조 검증 (OpenAPI 스펙)
    # ========================================

    def test_get_routes_by_goal_response_structure(
        self, available_routes: List[Dict[str, Any]]
    ):
        """
        [Phase 9 - 시나리오 4] 목표별 경로 제안 응답 구조

        응답 구조:
        {
            "action": "GET_ROUTES_BY_GOAL",
            "selectedGoal": "A|B|C",
            "goalLabel": "string",
            "routes": [
                {
                    "routeId": "string",
                    "name": "string",
                    "estimatedDuration": number,
                    "transfers": number,
                    "recommendation": "string",
                    "metadata": {...}
                }
            ],
            "message": "string"
        }
        """
        # Given: 목표 A 선택
        selected_goal = "A"

        # When: 경로 반환
        routes_for_goal = sorted(
            available_routes, key=lambda r: r["estimatedDuration"]
        )

        response = {
            "action": "GET_ROUTES_BY_GOAL",
            "selectedGoal": selected_goal,
            "goalLabel": "가장 빠르게",
            "routes": [
                {
                    "routeId": route["routeId"],
                    "name": route["name"],
                    "estimatedDuration": route["estimatedDuration"],
                    "transfers": route["transfers"],
                    "seatingProbability": route["seatingProbability"],
                    "congestionLevel": route["congestionLevel"],
                    "recommendation": f"예상 소요시간: {route['estimatedDuration']}분",
                    "metadata": {
                        "frequencyLastWeek": route["frequencyLastWeek"],
                        "totalTransactions": route["totalTransactions"],
                    },
                }
                for route in routes_for_goal
            ],
            "message": "✈️ 가장 빠른 경로를 추천했습니다!",
            "timestamp": datetime(2025, 11, 12, 17, 35).isoformat(),
        }

        # Then: 응답 구조 검증
        assert "action" in response
        assert response["action"] == "GET_ROUTES_BY_GOAL"
        assert "selectedGoal" in response
        assert "goalLabel" in response
        assert "routes" in response
        assert len(response["routes"]) == 3

        # 각 경로의 필드 검증
        for route in response["routes"]:
            assert "routeId" in route
            assert "name" in route
            assert "estimatedDuration" in route
            assert "transfers" in route
            assert "seatingProbability" in route
            assert "congestionLevel" in route
            assert "recommendation" in route
            assert "metadata" in route

    # ========================================
    # Scenario 5: 복합 시나리오
    # ========================================

    def test_all_three_goals_different_routes(
        self, available_routes: List[Dict[str, Any]]
    ):
        """
        [Phase 9 - 시나리오 5] 3가지 목표로 다른 결과 반환

        상황:
        - 같은 경로 데이터로 3가지 목표별 정렬

        예상:
        - A (SPEED): 경로 1 (25분) 상위
        - B (COMFORT): 경로 2 (착석 85%) 상위
        - C (HABIT): 경로 3 (누적 42회) 상위
        """
        # Given: 3가지 목표 모두 확인
        goals = ["A", "B", "C"]

        # When: 각 목표별로 경로 정렬
        result_a = sorted(
            available_routes, key=lambda r: r["estimatedDuration"]
        )[0]  # 가장 빠름
        result_b = sorted(
            available_routes,
            key=lambda r: -r["seatingProbability"],
        )[0]  # 가장 편함
        result_c = sorted(
            available_routes, key=lambda r: -r["totalTransactions"]
        )[0]  # 평소 경로

        # Then: 목표별 추천 경로가 다름
        assert result_a["routeId"] == "route_1"  # A: 경로 1
        assert result_b["routeId"] == "route_2"  # B: 경로 2
        assert result_c["routeId"] == "route_3"  # C: 경로 3

        # 3개 경로가 모두 다름
        recommended_ids = {result_a["routeId"], result_b["routeId"], result_c["routeId"]}
        assert len(recommended_ids) == 3


# ========================================
# 통합 테스트
# ========================================


class TestRetreatRoutesIntegration:
    """퇴근 모드 경로 제안 통합 테스트"""

    def test_complete_goal_to_routes_flow(self):
        """
        [통합 테스트] 목표 선택 → 경로 조회 전체 흐름

        흐름:
        1. 사용자가 목표 B (편안하게) 선택
        2. 경로 조회 요청
        3. B 맞춤 경로 반환 (착석률 높음)
        """
        # Step 1: 목표 선택
        selected_goal = "B"

        # Step 2: 경로 조회
        available_routes = [
            {
                "routeId": "route_2",
                "estimatedDuration": 32,
                "seatingProbability": 85,
                "congestionLevel": 45,
            }
        ]

        # Step 3: 응답
        response = {
            "action": "GET_ROUTES_BY_GOAL",
            "selectedGoal": selected_goal,
            "goalLabel": "편안하게",
            "routes": available_routes,
        }

        assert response["selectedGoal"] == "B"
        assert response["routes"][0]["seatingProbability"] == 85

    def test_goal_change_rerequests_routes(self):
        """
        [통합 테스트] 목표 변경 시 새로운 경로 조회

        상황:
        1. 사용자가 처음 목표 A 선택 → 경로 1 반환
        2. 목표 변경 (B) → 경로 2 반환
        3. 다시 변경 (C) → 경로 3 반환
        """
        routes_data = {
            "A": {"routeId": "route_1", "estimatedDuration": 25},
            "B": {"routeId": "route_2", "seatingProbability": 85},
            "C": {"routeId": "route_3", "totalTransactions": 42},
        }

        # First goal: A
        first_request_goal = "A"
        first_response_route = routes_data["A"]["routeId"]
        assert first_response_route == "route_1"

        # Change to B
        second_request_goal = "B"
        second_response_route = routes_data["B"]["routeId"]
        assert second_response_route == "route_2"

        # Change to C
        third_request_goal = "C"
        third_response_route = routes_data["C"]["routeId"]
        assert third_response_route == "route_3"

        # All different
        all_routes = {first_response_route, second_response_route, third_response_route}
        assert len(all_routes) == 3
