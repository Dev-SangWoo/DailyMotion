"""
Retreat Mode Handler Service

Phase 9: Logic 4.1 - 퇴근 모드 사용자 목표 설정

v3.0 명세서:
- Logic 4.1: 퇴근 모드 사용자 목표 설정 (A/B/C 선택)
  * 목표 A: 가장 빠르게 (최단 시간)
  * 목표 B: 편안하게 (착석 선호)
  * 목표 C: 평소 경로 (사용자 학습)
"""

from typing import Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RetreatModeHandler:
    """
    퇴근 모드 사용자 목표 설정 엔진

    Phase 9: Logic 4.1 - 퇴근 모드 목표 설정
    """

    def __init__(self):
        """RetreatModeHandler 초기화"""
        logger.info("✅ RetreatModeHandler 초기화")

    # ========================================
    # 퇴근 모드 사용자 목표 선택지 제시
    # ========================================

    def ask_user_retreat_goal(
        self, user_name: Optional[str] = None, user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        퇴근 모드 사용자 목표 선택지 제시

        Args:
            user_name: 사용자 이름 (선택)
            user_id: 사용자 ID (선택)

        Returns:
            {
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
                "pushNotification": {
                    "title": "...",
                    "message": "..."
                },
                "timestamp": "..."
            }
        """
        # 1️⃣ 선택지 정의
        options = [
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
        ]

        # 2️⃣ 푸시 알림 텍스트 생성
        user_greeting = f"{user_name} 님" if user_name else "고객님"
        push_notification = {
            "title": f"퇴근 준비, {user_greeting}!",
            "message": "선호하는 경로를 선택해주세요",
            "priority": "HIGH",
        }

        # 3️⃣ 응답 구성
        result = {
            "action": "ASK_USER_GOAL",
            "options": options,
            "pushNotification": push_notification,
            "timestamp": datetime.utcnow().isoformat(),
        }

        logger.info(f"🎯 퇴근 모드 목표 선택지 제시: {user_id}")
        return result

    # ========================================
    # 사용자 선택 저장
    # ========================================

    def save_retreat_choice(
        self,
        user_id: str,
        selected_choice: str,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        사용자 퇴근 목표 선택 저장

        Args:
            user_id: 사용자 ID
            selected_choice: 선택 (A/B/C)
            session_id: 세션 ID (선택)

        Returns:
            {
                "action": "CHOICE_SAVED",
                "userId": "...",
                "selectedChoice": "B",
                "selectedLabel": "편안하게",
                "selectedPriority": "COMFORT",
                "nextAction": "GET_ROUTES_BY_GOAL",
                "message": "...",
                "timestamp": "..."
            }
        """
        # 1️⃣ 선택 유효성 검증
        choice_mapping = {
            "A": {
                "label": "가장 빠르게",
                "priority": "SPEED",
                "description": "최단 시간으로 도착",
            },
            "B": {
                "label": "편안하게",
                "priority": "COMFORT",
                "description": "착석 가능성 높은 경로",
            },
            "C": {
                "label": "평소 경로",
                "priority": "HABIT",
                "description": "자주 이용하는 경로",
            },
        }

        if selected_choice not in choice_mapping:
            logger.warning(f"⚠️ 유효하지 않은 선택: {selected_choice}")
            return {
                "action": "CHOICE_INVALID",
                "error": f"Invalid choice: {selected_choice}",
            }

        # 2️⃣ 선택 저장 (실제로는 DB에 저장)
        choice_info = choice_mapping[selected_choice]
        saved_data = {
            "userId": user_id,
            "selectedChoice": selected_choice,
            "selectedLabel": choice_info["label"],
            "selectedPriority": choice_info["priority"],
            "sessionId": session_id,
            "savedAt": datetime.utcnow().isoformat(),
        }

        # 3️⃣ 응답 생성
        message_templates = {
            "A": "⚡ 가장 빠른 경로를 추천해드립니다!",
            "B": "🪑 편안한 경로를 찾아드립니다!",
            "C": "⭐ 평소 경로를 준비했습니다!",
        }

        result = {
            "action": "CHOICE_SAVED",
            "userId": user_id,
            "selectedChoice": selected_choice,
            "selectedLabel": choice_info["label"],
            "selectedPriority": choice_info["priority"],
            "nextAction": "GET_ROUTES_BY_GOAL",
            "message": message_templates[selected_choice],
            "timestamp": datetime.utcnow().isoformat(),
        }

        logger.info(f"✅ 퇴근 목표 저장: {user_id} -> {selected_choice} ({choice_info['label']})")
        return result

    # ========================================
    # 저장된 선택 조회
    # ========================================

    def get_saved_retreat_choice(self, user_id: str) -> Dict[str, Any]:
        """
        사용자의 저장된 퇴근 목표 선택 조회

        Args:
            user_id: 사용자 ID

        Returns:
            {
                "userId": "...",
                "selectedChoice": "B",
                "selectedLabel": "편안하게",
                "selectedPriority": "COMFORT",
                "savedAt": "...",
                "isValid": True/False
            }
        """
        # 실제 구현에서는 DB 조회
        # 여기서는 Mock 데이터 반환
        logger.info(f"📍 퇴근 목표 조회: {user_id}")

        # 저장된 데이터가 없을 경우
        return {
            "userId": user_id,
            "selectedChoice": None,
            "selectedLabel": None,
            "selectedPriority": None,
            "savedAt": None,
            "isValid": False,
            "message": "저장된 선택이 없습니다. 다시 선택해주세요.",
        }

    # ========================================
    # 세션 내 선택 유지
    # ========================================

    def persist_choice_in_session(
        self, user_id: str, selected_choice: str, session_id: str
    ) -> bool:
        """
        세션 내 퇴근 목표 선택 유지

        Args:
            user_id: 사용자 ID
            selected_choice: 선택 (A/B/C)
            session_id: 세션 ID

        Returns:
            성공 여부
        """
        # 세션 저장소에 저장 (실제로는 Redis 등 사용)
        session_data = {
            "userId": user_id,
            "selectedChoice": selected_choice,
            "sessionId": session_id,
            "savedAt": datetime.utcnow().isoformat(),
            "expiresAt": (datetime.utcnow().timestamp() + 3600),  # 1시간 유효
        }

        logger.info(f"✅ 세션에 퇴근 목표 저장: {session_id}")
        return True

    # ========================================
    # 추천 메시지 생성
    # ========================================

    def get_goal_recommendation_message(self, selected_choice: str) -> str:
        """
        선택에 따른 추천 메시지 생성

        Args:
            selected_choice: 선택 (A/B/C)

        Returns:
            추천 메시지
        """
        messages = {
            "A": "🚀 빠르게 도착하고 싶으신가요? 최단 시간 경로를 추천해드립니다!",
            "B": "🪑 편하게 앉아 가고 싶으신가요? 착석 가능성 높은 경로를 찾아드립니다!",
            "C": "⭐ 평소 경로가 좋으신가요? 자주 이용하던 경로를 준비했습니다!",
        }

        return messages.get(selected_choice, "경로를 추천해드립니다!")


# 전역 인스턴스
retreat_mode_handler = RetreatModeHandler()
