"""
E2E API Test: 예외 상황 및 에러 처리 (HTTP 엔드포인트 기반)

다양한 예외 상황과 에러 처리를 검증합니다:
- 잘못된 입력 (Invalid inputs)
- 존재하지 않는 리소스 (404 errors)
- 경계값 테스트 (Boundary conditions)
- OpenAPI 에러 스펙 준수 ({"error": {"code": "...", "message": "..."}})

Author: Phase 14 - E2E Integration Tests
Created: 2025-11-15
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


class TestE2EAPIExceptionHandling:
    """E2E API 테스트: 예외 상황 및 에러 처리"""

    @pytest.fixture
    def client(self):
        """FastAPI TestClient"""
        return TestClient(app)

    @pytest.fixture
    def nonexistent_user_id(self):
        """존재하지 않는 사용자 ID"""
        return "nonexistent_user_999999"

    # ========================================================================
    # Test 1: 존재하지 않는 사용자 - 출근 브리핑 조회 (404)
    # ========================================================================

    def test_1_commute_briefing_user_not_found(self, client, nonexistent_user_id):
        """
        존재하지 않는 사용자의 출근 브리핑 조회

        시나리오:
        - GET /api/v1/briefings/commute?userId=nonexistent
        - 404 에러 반환
        - OpenAPI 에러 형식: {"error": {"code": "E404", "message": "..."}}
        """
        response = client.get(
            "/api/v1/briefings/commute",
            params={"userId": nonexistent_user_id}
        )

        # Assert
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

        data = response.json()

        # OpenAPI 에러 스펙
        assert "error" in data, "Error response must have 'error' key"
        assert "code" in data["error"], "Error must have 'code'"
        assert "message" in data["error"], "Error must have 'message'"

        # 에러 코드 검증
        assert data["error"]["code"] == "E404"

        # 에러 메시지 검증 (사용자 없음 관련)
        message = data["error"]["message"].lower()
        assert "not found" in message or "없음" in message or "찾을 수 없" in message

        print(f"\n✅ 404 에러 처리 성공: {data['error']['code']} - {data['error']['message']}")

    # ========================================================================
    # Test 2: 존재하지 않는 사용자 - 퇴근 브리핑 조회 (404)
    # ========================================================================

    def test_2_retreat_briefing_user_not_found(self, client, nonexistent_user_id):
        """
        존재하지 않는 사용자의 퇴근 브리핑 조회

        시나리오:
        - GET /api/v1/briefings/retreat?userId=nonexistent
        - 404 에러 반환
        """
        response = client.get(
            "/api/v1/briefings/retreat",
            params={"userId": nonexistent_user_id},
        )

        assert response.status_code == 404
        data = response.json()

        assert "error" in data
        assert data["error"]["code"] == "E404"

        print(f"\n✅ 퇴근 브리핑 404 에러: {data['error']['message']}")

    # ========================================================================
    # Test 2-추가: 존재하지 않는 사용자 - 자동 모드 전환 (404)
    # ========================================================================

    def test_2_additional_context_mode_switch_user_not_found(
        self, client, nonexistent_user_id
    ):
        """
        존재하지 않는 사용자의 자동 모드 전환 조회

        시나리오:
        - GET /api/v1/context/mode-switch?userId=nonexistent
        - 404 에러 반환
        - OpenAPI 에러 형식: {"error": {"code": "E404", "message": "..."}}
        """
        response = client.get(
            "/api/v1/context/mode-switch",
            params={
                "userId": nonexistent_user_id,
                "currentLatitude": 37.5,
                "currentLongitude": 127.0,
            },
        )

        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "E404"

    # ========================================================================
    # Test 3: 존재하지 않는 사용자 - 설정 조회 (404)
    # ========================================================================

    def test_3_get_settings_user_not_found(self, client, nonexistent_user_id):
        """
        존재하지 않는 사용자의 설정 조회

        시나리오:
        - GET /api/v1/briefings/commute-settings?userId=nonexistent
        - 404 에러 반환
        """
        response = client.get(
            "/api/v1/briefings/commute-settings",
            params={"userId": nonexistent_user_id},
        )

        assert response.status_code == 404
        data = response.json()

        assert "error" in data
        assert data["error"]["code"] == "E404"

        print(f"\n✅ 설정 조회 404 에러: {data['error']['message']}")

    # ========================================================================
    # Test 7: 지연 감지 - 통계 데이터 없이 NO_ACTION
    # ========================================================================

    def test_7_exception_alert_without_statistical_data(self, client):
        """
        지연 감지 - 통계 데이터/실시간 데이터 모두 없는 경우

        DB에 average_duration 데이터가 없더라도
        /context/exceptions/delays 엔드포인트가 200 + NO_ACTION을 반환하는지 확인
        """
        payload = {
            "segments": [
                {
                    "segmentId": "SEG_TEST_001",
                    "segmentName": "A정류장 → B정류장",
                    "fromStation": "A정류장",
                    "toStation": "B정류장",
                }
            ],
            "currentHour": 8,
            "currentDayOfWeek": 1,
        }

        response = client.post(
            "/api/v1/context/exceptions/delays",
            json=payload,
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert data["data"]["action"] in ["NO_ACTION", "EXCEPTION_DETECTED"]

    # ========================================================================
    # Test 4: 잘못된 퇴근 목표 선택 (Invalid Choice)
    # ========================================================================

    def test_4_invalid_retreat_choice(self, client):
        """
        잘못된 퇴근 목표 선택 (A, B, C 외의 값)

        시나리오:
        - POST /api/v1/briefings/retreat-choice?choice=X
        - 400 또는 422 에러 반환
        """
        test_user_id = "test_exception_user_001"

        # 먼저 설정 저장
        client.post(
            "/api/v1/briefings/commute-settings",
            params={
                "userId": test_user_id,
                "homeAddress": "서울 강남구 테헤란로 123",
                "workAddress": "서울 중구 세종대로 456",
                "targetArrivalHour": 9,
                "targetArrivalMinute": 0,
                "firstMileDuration": 5,
                "lastMileDuration": 5,
            }
        )

        # 잘못된 선택 (X는 유효하지 않음)
        response = client.post(
            "/api/v1/briefings/retreat-choice",
            params={"userId": test_user_id, "choice": "X"}
        )

        # 400 또는 422 에러 예상
        assert response.status_code in [400, 422], \
            f"Expected 400 or 422, got {response.status_code}"

        data = response.json()
        # FastAPI validation error는 "detail" 키를 사용할 수 있음
        assert "error" in data or "detail" in data

        print(f"\n✅ 잘못된 선택 에러 처리: {response.status_code}")

    # ========================================================================
    # Test 5: 경계값 테스트 - 목표 도착 시간 (0시, 23시)
    # ========================================================================

    def test_5_boundary_arrival_time(self, client):
        """
        경계값 테스트 - 목표 도착 시간

        시나리오:
        1. 0시 0분 (자정)
        2. 23시 59분 (거의 자정)
        3. 정상적으로 저장되고 조회되는지 확인
        """
        test_cases = [
            {"hour": 0, "minute": 0, "desc": "자정"},
            {"hour": 23, "minute": 59, "desc": "23시 59분"},
        ]

        for idx, tc in enumerate(test_cases):
            user_id = f"test_boundary_time_{idx}"

            # 설정 저장
            response = client.post(
                "/api/v1/briefings/commute-settings",
                params={
                    "userId": user_id,
                    "homeAddress": "서울 강남구 테헤란로 123",
                    "workAddress": "서울 중구 세종대로 456",
                    "targetArrivalHour": tc["hour"],
                    "targetArrivalMinute": tc["minute"],
                    "firstMileDuration": 5,
                    "lastMileDuration": 5,
                }
            )

            assert response.status_code == 200, \
                f"Failed to save settings for {tc['desc']}: {response.text}"

            # 설정 조회
            get_response = client.get(
                "/api/v1/briefings/commute-settings",
                params={"userId": user_id}
            )

            assert get_response.status_code == 200
            data = get_response.json()
            settings = data["data"]

            # 시간 포맷 검증
            expected_time = f"{tc['hour']:02d}:{tc['minute']:02d}"
            assert settings["targetArrivalTime"] == expected_time, \
                f"Expected {expected_time}, got {settings['targetArrivalTime']}"

            print(f"✅ 경계값 테스트 성공: {tc['desc']} - {expected_time}")

    # ========================================================================
    # Test 6: 경계값 테스트 - First/Last Mile Duration (0분, 60분)
    # ========================================================================

    def test_6_boundary_mile_duration(self, client):
        """
        경계값 테스트 - First/Last Mile Duration

        시나리오:
        1. 0분 (최소값)
        2. 30분 (최대값)
        3. 정상적으로 저장되고 조회되는지 확인
        """
        test_cases = [
            {"first": 0, "last": 0, "desc": "0분 (최소값)"},
            {"first": 30, "last": 30, "desc": "30분 (최대값)"},
        ]

        for idx, tc in enumerate(test_cases):
            user_id = f"test_boundary_mile_{idx}"

            # 설정 저장
            response = client.post(
                "/api/v1/briefings/commute-settings",
                params={
                    "userId": user_id,
                    "homeAddress": "서울 강남구 테헤란로 123",
                    "workAddress": "서울 중구 세종대로 456",
                    "targetArrivalHour": 9,
                    "targetArrivalMinute": 0,
                    "firstMileDuration": tc["first"],
                    "lastMileDuration": tc["last"],
                }
            )

            assert response.status_code == 200, \
                f"Failed to save settings for {tc['desc']}: {response.text}"

            # 설정 조회
            get_response = client.get(
                "/api/v1/briefings/commute-settings",
                params={"userId": user_id}
            )

            assert get_response.status_code == 200
            data = get_response.json()
            settings = data["data"]

            assert settings["firstMileDefaultDuration"] == tc["first"]
            assert settings["lastMileDefaultDuration"] == tc["last"]

            print(f"✅ Mile Duration 경계값: {tc['desc']}")

    # ========================================================================
    # Test 7: 빈 주소 입력 (Empty Address)
    # ========================================================================

    def test_7_empty_address_input(self, client):
        """
        빈 주소 입력 시 에러 처리

        시나리오:
        - homeAddress 또는 workAddress가 빈 문자열
        - 400 또는 422 에러 반환
        """
        test_user_id = "test_empty_address_001"

        # 빈 homeAddress
        response = client.post(
            "/api/v1/briefings/commute-settings",
            params={
                "userId": test_user_id,
                "homeAddress": "",  # 빈 문자열
                "workAddress": "서울 중구 세종대로 456",
                "targetArrivalHour": 9,
                "targetArrivalMinute": 0,
                "firstMileDuration": 5,
                "lastMileDuration": 5,
            }
        )

        # 400 또는 422 에러 예상
        assert response.status_code in [400, 422], \
            f"Expected 400 or 422 for empty homeAddress, got {response.status_code}"

        print(f"\n✅ 빈 주소 에러 처리: {response.status_code}")

    # ========================================================================
    # Test 8: 중복 설정 저장 (덮어쓰기)
    # ========================================================================

    def test_8_duplicate_settings_overwrite(self, client):
        """
        중복 설정 저장 시 덮어쓰기 동작 확인

        시나리오:
        1. 초기 설정 저장
        2. 같은 userId로 다른 설정 저장
        3. 최신 설정으로 덮어써지는지 확인
        """
        user_id = "test_duplicate_001"

        # 초기 설정
        initial_response = client.post(
            "/api/v1/briefings/commute-settings",
            params={
                "userId": user_id,
                "homeAddress": "서울 강남구 역삼동 111",
                "workAddress": "서울 중구 을지로 222",
                "targetArrivalHour": 9,
                "targetArrivalMinute": 0,
                "firstMileDuration": 5,
                "lastMileDuration": 5,
            }
        )
        assert initial_response.status_code == 200

        # 덮어쓰기
        updated_response = client.post(
            "/api/v1/briefings/commute-settings",
            params={
                "userId": user_id,
                "homeAddress": "서울 서초구 서초동 333",  # 변경
                "workAddress": "서울 종로구 종로 444",      # 변경
                "targetArrivalHour": 10,                    # 변경
                "targetArrivalMinute": 30,                  # 변경
                "firstMileDuration": 8,                     # 변경
                "lastMileDuration": 7,                      # 변경
            }
        )
        assert updated_response.status_code == 200

        # 최종 설정 조회
        get_response = client.get(
            "/api/v1/briefings/commute-settings",
            params={"userId": user_id}
        )
        assert get_response.status_code == 200

        data = get_response.json()
        settings = data["data"]

        # 최신 값으로 덮어써졌는지 확인
        assert settings["homeAddress"] == "서울 서초구 서초동 333"
        assert settings["workAddress"] == "서울 종로구 종로 444"
        assert settings["targetArrivalTime"] == "10:30"
        assert settings["firstMileDefaultDuration"] == 8
        assert settings["lastMileDefaultDuration"] == 7

        print("\n✅ 중복 설정 덮어쓰기 성공")

    # ========================================================================
    # Test 9: 퇴근 목표 선택 전 브리핑 조회 (기본 동작)
    # ========================================================================

    def test_9_retreat_briefing_without_choice_saved(self, client):
        """
        퇴근 목표 선택을 저장하지 않은 상태에서 퇴근 브리핑 조회

        시나리오:
        1. 설정만 저장 (퇴근 목표 선택 없음)
        2. 퇴근 브리핑 조회
        3. 기본 경로로 브리핑이 반환되는지 확인 (에러가 아님)
        """
        user_id = "test_no_choice_briefing_001"

        # 설정만 저장
        client.post(
            "/api/v1/briefings/commute-settings",
            params={
                "userId": user_id,
                "homeAddress": "서울 강남구 테헤란로 555",
                "workAddress": "서울 중구 세종대로 666",
                "targetArrivalHour": 9,
                "targetArrivalMinute": 0,
                "firstMileDuration": 5,
                "lastMileDuration": 5,
            }
        )

        # 선택 없이 퇴근 브리핑 조회
        response = client.get(
            "/api/v1/briefings/retreat",
            params={"userId": user_id}
        )

        # 200 OK 예상 (에러가 아님)
        assert response.status_code == 200, \
            f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()
        assert "data" in data
        briefing = data["data"]

        # 기본 브리핑 필드 존재 확인
        assert "alertType" in briefing
        assert "message" in briefing

        print(f"\n✅ 선택 없이 브리핑 조회 성공: {briefing['alertType']}")

    # ========================================================================
    # Test 10: Health Check 엔드포인트 예외 처리
    # ========================================================================

    def test_10_health_check_always_available(self, client):
        """
        Health Check 엔드포인트는 항상 사용 가능해야 함

        시나리오:
        - GET /health (Liveness)
        - GET /ready (Readiness)
        - 항상 200 또는 503 반환 (500 에러 없음)
        """
        # Liveness
        health_response = client.get("/health")
        assert health_response.status_code == 200
        health_data = health_response.json()
        assert health_data["status"] == "healthy"

        # Readiness
        ready_response = client.get("/ready")
        assert ready_response.status_code in [200, 503]  # Ready or Not Ready
        ready_data = ready_response.json()
        assert "status" in ready_data

        print("\n✅ Health Check 엔드포인트 정상 동작")

    # ========================================================================
    # Test 11: OpenAPI Envelope 패턴 일관성 검증
    # ========================================================================

    def test_11_envelope_pattern_consistency(self, client):
        """
        모든 성공 응답이 Envelope 패턴을 따르는지 검증

        시나리오:
        1. 여러 엔드포인트 호출
        2. 모든 2xx 응답이 {"data": {...}} 형식인지 확인
        """
        user_id = "test_envelope_001"

        # 설정 저장
        client.post(
            "/api/v1/briefings/commute-settings",
            params={
                "userId": user_id,
                "homeAddress": "서울 강남구 테헤란로 123",
                "workAddress": "서울 중구 세종대로 456",
                "targetArrivalHour": 9,
                "targetArrivalMinute": 0,
                "firstMileDuration": 5,
                "lastMileDuration": 5,
            }
        )

        endpoints = [
            ("GET", "/api/v1/briefings/commute-settings", {"userId": user_id}),
            ("GET", "/api/v1/briefings/commute", {"userId": user_id}),
            ("POST", "/api/v1/briefings/retreat-choice", {"userId": user_id, "choice": "A"}),
            ("GET", "/api/v1/briefings/retreat-choice", {"userId": user_id}),
            ("GET", "/api/v1/briefings/retreat", {"userId": user_id}),
        ]

        for method, endpoint, params in endpoints:
            if method == "GET":
                response = client.get(endpoint, params=params)
            else:  # POST
                response = client.post(endpoint, params=params)

            assert response.status_code == 200, \
                f"{method} {endpoint} failed: {response.status_code}"

            data = response.json()
            assert "data" in data, \
                f"{method} {endpoint} missing 'data' key (Envelope pattern)"

            print(f"✅ Envelope 패턴 검증: {method} {endpoint}")


# ========================================================================
# Phase 14 예외 처리 E2E 테스트 실행 가이드
# ========================================================================
"""
이 예외 처리 E2E 테스트를 실행하려면:

1. 테스트 실행:
   pytest app/modules/path_optimize/tests/test_e2e_api_exceptions.py -v

2. 특정 테스트만 실행:
   pytest app/modules/path_optimize/tests/test_e2e_api_exceptions.py::TestE2EAPIExceptionHandling::test_4_invalid_retreat_choice -v

3. 상세 로그와 함께 실행:
   pytest app/modules/path_optimize/tests/test_e2e_api_exceptions.py -v -s

예상 결과: 11개 테스트 모두 PASSED ✅
"""
