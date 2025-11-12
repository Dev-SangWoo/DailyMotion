"""
Route Selector by Goal Service

Phase 9: Logic 4.2 - 퇴근 모드 경로 필터링

v3.0 명세서:
- Logic 4.2: 목표별 경로 필터링 및 제안
  * A (SPEED): 최단 시간 경로
  * B (COMFORT): 착석 가능성 높은 경로
  * C (HABIT): 사용자 학습 기반 경로
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RouteSelectorByGoal:
    """
    퇴근 목표별 경로 선택 엔진

    Phase 9: Logic 4.2 - 퇴근 목표별 경로 필터링
    """

    # 목표별 선택 기준
    GOAL_CRITERIA = {
        "A": {
            "label": "가장 빠르게",
            "priority": "SPEED",
            "sortKey": "estimatedDuration",
            "icon": "🚀",
            "message": "✈️ 가장 빠른 경로를 추천했습니다!",
        },
        "B": {
            "label": "편안하게",
            "priority": "COMFORT",
            "sortKey": "comfortScore",
            "icon": "🪑",
            "message": "🪑 편안한 경로를 추천했습니다!",
        },
        "C": {
            "label": "평소 경로",
            "priority": "HABIT",
            "sortKey": "habitScore",
            "icon": "⭐",
            "message": "⭐ 평소 경로를 추천했습니다!",
        },
    }

    def __init__(self):
        """RouteSelectorByGoal 초기화"""
        logger.info("✅ RouteSelectorByGoal 초기화")

    # ========================================
    # 목표별 점수 계산
    # ========================================

    def calculate_comfort_score(self, route: Dict[str, Any]) -> float:
        """
        편안함 점수 계산 (착석률 × (100 - 혼잡도))

        Args:
            route: 경로 정보

        Returns:
            편안함 점수 (0~10000)
        """
        seating = route.get("seatingProbability", 0)
        congestion = route.get("congestionLevel", 50)

        # 착석률 × (100 - 혼잡도)
        score = seating * (100 - congestion)
        return score

    def calculate_habit_score(self, route: Dict[str, Any]) -> float:
        """
        습관 점수 계산 (최근 빈도 70% + 누적 빈도 30%)

        Args:
            route: 경로 정보

        Returns:
            습관 점수 (가중치 기반)
        """
        last_week = route.get("frequencyLastWeek", 0)
        total = route.get("totalTransactions", 0)

        # 최근 빈도 70% + 누적 빈도 30%
        score = last_week * 0.7 + total * 0.3
        return score

    # ========================================
    # 목표별 경로 필터링
    # ========================================

    def filter_routes_by_goal(
        self, routes: List[Dict[str, Any]], goal: str, top_n: int = 3
    ) -> List[Dict[str, Any]]:
        """
        사용자 목표에 맞는 경로 필터링 및 정렬

        Args:
            routes: 사용 가능한 경로 목록
            goal: 사용자 목표 (A/B/C)
            top_n: 반환할 경로 개수 (기본값: 3)

        Returns:
            목표에 맞게 정렬된 경로 목록
        """
        if goal not in self.GOAL_CRITERIA:
            logger.warning(f"⚠️ 유효하지 않은 목표: {goal}")
            return routes

        # 1️⃣ 목표에 따른 점수 계산
        routes_with_score = []

        for route in routes:
            route_copy = dict(route)

            if goal == "A":
                # 목표 A: 최단 시간 (이미 estimatedDuration 필드 있음)
                route_copy["score"] = route.get("estimatedDuration", float("inf"))

            elif goal == "B":
                # 목표 B: 편안함 (착석률 × (100 - 혼잡도))
                route_copy["comfortScore"] = self.calculate_comfort_score(route)
                route_copy["score"] = route_copy["comfortScore"]

            elif goal == "C":
                # 목표 C: 습관 (최근 빈도 + 누적 빈도)
                route_copy["habitScore"] = self.calculate_habit_score(route)
                route_copy["score"] = route_copy["habitScore"]

            routes_with_score.append(route_copy)

        # 2️⃣ 목표에 따라 정렬
        if goal == "A":
            # A: 시간 오름차순 (작을수록 좋음)
            sorted_routes = sorted(routes_with_score, key=lambda r: r["score"])
        else:
            # B, C: 점수 내림차순 (클수록 좋음)
            sorted_routes = sorted(
                routes_with_score, key=lambda r: r["score"], reverse=True
            )

        # 3️⃣ 상위 N개 반환
        result = sorted_routes[:top_n]

        logger.info(f"✅ 목표 {goal} 경로 필터링: {len(result)}개 선택")
        return result

    # ========================================
    # 목표별 경로 제안 응답 생성
    # ========================================

    def get_routes_by_goal(
        self, routes: List[Dict[str, Any]], goal: str
    ) -> Dict[str, Any]:
        """
        사용자 목표에 따른 경로 제안

        Args:
            routes: 사용 가능한 경로 목록
            goal: 사용자 목표 (A/B/C)

        Returns:
            {
                "action": "GET_ROUTES_BY_GOAL",
                "selectedGoal": "A|B|C",
                "goalLabel": "...",
                "routes": [
                    {
                        "routeId": "...",
                        "name": "...",
                        "estimatedDuration": number,
                        "recommendation": "...",
                        "metadata": {...}
                    },
                    ...
                ],
                "message": "...",
                "timestamp": "..."
            }
        """
        # 1️⃣ 목표 정보 확인
        goal_info = self.GOAL_CRITERIA.get(goal)
        if not goal_info:
            logger.warning(f"⚠️ 유효하지 않은 목표: {goal}")
            return {"action": "ERROR", "error": f"Invalid goal: {goal}"}

        # 2️⃣ 경로 필터링 및 정렬
        filtered_routes = self.filter_routes_by_goal(routes, goal)

        # 3️⃣ 응답 경로 정보 구성
        response_routes = []
        for route in filtered_routes:
            response_route = {
                "routeId": route.get("routeId", ""),
                "name": route.get("name", ""),
                "estimatedDuration": route.get("estimatedDuration", 0),
                "transfers": route.get("transfers", 0),
                "seatingProbability": route.get("seatingProbability", 0),
                "congestionLevel": route.get("congestionLevel", 0),
            }

            # 목표별 추천 메시지
            if goal == "A":
                response_route["recommendation"] = (
                    f"예상 소요시간: {route.get('estimatedDuration', 0)}분"
                )
            elif goal == "B":
                response_route["recommendation"] = (
                    f"착석 가능성: {route.get('seatingProbability', 0)}%"
                )
            elif goal == "C":
                response_route["recommendation"] = (
                    f"이용 횟수: {route.get('totalTransactions', 0)}회 (지난주 {route.get('frequencyLastWeek', 0)}회)"
                )

            # 메타데이터
            response_route["metadata"] = {
                "frequencyLastWeek": route.get("frequencyLastWeek", 0),
                "totalTransactions": route.get("totalTransactions", 0),
                "userPreference": route.get("userPreference", "NEUTRAL"),
            }

            response_routes.append(response_route)

        # 4️⃣ 최종 응답 구성
        result = {
            "action": "GET_ROUTES_BY_GOAL",
            "selectedGoal": goal,
            "goalLabel": goal_info["label"],
            "goalDescription": f"목표: {goal_info['label']}",
            "routes": response_routes,
            "sortedBy": self.GOAL_CRITERIA[goal]["sortKey"],
            "message": goal_info["message"],
            "timestamp": datetime.utcnow().isoformat(),
        }

        logger.info(f"✅ 목표별 경로 제안: {goal} ({goal_info['label']})")
        return result

    # ========================================
    # 목표별 경로 메타데이터
    # ========================================

    def get_goal_metadata(self, goal: str) -> Dict[str, Any]:
        """
        목표별 메타데이터 반환

        Args:
            goal: 사용자 목표 (A/B/C)

        Returns:
            목표 정보 및 메타데이터
        """
        metadata = {
            "A": {
                "label": "가장 빠르게",
                "description": "최단 시간으로 도착",
                "priority": "SPEED",
                "metrics": ["estimatedDuration", "transfers"],
                "bestFor": "빨리 집에 가고 싶을 때",
            },
            "B": {
                "label": "편안하게",
                "description": "착석 가능성이 높은 경로",
                "priority": "COMFORT",
                "metrics": ["seatingProbability", "congestionLevel"],
                "bestFor": "편히 앉아서 가고 싶을 때",
            },
            "C": {
                "label": "평소 경로",
                "description": "자주 이용하는 경로",
                "priority": "HABIT",
                "metrics": ["frequencyLastWeek", "totalTransactions"],
                "bestFor": "익숙한 경로로 가고 싶을 때",
            },
        }

        return metadata.get(goal, {})


# 전역 인스턴스
route_selector_by_goal = RouteSelectorByGoal()
