"""
Phase 6: Logic 2.4 - 환승 리마인더 & 실시간 환승 열차 안내 테스트

목표:
- 사용자가 기본 경로를 따라 이동 중일 때,
  다가오는 환승역 반경(예: 300~500m) 이내에 진입하면
  환승 알림과 함께 실시간 도착 정보를 제공하는지 검증.
"""

from datetime import datetime
from typing import Dict, Any

import pytest

from app.modules.path_optimize.service import PathOptimizeService


class TestLogic2_4TransferReminder:
    """Logic 2.4 - 환승 리마인더 테스트"""

    def setup_method(self):
        """각 테스트 메서드 실행 전 서비스 초기화"""
        self.service = PathOptimizeService()

    def _build_transfer_point(self, overrides: Dict[str, Any] | None = None) -> Dict[str, Any]:
        """테스트용 환승 지점 데이터 생성"""
        base = {
            "stationName": "온수",
            "latitude": 37.4923,
            "longitude": 126.8234,
            "transportType": "SUBWAY",
            "subwayLine": "7호선",
            "direction": "상행",
        }
        if overrides:
            base.update(overrides)
        return base

    def test_transfer_reminder_triggers_within_radius(self, monkeypatch: pytest.MonkeyPatch):
        """
        [Logic 2.4 - 시나리오 1] 환승역 반경 내 진입 시 리마인더 발동

        상황:
        - 사용자가 온수역 근처(약 100m 이내)에 위치
        - 환승 지점: 온수역, 7호선
        - 실시간 API: 3분 후 도착 응답

        예상 결과:
        - action: "TRANSFER_REMINDER"
        - stationName: "온수"
        - arrivalMinutes: 3
        - 메시지에 역 이름과 남은 시간 포함
        """
        # Given
        current_latitude = 37.4928
        current_longitude = 126.8239
        transfer_points = [self._build_transfer_point()]
        current_time = datetime(2025, 1, 15, 8, 40, 0)

        # 실시간 지하철 API Mock
        def mock_get_arrival_info(station_name: str, subway_line: str, direction: str = "상행"):
            assert station_name == "온수"
            assert subway_line == "7호선"
            return {
                "arrivalMinutes": 3,
                "arrivalSeconds": 180,
                "trainDirection": "부천 방면",
                "message": "3분 후 (부천 방면)",
            }

        monkeypatch.setattr(
            self.service.subway_client,
            "get_arrival_info",
            mock_get_arrival_info,
        )

        # When
        result = self.service.get_transfer_reminder(
            current_latitude=current_latitude,
            current_longitude=current_longitude,
            transfer_points=transfer_points,
            current_time=current_time,
            radius_meters=500.0,
        )

        # Then
        assert "data" in result
        data = result["data"]

        assert data["action"] == "TRANSFER_REMINDER"
        assert data["stationName"] == "온수"
        assert data["line"] == "7호선"
        assert data["arrivalMinutes"] == 3
        assert data["isRealtime"] is True
        assert isinstance(data["message"], str)
        assert "온수" in data["message"]
        assert "3분" in data["message"] or "3 분" in data["message"]

    def test_transfer_reminder_no_station_outside_radius(self):
        """
        [Logic 2.4 - 시나리오 2] 환승역 반경 밖에서는 리마인더 미발동

        상황:
        - 사용자가 환승역에서 2km 이상 떨어져 있음

        예상 결과:
        - action: "NO_ACTION"
        """
        # Given
        current_latitude = 37.50
        current_longitude = 126.90
        transfer_points = [self._build_transfer_point()]
        current_time = datetime(2025, 1, 15, 8, 40, 0)

        # When
        result = self.service.get_transfer_reminder(
            current_latitude=current_latitude,
            current_longitude=current_longitude,
            transfer_points=transfer_points,
            current_time=current_time,
            radius_meters=300.0,
        )

        # Then
        assert "data" in result
        data = result["data"]

        assert data["action"] == "NO_ACTION"
        assert data.get("stationName") is None
        assert data.get("arrivalMinutes") is None

    def test_transfer_reminder_handles_missing_realtime(self, monkeypatch: pytest.MonkeyPatch):
        """
        [Logic 2.4 - 시나리오 3] 실시간 API 실패 시에도 리마인더는 발동하되 isRealtime=False

        상황:
        - 사용자가 환승역 반경 내에 진입
        - 실시간 지하철 API가 None을 반환

        예상 결과:
        - action: "TRANSFER_REMINDER"
        - arrivalMinutes: None
        - isRealtime: False
        """
        # Given
        current_latitude = 37.4928
        current_longitude = 126.8239
        transfer_points = [self._build_transfer_point()]
        current_time = datetime(2025, 1, 15, 8, 40, 0)

        # 실시간 API 실패 Mock
        def mock_get_arrival_info(*args, **kwargs):
            return None

        monkeypatch.setattr(
            self.service.subway_client,
            "get_arrival_info",
            mock_get_arrival_info,
        )

        # When
        result = self.service.get_transfer_reminder(
            current_latitude=current_latitude,
            current_longitude=current_longitude,
            transfer_points=transfer_points,
            current_time=current_time,
            radius_meters=500.0,
        )

        # Then
        assert "data" in result
        data = result["data"]

        assert data["action"] == "TRANSFER_REMINDER"
        assert data["stationName"] == "온수"
        assert data["arrivalMinutes"] is None
        assert data["isRealtime"] is False
        assert "온수" in data["message"]

