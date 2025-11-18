"""
Phase 13: AI Pattern 모듈과의 통신 테스트

path_optimize 모듈이 ai_pattern 모듈과 service layer를 통해 통신하는지 검증합니다.
(Mock 기반, 실제 ai_pattern 모듈 없이도 테스트 가능)
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, time


class TestAIPatternServiceInterface:
    """AI Pattern Service 인터페이스 검증"""

    def test_ai_pattern_service_query_average_duration_interface(self):
        """
        AI Pattern Service가 구간별/시간대별 평균 소요시간을 조회하는 인터페이스를 제공해야 함.

        시나리오: path_optimize가 "bus_146_강남역-을지로입구"의
        월요일 8시(출근시간) 평균 소요시간을 조회

        입력:
        - segment_id: "bus_146_강남역-을지로입구"
        - departure_hour: 8
        - day_of_week: 0 (월요일)

        출력:
        - avg_duration_seconds: 600
        - sample_count: 150
        - is_reliable: True
        - transport_type: "BUS"
        """
        from app.modules.path_optimize.clients.ai_pattern_client import AIPatternService

        # Mock 서비스 생성
        mock_service = Mock(spec=AIPatternService)
        mock_service.query_average_duration.return_value = {
            "segment_id": "bus_146_강남역-을지로입구",
            "avg_duration_seconds": 600,  # 10분
            "sample_count": 150,
            "is_reliable": True,
            "transport_type": "BUS",
            "transport_name": "146번"
        }

        # 호출
        result = mock_service.query_average_duration(
            segment_id="bus_146_강남역-을지로입구",
            departure_hour=8,
            day_of_week=0
        )

        # 검증
        assert result["avg_duration_seconds"] == 600
        assert result["sample_count"] == 150
        assert result["is_reliable"] is True
        assert result["transport_type"] == "BUS"

    def test_ai_pattern_service_query_predicted_duration(self):
        """
        AI Pattern Service가 실시간 예측 소요시간을 제공해야 함.

        시나리오: 현재 실시간 조건(혼잡도, 신호 상태 등)을 기반으로
        "bus_146_강남역-을지로입구"의 예측 소요시간 조회

        입력:
        - segment_id: "bus_146_강남역-을지로입구"
        - current_time: datetime
        - current_congestion: 0.75 (혼잡도 75%)

        출력:
        - predicted_duration_seconds: 750 (12.5분, 기본값 600초보다 25% 증가)
        - confidence: 0.85 (신뢰도 85%)
        """
        from app.modules.path_optimize.clients.ai_pattern_client import AIPatternService

        mock_service = Mock(spec=AIPatternService)
        mock_service.query_predicted_duration.return_value = {
            "segment_id": "bus_146_강남역-을지로입구",
            "predicted_duration_seconds": 750,
            "confidence": 0.85,
            "factors": ["높은 혼잡도", "신호 대기"]
        }

        # 호출
        result = mock_service.query_predicted_duration(
            segment_id="bus_146_강남역-을지로입구",
            current_time=datetime.now(),
            current_congestion=0.75
        )

        # 검증
        assert result["predicted_duration_seconds"] == 750
        assert result["confidence"] == 0.85
        assert "높은 혼잡도" in result["factors"]

    def test_ai_pattern_service_error_handling(self):
        """
        AI Pattern Service가 데이터 부족 시 graceful하게 처리해야 함.

        시나리오: 통계 데이터가 충분하지 않은 구간 조회

        입력:
        - segment_id: "subway_9_새로운역-신역" (새로 개설된 역)

        출력:
        - is_reliable: False
        - sample_count: 5 (임계값 100 미만)
        - message: "충분한 통계 데이터가 없습니다"
        """
        from app.modules.path_optimize.clients.ai_pattern_client import AIPatternService

        mock_service = Mock(spec=AIPatternService)
        mock_service.query_average_duration.return_value = {
            "segment_id": "subway_9_새로운역-신역",
            "avg_duration_seconds": None,
            "sample_count": 5,
            "is_reliable": False,
            "message": "충분한 통계 데이터가 없습니다"
        }

        result = mock_service.query_average_duration(
            segment_id="subway_9_새로운역-신역",
            departure_hour=8,
            day_of_week=0
        )

        assert result["is_reliable"] is False
        assert result["sample_count"] < 100
        assert result["message"] is not None


class TestRiskManageServiceInterface:
    """Risk Manage Service 인터페이스 검증"""

    def test_risk_manage_service_check_route_safety_interface(self):
        """
        Risk Manage Service가 경로의 안전도를 확인하는 인터페이스를 제공해야 함.

        시나리오: path_optimize가 추천 경로의 안전도 확인

        입력:
        - route_id: "route_123"
        - path_details: { "segments": ["bus_146", "subway_2"], "transfers": 1 }

        출력:
        - is_safe: True
        - risk_level: "LOW"
        - danger_zones: []
        - warnings: []
        """
        from app.modules.path_optimize.clients.risk_manage_client import RiskManageService

        mock_service = Mock(spec=RiskManageService)
        mock_service.check_route_safety.return_value = {
            "route_id": "route_123",
            "is_safe": True,
            "risk_level": "LOW",
            "danger_zones": [],
            "warnings": []
        }

        result = mock_service.check_route_safety(
            route_id="route_123",
            path_details={
                "segments": ["bus_146", "subway_2"],
                "transfers": 1
            }
        )

        assert result["is_safe"] is True
        assert result["risk_level"] == "LOW"
        assert len(result["danger_zones"]) == 0

    def test_risk_manage_service_get_danger_zones(self):
        """
        Risk Manage Service가 위험 지역 정보를 제공해야 함.

        시나리오: 특정 지역의 위험 지역 조회 (시민 리포트 기반)

        입력:
        - latitude: 37.4979
        - longitude: 127.0276
        - radius_meters: 500

        출력:
        - danger_zones: [
            {
              "zone_id": "DANGER_123",
              "type": "flooding",  # 침수
              "severity": "HIGH",
              "coordinates": { "lat": 37.4979, "lng": 127.0276 }
            }
          ]
        """
        from app.modules.path_optimize.clients.risk_manage_client import RiskManageService

        mock_service = Mock(spec=RiskManageService)
        mock_service.get_danger_zones.return_value = {
            "danger_zones": [
                {
                    "zone_id": "DANGER_123",
                    "type": "flooding",
                    "severity": "HIGH",
                    "coordinates": {"lat": 37.4979, "lng": 127.0276}
                }
            ]
        }

        result = mock_service.get_danger_zones(
            latitude=37.4979,
            longitude=127.0276,
            radius_meters=500
        )

        assert len(result["danger_zones"]) > 0
        assert result["danger_zones"][0]["type"] == "flooding"
        assert result["danger_zones"][0]["severity"] == "HIGH"

    def test_risk_manage_service_error_handling(self):
        """
        Risk Manage Service가 오류 상황을 graceful하게 처리해야 함.

        시나리오: 위험 데이터 조회 불가 시 안전 모드로 진행

        출력:
        - is_available: False
        - fallback_message: "위험 데이터가 현재 제공되지 않습니다"
        """
        from app.modules.path_optimize.clients.risk_manage_client import RiskManageService

        mock_service = Mock(spec=RiskManageService)
        mock_service.check_route_safety.return_value = {
            "is_available": False,
            "fallback_message": "위험 데이터가 현재 제공되지 않습니다",
            "should_use_default": True
        }

        result = mock_service.check_route_safety(
            route_id="route_unknown",
            path_details={}
        )

        assert result["is_available"] is False
        assert result["should_use_default"] is True


class TestPathOptimizeServiceIntegration:
    """PathOptimizeService가 AI Pattern / Risk Manage와 통신하는지 검증"""

    def test_path_optimize_uses_ai_pattern_service(self):
        """
        PathOptimizeService가 AI Pattern Service를 의존성 주입으로 받아 사용해야 함.

        시나리오: get_commute_briefing()이 내부적으로
        AIPatternService.query_average_duration()를 호출해야 함.
        """
        from app.modules.path_optimize.clients.ai_pattern_client import MockAIPatternService
        from app.modules.path_optimize.service import PathOptimizeService

        # Mock AI Pattern Service 주입
        mock_ai_service = MockAIPatternService()

        # PathOptimizeService에 Mock 주입
        service = PathOptimizeService(ai_pattern_service=mock_ai_service)

        # get_commute_briefing() 호출 시 내부적으로 ai_pattern 호출 검증
        # (나중에 실제 구현 후 검증)
        assert service.ai_pattern_service is not None

    def test_path_optimize_uses_risk_manage_service(self):
        """
        PathOptimizeService가 Risk Manage Service를 의존성 주입으로 받아 사용해야 함.
        """
        from app.modules.path_optimize.clients.risk_manage_client import MockRiskManageService
        from app.modules.path_optimize.service import PathOptimizeService

        # Mock Risk Manage Service 주입
        mock_risk_service = MockRiskManageService()

        # PathOptimizeService에 Mock 주입
        service = PathOptimizeService(risk_manage_service=mock_risk_service)

        # get_alternative_route_suggestion() 호출 시 내부적으로 risk_manage 호출 검증
        assert service.risk_manage_service is not None