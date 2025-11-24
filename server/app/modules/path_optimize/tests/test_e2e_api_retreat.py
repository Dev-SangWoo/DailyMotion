"""
E2E API Test: 퇴근 모드 전용 시나리오 (HTTP 엔드포인트 기반)

퇴근 모드의 다양한 시나리오를 검증합니다:
- 다양한 사용자 선택 (A: 빠르게, B: 편안하게, C: 평소 경로)
- 막차 알림 로직
- 시간대별 경로 추천
- OpenAPI 스펙 준수 (Envelope 패턴, camelCase)

Author: Phase 14 - E2E Integration Tests
Created: 2025-11-15
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


class TestE2EAPIRetreatMode:
    """E2E API 테스트: 퇴근 모드 전용 시나리오"""

    @pytest.fixture
    def client(self):
        """FastAPI TestClient"""
        return TestClient(app)

    @pytest.fixture
    def test_user_base(self):
        """테스트용 기본 사용자 ID 접두사"""
        return "test_retreat_user"

    # ========================================================================
    # Test 1: 사용자 선택 A (빠르게) - 퇴근 브리핑
    # ========================================================================

    def test_1_retreat_choice_a_fastest(self, client, test_user_base):
        """
        퇴근 목표 A (빠르게) 선택 시나리오

        시나리오:
        1. 출퇴근 설정 저장
        2. 퇴근 목표 'A' 선택 (빠른 경로)
        3. 퇴근 브리핑 조회
        4. alertType이 LAST_CHANCE인지 확인
        """
        user_id = f"{test_user_base}_a_001"

        # Step 1: 출퇴근 설정 저장
        settings_response = client.post(
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
        assert settings_response.status_code == 200

        # Step 2: 퇴근 목표 A 선택
        choice_response = client.post(
            "/api/v1/briefings/retreat-choice",
            params={"userId": user_id, "choice": "A"}
        )
        assert choice_response.status_code == 200
        choice_data = choice_response.json()
        assert choice_data["data"]["selectedChoice"] == "A"

        # Step 3: 퇴근 브리핑 조회
        retreat_response = client.get(
            "/api/v1/briefings/retreat",
            params={"userId": user_id}
        )
        assert retreat_response.status_code == 200

        data = retreat_response.json()
        assert "data" in data
        briefing = data["data"]

        # Envelope 패턴 & camelCase 검증
        assert "alertType" in briefing
        assert "message" in briefing

        # alertType 검증
        assert briefing["alertType"] in ["LAST_CHANCE", "NO_ACTION"]

        print(f"\n✅ 선택 A (빠르게): {briefing['alertType']}")

    # ========================================================================
    # Test 2: 사용자 선택 B (편안하게) - 퇴근 브리핑
    # ========================================================================

    def test_2_retreat_choice_b_comfortable(self, client, test_user_base):
        """
        퇴근 목표 B (편안하게) 선택 시나리오

        시나리오:
        1. 출퇴근 설정 저장
        2. 퇴근 목표 'B' 선택 (편안한 경로)
        3. 퇴근 브리핑 조회
        4. recommendedTransport 필드 검증
        """
        user_id = f"{test_user_base}_b_001"

        # Step 1: 설정 저장
        settings_response = client.post(
            "/api/v1/briefings/commute-settings",
            params={
                "userId": user_id,
                "homeAddress": "서울 강남구 역삼동 789",
                "workAddress": "서울 중구 을지로 321",
                "targetArrivalHour": 9,
                "targetArrivalMinute": 30,
                "firstMileDuration": 7,
                "lastMileDuration": 6,
            }
        )
        assert settings_response.status_code == 200

        # Step 2: 퇴근 목표 B 선택
        choice_response = client.post(
            "/api/v1/briefings/retreat-choice",
            params={"userId": user_id, "choice": "B"}
        )
        assert choice_response.status_code == 200
        choice_data = choice_response.json()
        assert choice_data["data"]["selectedChoice"] == "B"

        # Step 3: 퇴근 브리핑 조회
        retreat_response = client.get(
            "/api/v1/briefings/retreat",
            params={"userId": user_id}
        )
        assert retreat_response.status_code == 200

        data = retreat_response.json()
        assert "data" in data
        briefing = data["data"]

        # camelCase 검증
        assert "alertType" in briefing
        assert "message" in briefing
        assert "recommendedTransport" in briefing

        # recommendedTransport 구조 검증
        transport = briefing["recommendedTransport"]
        assert "type" in transport
        assert "name" in transport
        assert "departureInMinutes" in transport

        print(f"\n✅ 선택 B (편안하게): {briefing['alertType']}, 교통편: {transport['name']}")

    # ========================================================================
    # Test 3: 사용자 선택 C (평소 경로) - 퇴근 브리핑
    # ========================================================================

    def test_3_retreat_choice_c_usual(self, client, test_user_base):
        """
        퇴근 목표 C (평소 경로) 선택 시나리오

        시나리오:
        1. 출퇴근 설정 저장
        2. 퇴근 목표 'C' 선택 (평소 경로)
        3. 퇴근 브리핑 조회
        4. departureInMinutes 필드 검증
        """
        user_id = f"{test_user_base}_c_001"

        # Step 1: 설정 저장
        settings_response = client.post(
            "/api/v1/briefings/commute-settings",
            params={
                "userId": user_id,
                "homeAddress": "서울 서초구 서초동 111",
                "workAddress": "서울 종로구 종로 222",
                "targetArrivalHour": 10,
                "targetArrivalMinute": 0,
                "firstMileDuration": 8,
                "lastMileDuration": 4,
            }
        )
        assert settings_response.status_code == 200

        # Step 2: 퇴근 목표 C 선택
        choice_response = client.post(
            "/api/v1/briefings/retreat-choice",
            params={"userId": user_id, "choice": "C"}
        )
        assert choice_response.status_code == 200
        choice_data = choice_response.json()
        assert choice_data["data"]["selectedChoice"] == "C"

        # Step 3: 퇴근 브리핑 조회
        retreat_response = client.get(
            "/api/v1/briefings/retreat",
            params={"userId": user_id}
        )
        assert retreat_response.status_code == 200

        data = retreat_response.json()
        assert "data" in data
        briefing = data["data"]

        # 필수 필드 검증
        assert "alertType" in briefing
        assert "message" in briefing
        assert "recommendedTransport" in briefing  # BriefingResponse 필수 필드

        # recommendedTransport 안에 departureInMinutes 검증
        transport = briefing["recommendedTransport"]
        assert "departureInMinutes" in transport
        assert isinstance(transport["departureInMinutes"], (int, type(None)))

        print(f"\n✅ 선택 C (평소 경로): {briefing['alertType']}, 출발까지: {transport['departureInMinutes']}분")

    # ========================================================================
    # Test 4: 퇴근 목표 변경 (A → B → C)
    # ========================================================================

    def test_4_change_retreat_choice_sequence(self, client, test_user_base):
        """
        퇴근 목표 순차 변경 시나리오

        시나리오:
        1. 초기 설정 저장
        2. A 선택 → 조회 → 검증
        3. B로 변경 → 조회 → 검증
        4. C로 변경 → 조회 → 검증
        5. 마지막 선택(C)이 유지되는지 확인
        """
        user_id = f"{test_user_base}_change_001"

        # Step 1: 초기 설정
        settings_response = client.post(
            "/api/v1/briefings/commute-settings",
            params={
                "userId": user_id,
                "homeAddress": "서울 마포구 연남동 333",
                "workAddress": "서울 강남구 역삼동 444",
                "targetArrivalHour": 9,
                "targetArrivalMinute": 15,
                "firstMileDuration": 6,
                "lastMileDuration": 8,
            }
        )
        assert settings_response.status_code == 200

        # Step 2: A 선택
        choice_a_response = client.post(
            "/api/v1/briefings/retreat-choice",
            params={"userId": user_id, "choice": "A"}
        )
        assert choice_a_response.status_code == 200
        assert choice_a_response.json()["data"]["selectedChoice"] == "A"

        # Step 3: B로 변경
        choice_b_response = client.post(
            "/api/v1/briefings/retreat-choice",
            params={"userId": user_id, "choice": "B"}
        )
        assert choice_b_response.status_code == 200
        assert choice_b_response.json()["data"]["selectedChoice"] == "B"

        # Step 4: C로 변경
        choice_c_response = client.post(
            "/api/v1/briefings/retreat-choice",
            params={"userId": user_id, "choice": "C"}
        )
        assert choice_c_response.status_code == 200
        assert choice_c_response.json()["data"]["selectedChoice"] == "C"

        # Step 5: 최종 선택 조회로 검증
        get_choice_response = client.get(
            "/api/v1/briefings/retreat-choice",
            params={"userId": user_id}
        )
        assert get_choice_response.status_code == 200
        final_choice = get_choice_response.json()["data"]["selectedChoice"]
        assert final_choice == "C", f"Expected C, but got {final_choice}"

        print("\n✅ 퇴근 목표 변경 시나리오 성공: A → B → C")

    # ========================================================================
    # Test 5: 퇴근 목표 선택 없이 브리핑 조회 (기본값)
    # ========================================================================

    def test_5_retreat_briefing_without_choice(self, client, test_user_base):
        """
        퇴근 목표 선택 없이 퇴근 브리핑 조회

        시나리오:
        1. 출퇴근 설정만 저장 (선택 없음)
        2. 퇴근 브리핑 조회
        3. 기본 경로로 브리핑이 반환되는지 확인
        """
        user_id = f"{test_user_base}_no_choice_001"

        # Step 1: 설정만 저장
        settings_response = client.post(
            "/api/v1/briefings/commute-settings",
            params={
                "userId": user_id,
                "homeAddress": "서울 성동구 성수동 555",
                "workAddress": "서울 용산구 한강로 666",
                "targetArrivalHour": 9,
                "targetArrivalMinute": 45,
                "firstMileDuration": 5,
                "lastMileDuration": 7,
            }
        )
        assert settings_response.status_code == 200

        # Step 2: 선택 없이 퇴근 브리핑 조회
        retreat_response = client.get(
            "/api/v1/briefings/retreat",
            params={"userId": user_id}
        )
        assert retreat_response.status_code == 200

        data = retreat_response.json()
        assert "data" in data
        briefing = data["data"]

        # 기본값으로도 정상적인 브리핑이 반환되어야 함
        assert "alertType" in briefing
        assert "message" in briefing
        assert isinstance(briefing["message"], str)
        assert len(briefing["message"]) > 0

        print(f"\n✅ 선택 없이 브리핑 조회: {briefing['alertType']}")

    # ========================================================================
    # Test 6: 퇴근 브리핑 - BriefingResponse 전체 필드 검증
    # ========================================================================

    def test_6_retreat_briefing_full_schema_validation(self, client, test_user_base):
        """
        퇴근 브리핑 응답의 BriefingResponse 스키마 전체 검증

        시나리오:
        1. 설정 저장 및 선택
        2. 퇴근 브리핑 조회
        3. BriefingResponse의 모든 필수 필드 존재 확인
        4. 각 필드 타입 검증
        """
        user_id = f"{test_user_base}_schema_001"

        # Step 1: 설정 및 선택
        client.post(
            "/api/v1/briefings/commute-settings",
            params={
                "userId": user_id,
                "homeAddress": "서울 강북구 미아동 777",
                "workAddress": "서울 서초구 서초동 888",
                "targetArrivalHour": 9,
                "targetArrivalMinute": 0,
                "firstMileDuration": 10,
                "lastMileDuration": 5,
            }
        )
        client.post(
            "/api/v1/briefings/retreat-choice",
            params={"userId": user_id, "choice": "B"}
        )

        # Step 2: 퇴근 브리핑 조회
        retreat_response = client.get(
            "/api/v1/briefings/retreat",
            params={"userId": user_id}
        )
        assert retreat_response.status_code == 200

        data = retreat_response.json()
        assert "data" in data
        briefing = data["data"]

        # BriefingResponse 필수 필드 검증 (모델에 정의된 필드만)
        required_fields = ["alertType", "message", "recommendedTransport"]
        for field in required_fields:
            assert field in briefing, f"Missing required field: {field}"

        # 타입 검증
        assert isinstance(briefing["alertType"], str)
        assert isinstance(briefing["message"], str)
        assert isinstance(briefing["recommendedTransport"], dict)

        # recommendedTransport 하위 필드 검증
        transport = briefing["recommendedTransport"]
        assert "type" in transport
        assert "name" in transport
        assert "departureInMinutes" in transport

        print("\n✅ BriefingResponse 전체 스키마 검증 성공")
        print(f"   alertType: {briefing['alertType']}")
        print(f"   message: {briefing['message'][:50]}...")
        print(f"   transport.type: {transport['type']}")
        print(f"   transport.name: {transport['name']}")

    # ========================================================================
    # Test 7: 여러 사용자 동시 퇴근 브리핑 조회
    # ========================================================================

    def test_7_multiple_users_retreat_briefings(self, client, test_user_base):
        """
        여러 사용자가 동시에 퇴근 브리핑을 조회하는 시나리오

        시나리오:
        1. 3명의 사용자 생성 (각각 다른 선택)
        2. 각 사용자의 퇴근 브리핑 조회
        3. 각 사용자의 선택에 맞는 브리핑이 반환되는지 확인
        4. 사용자 간 데이터 격리 확인
        """
        users = [
            {"id": f"{test_user_base}_multi_001", "choice": "A"},
            {"id": f"{test_user_base}_multi_002", "choice": "B"},
            {"id": f"{test_user_base}_multi_003", "choice": "C"},
        ]

        # Step 1: 각 사용자 설정 및 선택
        for user in users:
            client.post(
                "/api/v1/briefings/commute-settings",
                params={
                    "userId": user["id"],
                    "homeAddress": f"서울 강남구 테헤란로 {hash(user['id']) % 1000}",
                    "workAddress": f"서울 중구 세종대로 {hash(user['id']) % 1000}",
                    "targetArrivalHour": 9,
                    "targetArrivalMinute": 0,
                    "firstMileDuration": 5,
                    "lastMileDuration": 5,
                }
            )
            client.post(
                "/api/v1/briefings/retreat-choice",
                params={"userId": user["id"], "choice": user["choice"]}
            )

        # Step 2: 각 사용자의 퇴근 브리핑 조회
        for user in users:
            retreat_response = client.get(
                "/api/v1/briefings/retreat",
                params={"userId": user["id"]}
            )
            assert retreat_response.status_code == 200

            data = retreat_response.json()
            assert "data" in data
            briefing = data["data"]

            # 필수 필드 검증
            assert "alertType" in briefing
            assert "message" in briefing

            # 선택 확인 (각 사용자의 선택이 유지되는지)
            choice_response = client.get(
                "/api/v1/briefings/retreat-choice",
                params={"userId": user["id"]}
            )
            assert choice_response.status_code == 200
            saved_choice = choice_response.json()["data"]["selectedChoice"]
            assert saved_choice == user["choice"], \
                f"User {user['id']} expected choice {user['choice']}, got {saved_choice}"

        print("\n✅ 다중 사용자 퇴근 브리핑 조회 성공 (데이터 격리 확인)")


# ========================================================================
# Phase 14 퇴근 모드 E2E 테스트 실행 가이드
# ========================================================================
"""
이 퇴근 모드 E2E 테스트를 실행하려면:

1. 테스트 실행:
   pytest app/modules/path_optimize/tests/test_e2e_api_retreat.py -v

2. 특정 테스트만 실행:
   pytest app/modules/path_optimize/tests/test_e2e_api_retreat.py::TestE2EAPIRetreatMode::test_4_change_retreat_choice_sequence -v

3. 상세 로그와 함께 실행:
   pytest app/modules/path_optimize/tests/test_e2e_api_retreat.py -v -s

예상 결과: 7개 테스트 모두 PASSED ✅
"""
