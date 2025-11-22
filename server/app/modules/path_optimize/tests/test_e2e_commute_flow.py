"""
시나리오 기반 E2E 통합 테스트 (Logic 1.x / 2.x / 3.x)

시나리오.md에 정의된 흐름을 HTTP 레벨에서 검증합니다.

1) 출발 전 – Logic 1.1/1.2 (출근 브리핑)
2) 이동 중 – Logic 2.2 (대안 경로 Gate 1/2/3)
3) 돌발 상황 – Logic 3.1 (지연 감지) + 3.2 (택시 제안)
"""

from datetime import datetime, timedelta
from typing import Dict, Any
import importlib

import pytest
from fastapi.testclient import TestClient

from app.main import app

# 실제 path_optimize_router 모듈 객체 (라우터 인스턴스가 아님!)
path_optimize_router_module = importlib.import_module("app.api.v1.path_optimize_router")


class TestE2ECommuteFlow:
    """시나리오.md 기반 출근/이동/돌발 상황 E2E 플로우 테스트"""

    @pytest.fixture
    def client(self) -> TestClient:
        """FastAPI TestClient"""
        return TestClient(app)

    @pytest.fixture
    def test_user_id(self) -> str:
        """테스트용 사용자 ID"""
        return "test_e2e_commute_flow_user"

    # ======================================================================
    # Task 0. 프론트 계약 스키마 – Logic 2.1 / 2.3
    # ======================================================================

    def test_00_commute_briefing_contract_e2e(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """
        [프론트 계약] Logic 1.1/1.2 출근 브리핑 응답 스키마 검증
        """

        def fake_get_commute_settings(cls, user_id: str) -> Dict[str, Any]:
            return {
                "homeAddress": "서울특별시 강남구 역삼동 123",
                "workAddress": "서울특별시 중구 을지로 456",
                "targetArrivalTime": datetime.now().time(),
                "firstMileDefaultDuration": 5,
                "lastMileDefaultDuration": 7,
            }

        def fake_commute_briefing(
            self,
            commute_settings: Dict[str, Any],
            current_time: datetime,
            routes_data: Dict[str, Any] | None = None,
        ) -> Dict[str, Any]:
            return {
                "data": {
                    "alertType": "GO_NOW",
                    "message": "8:50 도착을 위해, 지금 출발하세요.",
                    "totalDurationMinutes": 42,
                    "recommendedTransport": {
                        "type": "BUS",
                        "name": "123번",
                        "departureInMinutes": 5,
                        "lineNumber": "123",
                        "destination": "강남역",
                    },
                }
            }

        monkeypatch.setattr(
            "app.modules.path_optimize.mock_user_db.MockUserDB.get_commute_settings",
            classmethod(fake_get_commute_settings),
        )
        monkeypatch.setattr(
            "app.modules.path_optimize.service.PathOptimizeService.get_commute_briefing",
            fake_commute_briefing,
        )

        resp = client.get(
            "/api/v1/briefings/commute",
            params={"userId": "frontend_contract_user"},
        )
        assert resp.status_code == 200, resp.text

        data = resp.json()["data"]
        assert data["alertType"] in ["GO_NOW", "LAST_CHANCE", "NO_ACTION"]
        assert isinstance(data["message"], str) and data["message"]
        assert data["totalDurationMinutes"] > 0
        transport = data["recommendedTransport"]
        assert transport["type"] in ["BUS", "SUBWAY", "WALK", "TAXI"]
        assert isinstance(transport["departureInMinutes"], int)

    def test_0_auto_mode_switch_contract_e2e(
        self,
        client: TestClient,
        test_user_id: str,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """
        [프론트 계약] Logic 2.1 자동 모드 전환 응답 스키마 검증
        """

        def fake_auto_mode_switch(self, user_context: Dict[str, Any]) -> Dict[str, Any]:
            return {
                "data": {
                    "action": "AUTO_SWITCH_TO_ETA",
                    "state": "ON_TRIP",
                    "destinationArrivalTime": "08:45:00",
                    "estimatedMinutes": 15,
                    "currentLocation": {
                        "latitude": user_context["currentGPS"]["latitude"],
                        "longitude": user_context["currentGPS"]["longitude"],
                    },
                    "destination": {
                        "address": "서울특별시 중구 을지로 456",
                        "latitude": 37.5662,
                        "longitude": 126.9784,
                    },
                    "message": "탑승 감지! 직장 도착까지 약 15분 남았습니다.",
                }
            }

        monkeypatch.setattr(
            "app.modules.path_optimize.service.PathOptimizeService.get_auto_mode_switch_action",
            fake_auto_mode_switch,
        )
        monkeypatch.setattr(
            "app.modules.path_optimize.mock_user_db.MockUserDB.get_commute_settings",
            classmethod(
                lambda cls, user_id: {
                    "homeAddress": "서울특별시 강남구 역삼동 123",
                    "workAddress": "서울특별시 중구 을지로 456",
                    "targetArrivalTime": datetime.now().time(),
                    "firstMileDefaultDuration": 5,
                    "lastMileDefaultDuration": 7,
                    "homeLatitude": 37.4979,
                    "homeLongitude": 127.0276,
                    "workLatitude": 37.5662,
                    "workLongitude": 126.9784,
                }
            ),
        )

        resp = client.get(
            "/api/v1/context/mode-switch",
            params={
                "userId": test_user_id,
                "currentLatitude": 37.4979,
                "currentLongitude": 127.0276,
                "mode": "COMMUTE",
            },
        )
        assert resp.status_code == 200, resp.text

        data = resp.json()["data"]
        assert data["action"] == "AUTO_SWITCH_TO_ETA"
        assert data["state"] == "ON_TRIP"
        assert data["destinationArrivalTime"] == "08:45:00"
        assert data["estimatedMinutes"] == 15
        assert "message" in data and data["message"]
        assert data["currentLocation"]["latitude"] == 37.4979
        assert data["currentLocation"]["longitude"] == 127.0276
        assert data["destination"]["address"]

    def test_0_seating_optimization_contract_e2e(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """
        [프론트 계약] Logic 2.3 탑승/환승 최적화 응답 스키마 검증
        """

        def fake_seating_optimization(
            self,
            guidance_type: str,
            transfer_station: str | None = None,
            transfer_line: str | None = None,
            exit_location: str | None = None,
            **kwargs,
        ) -> Dict[str, Any]:
            assert guidance_type == "TRANSFER"
            return {
                "data": {
                    "action": "SEATING_OPTIMIZATION",
                    "type": "TRANSFER_GUIDANCE",
                    "optimalCar": "4-2",
                    "message": f"{transfer_station} {transfer_line} 환승을 위해 4-2칸에 대기하세요.",
                    "priority": "HIGH",
                    "availableCars": [
                        {"car": "3-1", "congestion": 25, "seatsAvailable": True}
                    ],
                    "steps": [
                        {
                            "title": f"{transfer_station} 환승",
                            "car": "4-2",
                            "door": "LEFT",
                            "distanceMeters": 30,
                        }
                    ],
                }
            }

        monkeypatch.setattr(
            "app.modules.path_optimize.service.PathOptimizeService.get_seating_optimization",
            fake_seating_optimization,
        )

        resp = client.get(
            "/api/v1/context/seating/optimize",
            params={
                "guidanceType": "TRANSFER",
                "transferStation": "온수",
                "transferLine": "7호선 급행",
                "exitLocation": "FRONT",
            },
        )
        assert resp.status_code == 200, resp.text

        data = resp.json()["data"]
        assert data["action"] == "SEATING_OPTIMIZATION"
        assert data["type"] == "TRANSFER_GUIDANCE"
        assert data["optimalCar"] == "4-2"
        assert data["priority"] == "HIGH"
        assert "steps" in data and data["steps"]
        assert data["availableCars"][0]["congestion"] == 25

    def test_0_alternative_route_contract_retreat_e2e(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """
        [프론트 계약] Logic 2.2 RETREAT 모드 대안 경로 응답 스키마 검증
        """

        def fake_alternative_route(self, **kwargs) -> Dict[str, Any]:
            return {
                "data": {
                    "suggestAlternativeRoute": True,
                    "timeBenefit": 12,
                    "transferTime": 4,
                    "serverRealtimeTransferMinutes": 9,
                    "message": "퇴근길 더 빠른 경로 발견. 환승 4분 여유.",
                    "failedGates": {"gate_1": False, "gate_2": False, "gate_3": False},
                    "reasons": [],
                }
            }

        monkeypatch.setattr(
            "app.modules.path_optimize.service.PathOptimizeService.get_alternative_route_suggestion",
            fake_alternative_route,
        )

        payload = {
            "currentRouteTime": 50,
            "alternativeRouteTime": 38,
            "mode": "RETREAT",
            "currentBusArrivalMinutes": 2,
            "currentBusDurationMinutes": 2,
            "transferBusArrivalMinutes": 9,
            "transferBusCongestion": 50,
            "transferLocation": "신도림",
            "transferLine": "2호선",
        }

        resp = client.post("/api/v1/context/routes/alternative", json=payload)
        assert resp.status_code == 200, resp.text

        data = resp.json()["data"]
        assert data["suggestAlternativeRoute"] is True
        assert data["timeBenefit"] == 12
        assert data["transferTime"] == 4
        assert data["serverRealtimeTransferMinutes"] == 9
        assert "message" in data and data["message"]

    def test_0_delay_detection_contract_e2e(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """
        [프론트 계약] Logic 3.1 지연 감지 응답 스키마 검증 (다구간)
        """

        def fake_delay_detection(
            self,
            segments: list[Dict[str, Any]],
            current_hour: int,
            current_day_of_week: int,
            statistical_data_map: Dict[str, Dict[str, Any]] | None = None,
            real_time_data_map: Dict[str, Dict[str, Any]] | None = None,
        ) -> Dict[str, Any]:
            return {
                "data": {
                    "action": "EXCEPTION_DETECTED",
                    "totalSegments": 2,
                    "delayedCount": 1,
                    "delayedSegments": [
                        {
                            "segmentId": "subway_7_남구로-온수",
                            "segmentName": "남구로 → 온수",
                            "isDelayed": True,
                            "delayMinutes": 8,
                            "type": "DELAY_WARNING",
                            "message": "평소보다 8분 지연",
                        }
                    ],
                    "mostSevere": {
                        "segmentId": "subway_7_남구로-온수",
                        "delayMinutes": 8,
                        "reason": "실시간 ETA 지연",
                    },
                }
            }

        # 통계/실시간 조회를 우회
        monkeypatch.setattr(
            path_optimize_router_module,
            "get_average_duration_map_for_segments",
            lambda *args, **kwargs: {},
        )
        monkeypatch.setattr(
            "app.modules.path_optimize.service.PathOptimizeService.get_exception_alert",
            fake_delay_detection,
        )

        payload = {
            "segments": [
                {
                    "segmentId": "subway_7_남구로-온수",
                    "segmentName": "남구로 → 온수",
                    "fromStation": "남구로",
                    "toStation": "온수",
                },
                {
                    "segmentId": "subway_1_온수-구일",
                    "segmentName": "온수 → 구일",
                    "fromStation": "온수",
                    "toStation": "구일",
                },
            ],
            "currentHour": 8,
            "currentDayOfWeek": 2,
        }

        resp = client.post("/api/v1/context/exceptions/delays", json=payload)
        assert resp.status_code == 200, resp.text

        data = resp.json()["data"]
        assert data["action"] == "EXCEPTION_DETECTED"
        assert data["totalSegments"] == 2
        assert data["delayedCount"] == 1
        assert data["delayedSegments"][0]["isDelayed"] is True
        assert data["delayedSegments"][0]["delayMinutes"] >= 0
        assert data["mostSevere"]["segmentId"] == "subway_7_남구로-온수"

    def test_0_taxi_contract_commute_and_retreat_e2e(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """
        [프론트 계약] Logic 3.2 택시 제안 - 출근 제안 / 퇴근 거부 스키마 검증
        """

        def fake_taxi_suggestion(
            self,
            mode,
            current_time,
            target_arrival_time,
            transit_arrival_time,
            taxi_arrival_time: datetime | None = None,
            fare_estimate: float | None = None,
            **kwargs,
        ) -> Dict[str, Any]:
            if str(mode) == "SystemMode.RETREAT":
                return {
                    "data": {
                        "action": "NO_ACTION",
                        "type": "TAXI_NOT_ALLOWED_RETREAT",
                        "message": "퇴근 모드에서는 택시 제안이 제공되지 않습니다.",
                    }
                }
            return {
                "data": {
                    "action": "TAXI_SUGGESTED",
                    "type": "TAXI_COMMUTE_LATENESS_CONFIRMED",
                    "message": "지각 확정, 택시 호출 권장",
                    "priority": "CRITICAL",
                    "estimatedFare": fare_estimate or 18000,
                    "ctaButton": {"action": "CALL_TAXI", "label": "택시 호출"},
                }
            }

        monkeypatch.setattr(
            "app.modules.path_optimize.service.PathOptimizeService.get_taxi_suggestion",
            fake_taxi_suggestion,
        )

        # COMMUTE 택시 제안
        commute_payload = {
            "mode": "COMMUTE",
            "currentTime": datetime(2025, 11, 12, 8, 20, 0).isoformat(),
            "targetArrivalTime": datetime(2025, 11, 12, 9, 0, 0).isoformat(),
            "transitArrivalTime": datetime(2025, 11, 12, 9, 5, 0).isoformat(),
            "taxiArrivalTime": datetime(2025, 11, 12, 8, 40, 0).isoformat(),
        }
        resp = client.post("/api/v1/context/taxi/suggest", json=commute_payload)
        assert resp.status_code == 200, resp.text
        commute_data = resp.json()["data"]
        assert commute_data["action"] == "TAXI_SUGGESTED"
        assert commute_data["priority"] == "CRITICAL"
        assert "ctaButton" in commute_data

        # RETREAT 모드 거부
        retreat_payload = {
            **commute_payload,
            "mode": "RETREAT",
        }
        resp_retreat = client.post("/api/v1/context/taxi/suggest", json=retreat_payload)
        assert resp_retreat.status_code == 200, resp_retreat.text
        retreat_data = resp_retreat.json()["data"]
        assert retreat_data["action"] == "NO_ACTION"
        assert retreat_data["type"] == "TAXI_NOT_ALLOWED_RETREAT"

    # ======================================================================
    # Task 1. 출발 전 – Logic 1.1/1.2 + 혼잡도 (C-1)
    # ======================================================================

    def test_1_pre_departure_briefing_e2e(self, client: TestClient, test_user_id: str):
        """
        [시나리오 1] 출발 전 출근 브리핑 E2E

        /briefings/commute-settings 에 출퇴근 설정을 저장한 뒤,
        /briefings/commute 를 호출해 다음을 검증합니다.
        - Envelope 패턴 {\"data\": {...}}
        - alertType (GO_NOW / LAST_CHANCE / NO_ACTION)
        - totalDurationMinutes > 0 (Door-to-Door 예상 소요시간)
        - recommendedTransport.departureInMinutes 가 0 이상
        """
        # 1) 출퇴근 설정 저장
        settings_params = {
            "userId": test_user_id,
            "homeAddress": "서울특별시 강남구 역삼동 123",
            "workAddress": "서울특별시 중구 을지로 456",
            "targetArrivalHour": 9,
            "targetArrivalMinute": 0,
            "firstMileDuration": 5,
            "lastMileDuration": 7,
        }

        save_resp = client.post(
            "/api/v1/briefings/commute-settings",
            params=settings_params,
        )
        assert save_resp.status_code == 200, save_resp.text

        # 2) 출근 브리핑 조회
        resp = client.get(
            "/api/v1/briefings/commute",
            params={"userId": test_user_id},
        )
        assert resp.status_code == 200, resp.text

        body = resp.json()
        assert "data" in body
        briefing = body["data"]

        # alertType / 기본 필드 검증
        assert briefing["alertType"] in ["GO_NOW", "LAST_CHANCE", "NO_ACTION"]
        assert isinstance(briefing["message"], str)
        assert briefing["message"]

        total_minutes = briefing.get("totalDurationMinutes")
        if total_minutes is not None:
            assert isinstance(total_minutes, int)
            assert total_minutes > 0
            # Door-to-Door 기준으로 4시간 이내면 "합리적인 값"으로 간주
            assert total_minutes < 4 * 60

        transport = briefing.get("recommendedTransport")
        if transport is not None:
            assert "type" in transport
            assert "name" in transport
            assert "departureInMinutes" in transport
            assert isinstance(transport["departureInMinutes"], int)
            assert transport["departureInMinutes"] >= 0

    # ======================================================================
    # Task 2. 이동 중 – Logic 2.2 (대안 경로 Gate 1/2/3)
    # ======================================================================

    def test_2_alternative_route_not_suggested_when_gates_fail(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """
        [시나리오 2-1] 대안 경로 불필요 케이스 (Gate 1/2/3 모두 실패)

        /context/routes/alternative 를 호출했을 때:
        - 시간 이득이 작고 (Gate 1 FAIL)
        - 환승 여유가 부족하며 (Gate 2 FAIL)
        - 혼잡도도 높을 때 (Gate 3 FAIL)
        → suggestAlternativeRoute == False 이고, 실패 이유에 Gate 1/2/3 텍스트가 포함되는지 검증
        """

        def dummy_get_transfer_vehicle_realtime_info(
            self,
            routes_data: Dict[str, Any],
            current_time: datetime,
            station_name: str,
            subway_line: str,
            direction: str | None = None,
        ) -> None:
            # 실시간 환승 ETA 조회 실패를 시뮬레이션 (payload 값만 사용)
            return None

        monkeypatch.setattr(
            "app.modules.path_optimize.service.PathOptimizeService.get_transfer_vehicle_realtime_info",
            dummy_get_transfer_vehicle_realtime_info,
        )

        payload = {
            # Gate 1: 시간 이득 3분 (20 → 17) → FAIL
            "currentRouteTime": 20,
            "alternativeRouteTime": 17,
            "mode": "COMMUTE",
            # Gate 2: 환승 여유 0분 (5 + 2 → 7) → FAIL
            "currentBusArrivalMinutes": 5,
            "currentBusDurationMinutes": 2,
            "transferBusArrivalMinutes": 7,
            # Gate 3: 혼잡도 90% → FAIL
            "transferBusCongestion": 90,
            "transferLocation": "가산디지털단지",
            "transferLine": "7호선 급행",
        }

        resp = client.post(
            "/api/v1/context/routes/alternative",
            json=payload,
        )
        assert resp.status_code == 200, resp.text

        body = resp.json()
        assert "data" in body
        data = body["data"]

        assert data["suggestAlternativeRoute"] is False
        assert "reasons" in data
        reasons = " ".join(data["reasons"])
        # Gate 1/2/3 실패 이유가 모두 포함되는지 확인
        assert "Gate 1" in reasons
        assert "Gate 2" in reasons
        assert "Gate 3" in reasons

        failed = data.get("failedGates", {})
        assert failed.get("gate_1") is True
        assert failed.get("gate_2") is True
        assert failed.get("gate_3") is True

    def test_3_alternative_route_suggested_when_all_gates_pass(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """
        [시나리오 2-2] 대안 경로 추천 케이스 (Gate 1/2/3 모두 PASS)

        /context/routes/alternative 를 호출했을 때:
        - 시간 이득이 충분하고 (10분 단축)
        - 환승 여유가 3분 이상이며
        - 혼잡도가 80% 미만일 때
        → suggestAlternativeRoute == True 이고, timeBenefit/transferTime/메시지가 올바른지 검증
        """

        def dummy_get_transfer_vehicle_realtime_info(
            self,
            routes_data: Dict[str, Any],
            current_time: datetime,
            station_name: str,
            subway_line: str,
            direction: str | None = None,
        ) -> Dict[str, Any]:
            # 서버 기준 환승 ETA: 7분 후 도착
            return {
                "stationName": station_name,
                "subwayLine": subway_line,
                "direction": direction or "상행",
                "arrivalMinutes": 7,
                "arrivalSeconds": 7 * 60,
                "message": "7분 후",
                "trainStatus": "IN_OPERATION",
            }

        monkeypatch.setattr(
            "app.modules.path_optimize.service.PathOptimizeService.get_transfer_vehicle_realtime_info",
            dummy_get_transfer_vehicle_realtime_info,
        )

        payload = {
            # Gate 1: 시간 이득 10분 (40 → 30) → PASS
            "currentRouteTime": 40,
            "alternativeRouteTime": 30,
            "mode": "COMMUTE",
            # Gate 2: 환승 여유 3분 (2 + 2 → 7) → PASS
            "currentBusArrivalMinutes": 2,
            "currentBusDurationMinutes": 2,
            "transferBusArrivalMinutes": 5,  # payload 값은 5지만, 서버는 7분(실시간) 사용
            # Gate 3: 혼잡도 40% → PASS
            "transferBusCongestion": 40,
            "transferLocation": "온수",
            "transferLine": "1호선 급행",
        }

        resp = client.post(
            "/api/v1/context/routes/alternative",
            json=payload,
        )
        assert resp.status_code == 200, resp.text

        body = resp.json()
        assert "data" in body
        data = body["data"]

        assert data["suggestAlternativeRoute"] is True
        # 시간 이득 및 환승 여유 검증
        assert data["timeBenefit"] == 10
        assert data["transferTime"] == 3  # 7 - (2 + 2)
        assert data["serverRealtimeTransferMinutes"] == 7
        # 메시지에 핵심 키워드 포함
        assert "더 빠른 경로 발견" in data["message"]
        assert "환승" in data["message"]

    # ======================================================================
    # Task 3. 돌발 상황 – Logic 3.1 (지연 감지) + 3.2 (택시 제안)
    # ======================================================================

    def test_4_delay_detection_with_average_and_realtime_e2e(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """
        [시나리오 3-1] 지연 감지 케이스 (AverageDuration vs 실시간 ETA)

        - 평균 소요시간: 4분 (240초)
        - 실시간 예상: 12분 (720초)
        - 지연차: 8분 → EXCEPTION_DETECTED

        /context/exceptions/delays 엔드포인트를 통해
        DelayDetector + AverageDurationDB + 실시간 ETA 통합 결과를 검증합니다.
        """

        def fake_get_average_duration_map_for_segments(
            segments: list[Dict[str, Any]],
            current_hour: int,
            current_day_of_week: int,
        ) -> Dict[str, Dict[str, Any]]:
            return {
                "subway_7_남구로-온수": {
                    "avg_duration_seconds": 240,  # 4분
                    "sample_count": 200,
                    "transport_type": "SUBWAY",
                    "transport_name": "7호선",
                    "data_quality": "HIGH",
                }
            }

        def fake_build_realtime_data_map(
            self,
            segments: list[Dict[str, Any]],
        ) -> Dict[str, Dict[str, Any]]:
            return {
                "subway_7_남구로-온수": {
                    "segment_id": "subway_7_남구로-온수",
                    "predicted_duration_seconds": 720,  # 12분
                    "data_source": "REALTIME",
                    "last_updated": datetime.utcnow().isoformat(),
                    "confidence": 0.9,
                }
            }

        # 라우터 모듈 내에서 import된 심볼을 직접 패치
        monkeypatch.setattr(
            path_optimize_router_module,
            "get_average_duration_map_for_segments",
            fake_get_average_duration_map_for_segments,
        )
        monkeypatch.setattr(
            "app.modules.path_optimize.service.PathOptimizeService.build_realtime_data_map",
            fake_build_realtime_data_map,
        )

        payload = {
            "segments": [
                {
                    "segmentId": "subway_7_남구로-온수",
                    "segmentName": "남구로 → 온수",
                    "fromStation": "남구로",
                    "toStation": "온수",
                }
            ],
            "currentHour": 8,
            "currentDayOfWeek": 2,
        }

        resp = client.post(
            "/api/v1/context/exceptions/delays",
            json=payload,
        )
        assert resp.status_code == 200, resp.text

        body = resp.json()
        assert "data" in body
        data = body["data"]

        assert data["action"] == "EXCEPTION_DETECTED"
        assert data["totalSegments"] == 1
        assert data["delayedCount"] == 1

        delayed = data["delayedSegments"][0]
        assert delayed["segmentId"] == "subway_7_남구로-온수"
        assert delayed["segmentName"] == "남구로 → 온수"
        assert delayed["isDelayed"] is True
        # 평균 4분 vs 실시간 12분 → 최소 8분 지연
        assert delayed["delayMinutes"] >= 8
        assert delayed["type"] == "DELAY_WARNING"
        assert "지연" in delayed["message"]
        assert "평소보다" in delayed["message"]

    def test_5_no_delay_when_eta_near_average_e2e(
        self,
        client: TestClient,
        monkeypatch: pytest.MonkeyPatch,
    ):
        """
        [시나리오 3-2] 지연 없음 케이스

        - 평균 소요시간: 4분 (240초)
        - 실시간 예상: 4분 (240초)
        → delayMinutes == 0, action == NO_ACTION
        """

        def fake_get_average_duration_map_for_segments(
            segments: list[Dict[str, Any]],
            current_hour: int,
            current_day_of_week: int,
        ) -> Dict[str, Dict[str, Any]]:
            return {
                "subway_7_남구로-온수": {
                    "avg_duration_seconds": 240,
                    "sample_count": 200,
                    "transport_type": "SUBWAY",
                    "transport_name": "7호선",
                    "data_quality": "HIGH",
                }
            }

        def fake_build_realtime_data_map(
            self,
            segments: list[Dict[str, Any]],
        ) -> Dict[str, Dict[str, Any]]:
            return {
                "subway_7_남구로-온수": {
                    "segment_id": "subway_7_남구로-온수",
                    "predicted_duration_seconds": 240,
                    "data_source": "REALTIME",
                    "last_updated": datetime.utcnow().isoformat(),
                    "confidence": 0.9,
                }
            }

        # 라우터 모듈 내에서 import된 심볼을 직접 패치
        monkeypatch.setattr(
            path_optimize_router_module,
            "get_average_duration_map_for_segments",
            fake_get_average_duration_map_for_segments,
        )
        monkeypatch.setattr(
            "app.modules.path_optimize.service.PathOptimizeService.build_realtime_data_map",
            fake_build_realtime_data_map,
        )

        payload = {
            "segments": [
                {
                    "segmentId": "subway_7_남구로-온수",
                    "segmentName": "남구로 → 온수",
                    "fromStation": "남구로",
                    "toStation": "온수",
                }
            ],
            "currentHour": 8,
            "currentDayOfWeek": 2,
        }

        resp = client.post(
            "/api/v1/context/exceptions/delays",
            json=payload,
        )
        assert resp.status_code == 200, resp.text

        body = resp.json()
        assert "data" in body
        data = body["data"]

        assert data["action"] == "NO_ACTION"
        assert data["delayedCount"] == 0
        assert data["delayedSegments"] == []

    def test_6_taxi_suggestion_commute_mode_e2e(self, client: TestClient):
        """
        [시나리오 3-3] 택시 제안 케이스 (Logic 3.2, 출근 모드)

        - 목표 도착: 09:00
        - 대중교통 ETA: 09:05 (지각 확정)
        - 택시 ETA: 08:40 (정상 도착 가능)
        → /context/taxi/suggest 호출 시 action == TAXI_SUGGESTED 인지 검증
        """
        current_time = datetime(2025, 11, 12, 8, 20, 0)
        target_arrival = datetime(2025, 11, 12, 9, 0, 0)
        transit_arrival = datetime(2025, 11, 12, 9, 5, 0)
        taxi_arrival = datetime(2025, 11, 12, 8, 40, 0)

        payload = {
            "mode": "COMMUTE",
            "currentTime": current_time.isoformat(),
            "targetArrivalTime": target_arrival.isoformat(),
            "transitArrivalTime": transit_arrival.isoformat(),
            "taxiArrivalTime": taxi_arrival.isoformat(),
        }

        resp = client.post(
            "/api/v1/context/taxi/suggest",
            json=payload,
        )
        assert resp.status_code == 200, resp.text

        body = resp.json()
        assert "data" in body
        data = body["data"]

        assert data["action"] == "TAXI_SUGGESTED"
        assert data["type"] == "TAXI_COMMUTE_LATENESS_CONFIRMED"
        assert "지각 확정" in data["message"]
        assert "택시" in data["message"]
        assert data["priority"] == "CRITICAL"
        assert "ctaButton" in data
        assert data["ctaButton"]["action"] == "CALL_TAXI"
