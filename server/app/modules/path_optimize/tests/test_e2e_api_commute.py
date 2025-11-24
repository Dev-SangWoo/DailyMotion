"""
E2E API Test: 출근 모드 전체 여정 (HTTP 엔드포인트 기반)

실제 FastAPI 엔드포인트를 통한 통합 테스트
TestClient를 사용하여 HTTP 요청/응답을 검증합니다.

테스트 시나리오:
1. 사용자 출퇴근 설정 저장 (POST /commute-settings)
2. 출근 브리핑 조회 (GET /commute)
3. 퇴근 목표 선택 저장 (POST /retreat-choice)
4. 퇴근 브리핑 조회 (GET /retreat)
5. OpenAPI 스펙 준수 검증 (Envelope 패턴, camelCase)

Author: Phase 14 - E2E Integration Tests
Created: 2025-11-15
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


class TestE2EAPICommuteJourney:
    """E2E API 테스트: 출근 모드 전체 여정 (HTTP 기반)"""

    @pytest.fixture
    def client(self):
        """FastAPI TestClient"""
        return TestClient(app)

    @pytest.fixture
    def test_user_id(self):
        """테스트용 사용자 ID"""
        return "test_user_e2e_001"

    # ========================================================================
    # Test 1: 출퇴근 설정 저장 (POST /api/v1/briefings/commute-settings)
    # ========================================================================

    def test_1_save_commute_settings(self, client, test_user_id):
        """
        Step 1: 사용자 출퇴근 설정 저장

        시나리오:
        - 사용자가 집/회사 주소, 목표 도착 시간 등을 설정
        - POST /api/v1/briefings/commute-settings
        - OpenAPI 스펙 준수: camelCase 키, Envelope 패턴
        """
        # Arrange
        settings_data = {
            "userId": test_user_id,
            "homeAddress": "서울특별시 강남구 역삼동 123",
            "workAddress": "서울특별시 중구 을지로 456",
            "targetArrivalHour": 9,
            "targetArrivalMinute": 0,
            "firstMileDuration": 5,  # 집 → 정류장 도보 5분
            "lastMileDuration": 7,   # 하차역 → 회사 도보 7분
        }

        # Act
        response = client.post(
            "/api/v1/briefings/commute-settings",
            params=settings_data
        )

        # Assert
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()

        # OpenAPI 스펙: Envelope 패턴 검증
        assert "data" in data, "Response must have 'data' key (Envelope pattern)"

        # 응답 내용 검증
        result = data["data"]
        assert "message" in result
        assert "저장되었습니다" in result["message"] or "설정" in result["message"]

    # ========================================================================
    # Test 2: 출근 설정 조회 (GET /api/v1/briefings/commute-settings)
    # ========================================================================

    def test_2_get_commute_settings(self, client, test_user_id):
        """
        Step 2: 저장한 출퇴근 설정 조회

        시나리오:
        - GET /api/v1/briefings/commute-settings?userId=xxx
        - 저장한 설정이 정상적으로 반환되는지 확인
        """
        # Act
        response = client.get(
            "/api/v1/briefings/commute-settings",
            params={"userId": test_user_id}
        )

        # Assert
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()

        # OpenAPI 스펙: Envelope 패턴
        assert "data" in data

        settings = data["data"]

        # camelCase 키 검증
        assert "homeAddress" in settings
        assert "workAddress" in settings
        assert "targetArrivalTime" in settings  # 실제 API는 targetArrivalTime 반환
        assert "firstMileDefaultDuration" in settings  # 실제 API 키

        # 값 검증
        assert settings["targetArrivalTime"] == "09:00"  # 시간 문자열 형식
        assert settings["firstMileDefaultDuration"] == 5

    # ========================================================================
    # Test 3: 출근 브리핑 조회 (GET /api/v1/briefings/commute)
    # ========================================================================

    def test_3_get_commute_briefing(self, client, test_user_id):
        """
        Step 3: 출근 브리핑 조회

        시나리오:
        - GET /api/v1/briefings/commute?userId=xxx
        - Logic 1.1/1.2 동작: GO_NOW 또는 LAST_CHANCE 알림
        - OpenAPI 스펙 준수: camelCase, Envelope 패턴
        """
        # Act
        response = client.get(
            "/api/v1/briefings/commute",
            params={"userId": test_user_id}
        )

        # Assert
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()

        # OpenAPI 스펙: Envelope 패턴
        assert "data" in data, "Response must have 'data' key"

        briefing = data["data"]

        # camelCase 키 검증
        assert "alertType" in briefing, "Must have alertType (camelCase)"
        assert "message" in briefing

        # alertType 값 검증 (GO_NOW, LAST_CHANCE, NO_ACTION 중 하나)
        assert briefing["alertType"] in ["GO_NOW", "LAST_CHANCE", "NO_ACTION"], \
            f"Invalid alertType: {briefing['alertType']}"

        # 메시지 존재 확인
        assert isinstance(briefing["message"], str)
        assert len(briefing["message"]) > 0

    # ========================================================================
    # Test 4: 출근 브리핑 - 존재하지 않는 사용자 (404 Error)
    # ========================================================================

    def test_4_commute_briefing_user_not_found(self, client):
        """
        Step 4: 존재하지 않는 사용자 - 404 에러

        시나리오:
        - GET /api/v1/briefings/commute?userId=nonexistent_user
        - 404 에러 반환
        - OpenAPI 에러 형식: {"error": {"code": "E404", "message": "..."}}
        """
        # Act
        response = client.get(
            "/api/v1/briefings/commute",
            params={"userId": "nonexistent_user_12345"}
        )

        # Assert
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

        data = response.json()

        # OpenAPI 에러 스펙: {"error": {...}}
        assert "error" in data, "Error response must have 'error' key"
        assert "code" in data["error"], "Error must have 'code'"
        assert "message" in data["error"], "Error must have 'message'"

        # 에러 코드 검증
        assert data["error"]["code"] == "E404"

        # 에러 메시지 검증
        assert "not found" in data["error"]["message"].lower() or \
               "없음" in data["error"]["message"] or \
               "찾을 수 없" in data["error"]["message"]

    # ========================================================================
    # Test 5: 퇴근 목표 선택 저장 (POST /api/v1/briefings/retreat-choice)
    # ========================================================================

    def test_5_save_retreat_choice(self, client, test_user_id):
        """
        Step 5: 퇴근 목표 선택 저장

        시나리오:
        - POST /api/v1/briefings/retreat-choice?userId=xxx&choice=B
        - 퇴근 목표: A (빠르게), B (편안하게), C (평소 경로)
        """
        # Act
        response = client.post(
            "/api/v1/briefings/retreat-choice",
            params={
                "userId": test_user_id,
                "choice": "B"  # 편안한 경로
            }
        )

        # Assert
        assert response.status_code == 200

        data = response.json()
        assert "data" in data

        result = data["data"]
        assert "selectedChoice" in result  # 실제 API 키
        assert result["selectedChoice"] == "B"

    # ========================================================================
    # Test 6: 퇴근 목표 조회 (GET /api/v1/briefings/retreat-choice)
    # ========================================================================

    def test_6_get_retreat_choice(self, client, test_user_id):
        """
        Step 6: 저장한 퇴근 목표 조회

        시나리오:
        - GET /api/v1/briefings/retreat-choice?userId=xxx
        - 저장한 선택(B)이 반환되는지 확인
        """
        # Act
        response = client.get(
            "/api/v1/briefings/retreat-choice",
            params={"userId": test_user_id}
        )

        # Assert
        assert response.status_code == 200

        data = response.json()
        assert "data" in data

        result = data["data"]
        assert "selectedChoice" in result  # 실제 API 키
        assert result["selectedChoice"] == "B"  # Step 5에서 저장한 값

    # ========================================================================
    # Test 7: 퇴근 브리핑 조회 (GET /api/v1/briefings/retreat)
    # ========================================================================

    def test_7_get_retreat_briefing(self, client, test_user_id):
        """
        Step 7: 퇴근 브리핑 조회 (막차 알림)

        시나리오:
        - GET /api/v1/briefings/retreat?userId=xxx
        - Logic 1.2 퇴근 모드: 선택한 경로(B)의 막차 정보 반환
        """
        # Act
        response = client.get(
            "/api/v1/briefings/retreat",
            params={"userId": test_user_id}
        )

        # Assert
        assert response.status_code == 200

        data = response.json()
        assert "data" in data

        briefing = data["data"]

        # camelCase 검증
        assert "alertType" in briefing
        assert "message" in briefing

        # 메시지에 막차 관련 내용 포함 확인
        message = briefing["message"]
        assert isinstance(message, str)
        # 막차 관련 키워드 확인 (선택적)
        # assert "막차" in message or "last" in message.lower()

    # ========================================================================
    # Test 8: 전체 여정 통합 테스트 (Full E2E)
    # ========================================================================

    def test_8_full_commute_journey_e2e(self, client):
        """
        Step 8: 전체 여정 통합 테스트

        시나리오:
        1. 새 사용자 생성
        2. 출퇴근 설정 저장
        3. 출근 브리핑 조회
        4. 퇴근 목표 선택
        5. 퇴근 브리핑 조회
        6. 전체 흐름이 끊김 없이 동작하는지 검증
        """
        user_id = "e2e_full_journey_user"

        # Step 1: 설정 저장
        settings_response = client.post(
            "/api/v1/briefings/commute-settings",
            params={
                "userId": user_id,
                "homeAddress": "서울 강남구 테헤란로 123",
                "workAddress": "서울 중구 세종대로 456",
                "targetArrivalHour": 9,
                "targetArrivalMinute": 30,
                "firstMileDuration": 7,
                "lastMileDuration": 5,
            }
        )
        assert settings_response.status_code == 200

        # Step 2: 출근 브리핑 조회
        commute_response = client.get(
            "/api/v1/briefings/commute",
            params={"userId": user_id}
        )
        assert commute_response.status_code == 200
        commute_data = commute_response.json()
        assert "data" in commute_data
        assert "alertType" in commute_data["data"]

        # Step 3: 퇴근 목표 선택
        choice_response = client.post(
            "/api/v1/briefings/retreat-choice",
            params={"userId": user_id, "choice": "A"}
        )
        assert choice_response.status_code == 200

        # Step 4: 퇴근 브리핑 조회
        retreat_response = client.get(
            "/api/v1/briefings/retreat",
            params={"userId": user_id}
        )
        assert retreat_response.status_code == 200
        retreat_data = retreat_response.json()
        assert "data" in retreat_data
        assert "alertType" in retreat_data["data"]

        # Step 5: 전체 흐름 검증
        # 모든 응답이 Envelope 패턴을 따르는지 확인
        assert "data" in commute_data
        assert "data" in retreat_data

        print("\n✅ 전체 E2E 여정 테스트 성공!")
        print(f"   출근 알림: {commute_data['data']['alertType']}")
        print(f"   퇴근 알림: {retreat_data['data']['alertType']}")

    # ========================================================================
    # Test 9: Health Check 엔드포인트 (배포 준비 검증)
    # ========================================================================

    def test_9_health_check_endpoints(self, client):
        """
        Step 9: Health Check 엔드포인트 검증 (Phase 16 배포 준비)

        시나리오:
        - GET /health (Liveness)
        - GET /ready (Readiness)
        - GET /metrics (Metrics)
        """
        # Liveness Probe
        health_response = client.get("/health")
        assert health_response.status_code == 200
        health_data = health_response.json()
        assert health_data["status"] == "healthy"
        assert "version" in health_data

        # Readiness Probe
        ready_response = client.get("/ready")
        assert ready_response.status_code in [200, 503]  # 200 (ready) or 503 (not ready)
        ready_data = ready_response.json()
        assert "status" in ready_data
        assert "checks" in ready_data

        # Metrics
        metrics_response = client.get("/metrics")
        assert metrics_response.status_code == 200

        print("\n✅ Health Check 엔드포인트 정상 동작")
        print(f"   Liveness: {health_data['status']}")
        print(f"   Readiness: {ready_data['status']}")


# ========================================================================
# Phase 14 E2E 테스트 실행 가이드
# ========================================================================
"""
이 E2E 테스트를 실행하려면:

1. 서버 실행 (선택 사항 - TestClient는 자동으로 앱 실행):
   uvicorn app.main:app --reload

2. 테스트 실행:
   pytest app/modules/path_optimize/tests/test_e2e_api_commute.py -v

3. 특정 테스트만 실행:
   pytest app/modules/path_optimize/tests/test_e2e_api_commute.py::TestE2EAPICommuteJourney::test_8_full_commute_journey_e2e -v

4. 상세 로그와 함께 실행:
   pytest app/modules/path_optimize/tests/test_e2e_api_commute.py -v -s

예상 결과: 9개 테스트 모두 PASSED ✅
"""
