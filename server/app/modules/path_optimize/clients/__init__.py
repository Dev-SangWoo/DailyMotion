"""
Path Optimize 모듈의 외부 모듈 통신 클라이언트들

이 패키지는 path_optimize 모듈이 다른 모듈(ai_pattern, risk_manage)과
통신하기 위한 Service Interface와 Mock 구현을 포함합니다.

규칙: 각 모듈은 정의된 'service layer'를 통해서만 통신합니다.
(claude.md & AGENTS.md 참조)
"""

from .ai_pattern_client import AIPatternService, MockAIPatternService
from .risk_manage_client import RiskManageService, MockRiskManageService

__all__ = [
    "AIPatternService",
    "MockAIPatternService",
    "RiskManageService",
    "MockRiskManageService",
]