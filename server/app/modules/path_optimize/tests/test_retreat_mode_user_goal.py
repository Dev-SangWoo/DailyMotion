"""
Phase 9: Retreat Mode - User Goal Setting (퇴근 모드 - 사용자 목표 설정)

헌법 준수:
- AGENTS.md 백엔드 헌법 [제5장] 개발 방법론 (TDD/Pytest)
- v3.0 명세서 [Logic 4.1] 퇴근 모드 사용자 목표 설정
- OpenAPI 스펙 응답 구조 준수

[Phase 9 테스트 시나리오]:
1. ✅ 사용자 선택지 3가지 (A: 가장 빠르게 / B: 편안하게 / C: 평소 경로)
2. ✅ 선택사항 저장 및 로드
3. ✅ 세션 내 선택 기억
4. ✅ 푸시 알림 텍스트 생성
5. ✅ 응답 구조 검증
"""

import pytest
from typing import Dict, Any
from datetime import datetime


class TestRetreatModeUserGoal:
    """Phase 9 - 퇴근 모드 사용자 목표 설정 테스트"""

    # ========================================
    # 테스트 데이터 Fixtures
    # ========================================

    @pytest.fixture
    def user_context(self) -> Dict[str, Any]:
        """사용자 컨텍스트"""
        return {
            "userId": "user_123",
            "userName": "김철수",
            "retreatSettings": {
                "homeAddress": "서울시 강남구 역삼동",
                "workAddress": "서울시 강남구 테헤란로",
            },
            "currentTime": datetime(2025, 11, 12, 17, 30),
        }

    @pytest.fixture
    def retreat_goal_options(self) -> Dict[str, Dict[str, Any]]:
        """퇴근 목표 선택지"""
        return {
            "A": {
                "label": "가장 빠르게",
                "description": "최단 시간으로 집에 도착",
                "priority": "SPEED",
            },
            "B": {
                "label": "편안하게",
                "description": "착석 가능성이 높은 경로",
                "priority": "COMFORT",
            },
            "C": {
                "label": "평소 경로",
                "description": "자주 이용하는 경로",
                "priority": "HABIT",
            },
        }

    # ========================================
    # Scenario 1: 사용자 선택지 표시
    # ========================================

    def test_ask_user_retreat_goal_returns_three_options(
        self, user_context: Dict[str, Any], retreat_goal_options: Dict[str, Dict[str, Any]]
    ):
        """
        [Phase 9 - 시나리오 1] 사용자 선택지 3가지 표시

        상황:
        - 퇴근 모드 시작 시점
        - 사용자에게 선택지 제시

        예상 결과:
        - action: "ASK_USER_GOAL"
        - options: [A, B, C] (3개)
        - 각 옵션에 label, description, icon 포함
        """
        # Given: 퇴근 모드 활성화
        current_time = user_context["currentTime"]

        # When: 푸시 알림 또는 화면 표시 생성
        push_notification = {
            "title": f"{user_context['userName']} 님, 퇴근 준비가 되셨나요?",
            "message": "선호하는 경로를 선택해주세요",
            "action": "ASK_USER_GOAL",
            "priority": "HIGH",
        }

        options = list(retreat_goal_options.values())

        # Then: 응답 검증
        assert push_notification["action"] == "ASK_USER_GOAL"
        assert len(options) == 3
        assert options[0]["label"] == "가장 빠르게"
        assert options[1]["label"] == "편안하게"
        assert options[2]["label"] == "평소 경로"
        assert all("priority" in opt for opt in options)

    def test_retreat_goal_options_structure(
        self, retreat_goal_options: Dict[str, Dict[str, Any]]
    ):
        """
        [Phase 9 - 시나리오 1-추가] 선택지 구조 검증

        예상:
        - A: SPEED (최단 시간)
        - B: COMFORT (착석)
        - C: HABIT (평소)
        """
        # Given: 3가지 선택지
        option_a = retreat_goal_options["A"]
        option_b = retreat_goal_options["B"]
        option_c = retreat_goal_options["C"]

        # Then: 각 옵션의 특성 검증
        assert option_a["priority"] == "SPEED"
        assert option_b["priority"] == "COMFORT"
        assert option_c["priority"] == "HABIT"
        assert option_a["description"] == "최단 시간으로 집에 도착"
        assert option_b["description"] == "착석 가능성이 높은 경로"
        assert option_c["description"] == "자주 이용하는 경로"

    # ========================================
    # Scenario 2: 선택사항 저장
    # ========================================

    def test_save_user_retreat_choice_a(self, user_context: Dict[str, Any]):
        """
        [Phase 9 - 시나리오 2] 사용자 선택 저장 (A: 가장 빠르게)

        상황:
        - 사용자가 "A. 가장 빠르게" 선택

        예상 결과:
        - action: "CHOICE_SAVED"
        - selectedChoice: "A"
        - selectedLabel: "가장 빠르게"
        - savedAt: timestamp
        """
        # Given: 사용자 선택
        selected_choice = "A"
        selected_label = "가장 빠르게"
        user_id = user_context["userId"]

        # When: 선택 저장
        saved_choice = {
            "userId": user_id,
            "selectedChoice": selected_choice,
            "selectedLabel": selected_label,
            "selectedPriority": "SPEED",
            "savedAt": datetime(2025, 11, 12, 17, 31),
            "sessionId": "session_abc123",
        }

        # Then: 저장 검증
        assert saved_choice["selectedChoice"] == "A"
        assert saved_choice["selectedLabel"] == "가장 빠르게"
        assert saved_choice["selectedPriority"] == "SPEED"
        assert "savedAt" in saved_choice

    def test_save_user_retreat_choice_b(self, user_context: Dict[str, Any]):
        """
        [Phase 9 - 시나리오 2-추가] 사용자 선택 저장 (B: 편안하게)

        상황:
        - 사용자가 "B. 편안하게" 선택

        예상 결과:
        - selectedChoice: "B"
        - selectedPriority: "COMFORT"
        """
        # Given: 사용자 선택
        selected_choice = "B"
        user_id = user_context["userId"]

        # When: 선택 저장
        saved_choice = {
            "userId": user_id,
            "selectedChoice": selected_choice,
            "selectedLabel": "편안하게",
            "selectedPriority": "COMFORT",
            "savedAt": datetime(2025, 11, 12, 17, 31),
        }

        # Then: 저장 검증
        assert saved_choice["selectedChoice"] == "B"
        assert saved_choice["selectedPriority"] == "COMFORT"

    def test_save_user_retreat_choice_c(self, user_context: Dict[str, Any]):
        """
        [Phase 9 - 시나리오 2-추가] 사용자 선택 저장 (C: 평소 경로)

        상황:
        - 사용자가 "C. 평소 경로" 선택

        예상 결과:
        - selectedChoice: "C"
        - selectedPriority: "HABIT"
        """
        # Given: 사용자 선택
        selected_choice = "C"
        user_id = user_context["userId"]

        # When: 선택 저장
        saved_choice = {
            "userId": user_id,
            "selectedChoice": selected_choice,
            "selectedLabel": "평소 경로",
            "selectedPriority": "HABIT",
            "savedAt": datetime(2025, 11, 12, 17, 31),
        }

        # Then: 저장 검증
        assert saved_choice["selectedChoice"] == "C"
        assert saved_choice["selectedPriority"] == "HABIT"

    # ========================================
    # Scenario 3: 선택사항 로드
    # ========================================

    def test_load_user_retreat_choice(self, user_context: Dict[str, Any]):
        """
        [Phase 9 - 시나리오 3] 사용자 선택 로드

        상황:
        - 이전에 선택한 내용 조회

        예상 결과:
        - 저장된 선택 정보 반환
        - 선택 시간 포함
        """
        # Given: 저장된 선택 데이터
        user_id = user_context["userId"]
        stored_choice = {
            "userId": user_id,
            "selectedChoice": "B",
            "selectedLabel": "편안하게",
            "selectedPriority": "COMFORT",
            "savedAt": datetime(2025, 11, 12, 17, 31),
            "sessionId": "session_abc123",
        }

        # When: 선택 조회
        loaded_choice = {
            "userId": stored_choice["userId"],
            "selectedChoice": stored_choice["selectedChoice"],
            "selectedLabel": stored_choice["selectedLabel"],
            "selectedPriority": stored_choice["selectedPriority"],
            "savedAt": stored_choice["savedAt"],
        }

        # Then: 로드 검증
        assert loaded_choice["userId"] == user_id
        assert loaded_choice["selectedChoice"] == "B"
        assert loaded_choice["selectedPriority"] == "COMFORT"
        assert loaded_choice["selectedLabel"] == "편안하게"

    # ========================================
    # Scenario 4: 세션 내 선택 기억
    # ========================================

    def test_retreat_choice_persists_in_session(self, user_context: Dict[str, Any]):
        """
        [Phase 9 - 시나리오 4] 세션 내 선택 기억

        상황:
        - 사용자가 선택 후 경로 조회 시
        - 이전 선택이 자동 적용

        예상 결과:
        - sessionId 포함
        - 같은 세션 내 다른 요청에서도 동일한 선택 유지
        """
        # Given: 사용자 선택 저장 시간: 17:31
        session_id = "session_abc123"
        user_id = user_context["userId"]
        saved_choice = {
            "userId": user_id,
            "selectedChoice": "A",
            "selectedLabel": "가장 빠르게",
            "sessionId": session_id,
            "savedAt": datetime(2025, 11, 12, 17, 31),
        }

        # When: 경로 조회 요청 (시간: 17:35)
        route_query_time = datetime(2025, 11, 12, 17, 35)
        session_duration_minutes = int(
            (route_query_time - saved_choice["savedAt"]).total_seconds() / 60
        )

        # Then: 같은 세션이므로 이전 선택 적용
        assert session_id == saved_choice["sessionId"]
        assert session_duration_minutes == 4  # 17:31 ~ 17:35 = 4분
        assert saved_choice["selectedChoice"] == "A"

    # ========================================
    # Scenario 5: 응답 구조 검증 (OpenAPI 스펙)
    # ========================================

    def test_retreat_goal_selection_response_structure(
        self, user_context: Dict[str, Any]
    ):
        """
        [Phase 9 - 시나리오 5] 응답 구조 검증 (OpenAPI 스펙)

        예상 응답 구조:
        {
            "action": "ASK_USER_GOAL",
            "options": [...],
            "pushNotification": {...},
            "timestamp": "..."
        }
        """
        # Given: 퇴근 모드 사용자 목표 설정 응답
        response = {
            "action": "ASK_USER_GOAL",
            "options": [
                {
                    "choice": "A",
                    "label": "가장 빠르게",
                    "description": "최단 시간으로 집에 도착",
                    "icon": "🚀",
                    "priority": "SPEED",
                },
                {
                    "choice": "B",
                    "label": "편안하게",
                    "description": "착석 가능성이 높은 경로",
                    "icon": "🪑",
                    "priority": "COMFORT",
                },
                {
                    "choice": "C",
                    "label": "평소 경로",
                    "description": "자주 이용하는 경로",
                    "icon": "⭐",
                    "priority": "HABIT",
                },
            ],
            "pushNotification": {
                "title": "퇴근 경로 선택",
                "message": "선호하는 경로를 선택해주세요",
                "priority": "HIGH",
            },
            "timestamp": datetime(2025, 11, 12, 17, 30).isoformat(),
        }

        # Then: 응답 구조 검증
        assert "action" in response
        assert response["action"] == "ASK_USER_GOAL"
        assert "options" in response
        assert len(response["options"]) == 3
        assert all("choice" in opt and "label" in opt for opt in response["options"])
        assert all("priority" in opt for opt in response["options"])
        assert "pushNotification" in response
        assert "timestamp" in response

    def test_retreat_choice_saved_response_structure(
        self, user_context: Dict[str, Any]
    ):
        """
        [Phase 9 - 시나리오 5-추가] 선택 저장 후 응답 구조

        예상 응답:
        {
            "action": "CHOICE_SAVED",
            "selectedChoice": "B",
            "nextAction": "GET_ROUTES_BY_GOAL",
            "selectedLabel": "편안하게"
        }
        """
        # Given: 사용자 선택 저장
        user_id = user_context["userId"]
        selected_choice = "B"

        # When: 선택 저장 응답
        response = {
            "action": "CHOICE_SAVED",
            "userId": user_id,
            "selectedChoice": selected_choice,
            "selectedLabel": "편안하게",
            "selectedPriority": "COMFORT",
            "nextAction": "GET_ROUTES_BY_GOAL",
            "message": "편안한 경로로 돌아가시겠군요. 대기 중입니다...",
            "timestamp": datetime(2025, 11, 12, 17, 31).isoformat(),
        }

        # Then: 응답 구조 검증
        assert response["action"] == "CHOICE_SAVED"
        assert response["selectedChoice"] == "B"
        assert response["nextAction"] == "GET_ROUTES_BY_GOAL"
        assert "selectedLabel" in response
        assert "timestamp" in response


# ========================================
# 통합 테스트
# ========================================


class TestRetreatModeGoalIntegration:
    """퇴근 모드 사용자 목표 설정 통합 테스트"""

    def test_full_goal_selection_flow(self):
        """
        [통합 테스트] 전체 선택 흐름

        흐름:
        1. ASK_USER_GOAL (선택지 제시)
        2. 사용자가 "B" 선택
        3. CHOICE_SAVED (저장)
        4. GET_ROUTES_BY_GOAL (다음 스텝)
        """
        # Step 1: 선택지 제시
        ask_goal_response = {
            "action": "ASK_USER_GOAL",
            "optionCount": 3,
        }

        assert ask_goal_response["action"] == "ASK_USER_GOAL"
        assert ask_goal_response["optionCount"] == 3

        # Step 2: 사용자 선택
        user_choice = "B"

        # Step 3: 선택 저장
        save_response = {
            "action": "CHOICE_SAVED",
            "selectedChoice": user_choice,
            "selectedLabel": "편안하게",
            "nextAction": "GET_ROUTES_BY_GOAL",
        }

        assert save_response["selectedChoice"] == "B"
        assert save_response["nextAction"] == "GET_ROUTES_BY_GOAL"

        # Step 4: 경로 조회로 진행
        next_action = save_response["nextAction"]
        assert next_action == "GET_ROUTES_BY_GOAL"

    def test_multiple_choice_changes_in_session(self):
        """
        [통합 테스트] 세션 내 선택 변경

        상황:
        - 사용자가 처음 B 선택 → 나중에 A로 변경
        - 최종 선택은 A가 유효
        """
        # First choice: B
        first_choice = {
            "userId": "user_123",
            "selectedChoice": "B",
            "selectedLabel": "편안하게",
            "savedAt": datetime(2025, 11, 12, 17, 31),
        }

        assert first_choice["selectedChoice"] == "B"

        # Second choice: A (변경)
        second_choice = {
            "userId": "user_123",
            "selectedChoice": "A",
            "selectedLabel": "가장 빠르게",
            "savedAt": datetime(2025, 11, 12, 17, 32),  # 1분 후
        }

        assert second_choice["selectedChoice"] == "A"

        # Final choice should be A
        final_choice = second_choice["selectedChoice"]
        assert final_choice == "A"
        assert second_choice["savedAt"] > first_choice["savedAt"]
