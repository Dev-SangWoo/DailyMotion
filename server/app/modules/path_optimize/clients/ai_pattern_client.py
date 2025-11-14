"""
AI Pattern 모듈과의 통신을 위한 Service Interface

규칙: path_optimize 모듈은 ai_pattern 모듈과 이 interface를 통해서만 통신합니다.
(claude.md & AGENTS.md "각 모듈은 정의된 '서비스 레이어'를 통해서만 통신한다")

ai_pattern 모듈의 책임 (AGENTS.md Line 116):
- [Logic 3.1]의 핵심 자산인 '구간별/시간대별 평균 소요시간 DB' 구축 및 관리

이 interface를 통해:
1. 과거 통계 데이터 조회 (평균 소요시간)
2. 실시간 예측 소요시간 조회 (혼잡도 기반)
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime


class AIPatternService(ABC):
    """
    AI Pattern 모듈의 Service Layer Interface.

    모든 구현은 이 interface를 상속받아야 하며,
    path_optimize는 구현체의 타입을 알 필요가 없습니다. (다형성)
    """

    @abstractmethod
    def query_average_duration(
        self,
        segment_id: str,
        departure_hour: int,
        day_of_week: int
    ) -> Dict[str, Any]:
        """
        구간별 시간대별 평균 소요시간 조회.

        구간(버스노선 또는 지하철 구간)의 특정 시간대/요일의
        과거 누적 데이터를 기반으로 평균 소요시간을 반환합니다.

        Args:
            segment_id: 구간 ID (예: "bus_146_강남역-을지로입구", "subway_2_강남역-을지로입구")
            departure_hour: 출발 시간 (0~23)
            day_of_week: 요일 (0=월요일, 6=일요일)

        Returns:
            {
                "segment_id": str,
                "avg_duration_seconds": int,  # 평균 소요시간 (초)
                "sample_count": int,  # 샘플 개수 (신뢰도 지표)
                "is_reliable": bool,  # 신뢰도 (sample_count >= 100)
                "transport_type": str,  # "BUS" or "SUBWAY"
                "transport_name": str,  # "146번" or "2호선"
                "message": Optional[str]  # 오류 메시지
            }

        Note:
            - sample_count < 100: 데이터 부족, is_reliable=False
            - 신뢰도가 낮으면 Logic 3.1 (지연 감지)에서 FALLBACK_TO_TPEG 처리
        """
        pass

    @abstractmethod
    def query_predicted_duration(
        self,
        segment_id: str,
        current_time: datetime,
        current_congestion: float
    ) -> Dict[str, Any]:
        """
        실시간 예측 소요시간 조회.

        현재 혼잡도, 신호 상태 등을 기반으로 '지금 출발할 경우'의
        예측 소요시간을 계산합니다.

        Args:
            segment_id: 구간 ID
            current_time: 현재 시각
            current_congestion: 혼잡도 (0.0~1.0, 0=한산, 1=만석)

        Returns:
            {
                "segment_id": str,
                "predicted_duration_seconds": int,  # 예측 소요시간 (초)
                "confidence": float,  # 신뢰도 (0.0~1.0)
                "factors": List[str],  # 영향을 미친 요소들
                "message": Optional[str]
            }

        Note:
            - confidence가 낮으면 평균값(query_average_duration) 사용 권장
            - factors: ["높은 혼잡도", "신호 대기", "적설 주의"] 등
        """
        pass


class MockAIPatternService(AIPatternService):
    """
    AI Pattern 모듈의 Mock 구현.

    ai_pattern 모듈이 없어도 path_optimize를 테스트할 수 있습니다.
    실제 ai_pattern 모듈이 완성되면, 이 Mock을 RealAIPatternService로 교체하면 됩니다.
    """

    def __init__(self):
        """Mock 데이터 초기화"""
        self.mock_data = {
            "bus_146_강남역-을지로입구": {
                8: {  # 출근 시간
                    0: {"avg_duration_seconds": 600, "sample_count": 150, "transport_type": "BUS", "transport_name": "146번"},  # 월
                    1: {"avg_duration_seconds": 580, "sample_count": 145, "transport_type": "BUS", "transport_name": "146번"},  # 화
                    4: {"avg_duration_seconds": 650, "sample_count": 120, "transport_type": "BUS", "transport_name": "146번"},  # 금
                }
            },
            "subway_2_강남역-을지로입구": {
                8: {
                    0: {"avg_duration_seconds": 480, "sample_count": 200, "transport_type": "SUBWAY", "transport_name": "2호선"},
                    1: {"avg_duration_seconds": 500, "sample_count": 190, "transport_type": "SUBWAY", "transport_name": "2호선"},
                }
            },
            "subway_9_새로운역-신역": {
                8: {
                    0: {"avg_duration_seconds": None, "sample_count": 5, "transport_type": "SUBWAY", "transport_name": "9호선"},
                }
            }
        }

    def query_average_duration(
        self,
        segment_id: str,
        departure_hour: int,
        day_of_week: int
    ) -> Dict[str, Any]:
        """Mock 구현: 미리 정의된 데이터 반환"""

        # 데이터 조회
        if segment_id in self.mock_data:
            if departure_hour in self.mock_data[segment_id]:
                if day_of_week in self.mock_data[segment_id][departure_hour]:
                    data = self.mock_data[segment_id][departure_hour][day_of_week]
                    is_reliable = data["sample_count"] >= 100 and data["avg_duration_seconds"] is not None

                    return {
                        "segment_id": segment_id,
                        "avg_duration_seconds": data["avg_duration_seconds"],
                        "sample_count": data["sample_count"],
                        "is_reliable": is_reliable,
                        "transport_type": data["transport_type"],
                        "transport_name": data["transport_name"],
                        "message": None if is_reliable else "충분한 통계 데이터가 없습니다"
                    }

        # 데이터 없음
        return {
            "segment_id": segment_id,
            "avg_duration_seconds": None,
            "sample_count": 0,
            "is_reliable": False,
            "transport_type": None,
            "transport_name": None,
            "message": "데이터를 찾을 수 없습니다"
        }

    def query_predicted_duration(
        self,
        segment_id: str,
        current_time: datetime,
        current_congestion: float
    ) -> Dict[str, Any]:
        """Mock 구현: 혼잡도 기반 예측값 계산"""

        # 평균값 조회
        avg_result = self.query_average_duration(
            segment_id=segment_id,
            departure_hour=current_time.hour,
            day_of_week=current_time.weekday()
        )

        if not avg_result["is_reliable"]:
            return {
                "segment_id": segment_id,
                "predicted_duration_seconds": None,
                "confidence": 0.0,
                "factors": ["신뢰도 낮은 통계 데이터"],
                "message": "예측 데이터가 없습니다"
            }

        # 혼잡도에 따라 소요시간 조정 (간단한 공식)
        base_duration = avg_result["avg_duration_seconds"]
        congestion_multiplier = 1.0 + (current_congestion * 0.5)  # 혼잡도 0% → 1배, 100% → 1.5배
        predicted_duration = int(base_duration * congestion_multiplier)

        # 신뢰도: 혼잡도 데이터와 통계 데이터의 조합
        confidence = min(0.95, 0.7 + (avg_result["sample_count"] / 500))

        return {
            "segment_id": segment_id,
            "predicted_duration_seconds": predicted_duration,
            "confidence": confidence,
            "factors": ["혼잡도 기반 예측"],
            "message": None
        }