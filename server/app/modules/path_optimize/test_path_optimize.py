"""
경로 최적화 서비스 테스트
TDD 원칙에 따라 작성된 테스트입니다.

헌법 준수:
- AGENTS.md 백엔드 헌법 [제5장] 개발 방법론 (TDD/Pytest)
- v3.0 명세서 [Logic 1.1] 출발 알림 검증
- OpenAPI 스펙 GET /v1/briefings/commute 응답 구조 준수
"""
import pytest
from datetime import datetime, time
from app.modules.path_optimize.service import PathOptimizeService


class TestPathOptimizeService:
    """경로 최적화 서비스 테스트 클래스"""
    
    def setup_method(self):
        """각 테스트 메서드 실행 전 초기화"""
        self.service = PathOptimizeService()
    
    def test_get_commute_briefing_logic_1_1_go_now(self):
        """
        [Logic 1.1] 출발 알림 테스트
        
        시나리오:
        - 목표 도착 시간: 08:50:00
        - 현재 시간: 08:30:00
        - First Mile 도보 시간: 5분
        - 예상 결과: alertType이 "GO_NOW"이고, 적절한 메시지와 추천 교통수단이 포함되어야 함
        
        OpenAPI 스펙 준수:
        - 응답 구조: { "data": { "alertType": "GO_NOW", "message": "...", "recommendedTransport": {...} } }
        """
        # Given: 사용자 설정
        commute_settings = {
            "homeAddress": "서울 강남구 역삼동 123-45",
            "workAddress": "서울 중구 을지로 678-90",
            "targetArrivalTime": time(8, 50, 0),  # 08:50:00
            "firstMileDefaultDuration": 5,  # 5분
            "lastMileDefaultDuration": 7  # 7분
        }
        
        # 현재 시간: 08:30:00 (목표 도착 시간보다 20분 전)
        current_time = datetime(2025, 1, 15, 8, 30, 0)
        
        # When: 출근 브리핑 조회
        result = self.service.get_commute_briefing(
            commute_settings=commute_settings,
            current_time=current_time
        )
        
        # Then: Logic 1.1 출발 알림이 반환되어야 함
        assert result is not None
        assert "data" in result
        
        data = result["data"]
        
        # OpenAPI 스펙 준수: alertType이 "GO_NOW"여야 함
        assert data["alertType"] == "GO_NOW"
        
        # 메시지가 포함되어야 함
        assert "message" in data
        assert isinstance(data["message"], str)
        assert len(data["message"]) > 0
        
        # 추천 교통수단 정보가 포함되어야 함
        assert "recommendedTransport" in data
        transport = data["recommendedTransport"]
        assert "type" in transport
        assert "name" in transport
        assert "departureInMinutes" in transport
        assert isinstance(transport["departureInMinutes"], int)
        assert transport["departureInMinutes"] > 0

