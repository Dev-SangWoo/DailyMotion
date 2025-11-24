"""
Phase 12 & Logic 2.1: API Endpoint 테스트

엔드포인트 테스트:
- GET /api/v1/briefings/commute - 출근 브리핑 조회
- GET /api/v1/briefings/retreat - 퇴근 막차 알림 조회
- POST /api/v1/briefings/commute-settings - 설정 저장
- GET /api/v1/briefings/commute-settings - 설정 조회
- POST /api/v1/briefings/retreat-choice - 퇴근 목표 저장
- GET /api/v1/briefings/retreat-choice - 퇴근 목표 조회
- GET /api/v1/context/mode-switch - 자동 모드 전환 (Logic 2.1)
"""

import pytest
from datetime import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# =====================================================
# Test 1: 출근 브리핑 조회 (기본 사용자)
# =====================================================

def test_get_commute_briefing_default_user():
    """
    Test: GET /api/v1/briefings/commute
    기본 사용자 (user_001)의 출근 브리핑 조회
    """
    response = client.get("/api/v1/briefings/commute?userId=user_001")
    assert response.status_code == 200

    data = response.json()
    assert "data" in data
    assert "alertType" in data["data"]
    assert "message" in data["data"]
    assert "recommendedTransport" in data["data"]

    # alertType는 GO_NOW, LAST_CHANCE, NO_ACTION 중 하나
    assert data["data"]["alertType"] in ["GO_NOW", "LAST_CHANCE", "NO_ACTION"]

    # 추천 교통수단 정보 검증
    if data["data"]["recommendedTransport"]:
        assert "type" in data["data"]["recommendedTransport"]
        assert "name" in data["data"]["recommendedTransport"]
        assert "departureInMinutes" in data["data"]["recommendedTransport"]

    print(f"✅ Test 1 통과: {data['data']['alertType']}")


# =====================================================
# Test 2: 존재하지 않는 사용자 (404 에러)
# =====================================================

def test_get_commute_briefing_user_not_found():
    """
    Test: GET /api/v1/briefings/commute
    존재하지 않는 사용자 조회 → 404 에러
    """
    response = client.get("/api/v1/briefings/commute?userId=user_nonexistent")
    assert response.status_code == 404

    data = response.json()
    assert "detail" in data

    print(f"✅ Test 2 통과: 존재하지 않는 사용자 에러 처리")


# =====================================================
# Test 3: 출퇴근 설정 저장
# =====================================================

def test_save_commute_settings():
    """
    Test: POST /api/v1/briefings/commute-settings
    새로운 사용자 설정 저장
    """
    response = client.post(
        "/api/v1/briefings/commute-settings",
        params={
            "userId": "user_test_003",
            "homeAddress": "서울 강북구",
            "workAddress": "서울 용산구",
            "targetArrivalHour": 9,
            "targetArrivalMinute": 15,
            "firstMileDuration": 7,
            "lastMileDuration": 5,
        },
    )
    assert response.status_code == 200

    data = response.json()
    assert data["data"]["action"] == "SETTINGS_SAVED"
    assert data["data"]["userId"] == "user_test_003"
    assert data["data"]["settings"]["targetArrivalTime"] == "09:15"
    assert data["data"]["settings"]["firstMileDefaultDuration"] == 7

    print(f"✅ Test 3 통과: 설정 저장 성공")


# =====================================================
# Test 4: 출퇴근 설정 조회
# =====================================================

def test_get_commute_settings():
    """
    Test: GET /api/v1/briefings/commute-settings
    사용자 설정 조회
    """
    response = client.get("/api/v1/briefings/commute-settings?userId=user_001")
    assert response.status_code == 200

    data = response.json()
    assert data["data"]["userId"] == "user_001"
    assert "homeAddress" in data["data"]
    assert "workAddress" in data["data"]
    assert "targetArrivalTime" in data["data"]
    assert "firstMileDefaultDuration" in data["data"]

    print(f"✅ Test 4 통과: 설정 조회 성공")


# =====================================================
# Test 5: 퇴근 목표 선택 저장
# =====================================================

def test_save_retreat_choice():
    """
    Test: POST /api/v1/briefings/retreat-choice
    퇴근 모드 사용자 목표 선택 저장 (A/B/C)
    """
    response = client.post(
        "/api/v1/briefings/retreat-choice",
        params={
            "userId": "user_001",
            "choice": "B",
        }
    )
    assert response.status_code == 200

    data = response.json()
    assert data["data"]["action"] == "CHOICE_SAVED"
    assert data["data"]["userId"] == "user_001"
    assert data["data"]["selectedChoice"] == "B"
    assert data["data"]["selectedLabel"] == "편안하게"

    print(f"✅ Test 5 통과: 퇴근 목표 저장 성공 (B)")


# =====================================================
# Test 6: 퇴근 목표 선택 조회
# =====================================================

def test_get_retreat_choice():
    """
    Test: GET /api/v1/briefings/retreat-choice
    사용자 퇴근 목표 선택 조회
    """
    # 먼저 선택지 저장
    client.post(
        "/api/v1/briefings/retreat-choice",
        params={"userId": "user_002", "choice": "A"},
    )

    # 조회
    response = client.get("/api/v1/briefings/retreat-choice?userId=user_002")
    assert response.status_code == 200

    data = response.json()
    assert data["data"]["userId"] == "user_002"
    assert data["data"]["selectedChoice"] == "A"
    assert data["data"]["selectedLabel"] == "가장 빠르게"

    print(f"✅ Test 6 통과: 퇴근 목표 조회 성공")


# =====================================================
# Test 7: 퇴근 막차 알림 조회
# =====================================================

def test_get_retreat_mode_last_bus_alert():
    """
    Test: GET /api/v1/briefings/retreat
    퇴근 모드 막차 알림 조회
    """
    response = client.get("/api/v1/briefings/retreat?userId=user_001")
    assert response.status_code == 200

    data = response.json()
    assert "data" in data
    assert "message" in data["data"]
    assert "recommendedTransport" in data["data"]

    # 메시지에 막차 정보가 포함되어 있어야 함
    assert "막차" in data["data"]["message"] or "분 뒤" in data["data"]["message"]

    print(f"✅ Test 7 통과: 퇴근 막차 알림 조회")


# =====================================================
# Test 9: 자동 모드 전환 (Logic 2.1)
# =====================================================

def test_get_auto_mode_switch_action_basic():
    """
    Test: GET /api/v1/context/mode-switch
    기본 사용자(user_001)의 자동 모드 전환 결과 조회
    """
    response = client.get(
        "/api/v1/context/mode-switch",
        params={
            "userId": "user_001",
            "currentLatitude": 37.4979,
            "currentLongitude": 127.0276,
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()
    assert "data" in data
    assert "action" in data["data"]

    # 액션은 AUTO_SWITCH_TO_ETA 또는 NO_ACTION 중 하나여야 함
    assert data["data"]["action"] in ["AUTO_SWITCH_TO_ETA", "NO_ACTION"]

    print(f"✅ Test 9 통과: 자동 모드 전환 - action={data['data']['action']}")


# =====================================================
# Test 10: 대안 경로 제안 (Logic 2.2)
# =====================================================

def test_post_alternative_route_suggestion():
    """
    Test: POST /api/v1/context/routes/alternative
    기본 입력에 대해 200 응답 및 suggestAlternativeRoute 필드 확인
    """
    payload = {
        "currentRouteTime": 35,
        "alternativeRouteTime": 27,
        "mode": "COMMUTE",
        "currentBusArrivalMinutes": 3,
        "currentBusDurationMinutes": 2,
        "transferBusArrivalMinutes": 8,
        "transferBusCongestion": 60,
        "transferLocation": "가산디지털단지",
        "transferLine": "7호선 급행",
    }

    response = client.post("/api/v1/context/routes/alternative", json=payload)
    assert response.status_code == 200, response.text

    data = response.json()
    assert "data" in data
    assert "suggestAlternativeRoute" in data["data"]

    print(
        f"✅ Test 10 통과: 대안 경로 제안 - suggestAlternativeRoute={data['data']['suggestAlternativeRoute']}"
    )


# =====================================================
# Test 11: 스마트 폴링 빈도 (Logic 4.3)
# =====================================================

def test_get_smart_polling_frequency():
    """
    Test: GET /api/v1/context/polling/frequency
    기본 입력에 대해 200 응답 및 frequency 필드 확인
    """
    response = client.get(
        "/api/v1/context/polling/frequency",
        params={
            "userLatitude": 37.4979,
            "userLongitude": 127.0276,
            "userSpeed": 3.6,
            "transitMode": "WALKING",
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()
    assert "data" in data
    assert "frequency" in data["data"]
    assert data["data"]["frequency"] in ["HIGH", "MEDIUM", "LOW"]

    print(
        f"✅ Test 11 통과: 스마트 폴링 빈도 - "
        f"frequency={data['data']['frequency']}, interval={data['data']['intervalSeconds']}s"
    )


# =====================================================
# Test 8: 유효하지 않은 퇴근 목표 선택 (400 에러)
# =====================================================

def test_save_retreat_choice_invalid():
    """
    Test: POST /api/v1/briefings/retreat-choice
    유효하지 않은 선택지 (X) → 400 에러
    """
    response = client.post(
        "/api/v1/briefings/retreat-choice",
        params={
            "user_id": "user_001",
            "choice": "X",  # 유효하지 않음
        }
    )
    assert response.status_code == 422  # Validation error

    print(f"✅ Test 8 통과: 유효하지 않은 선택지 에러 처리")


# =====================================================
# Test 9: 설정 저장 후 브리핑 조회 통합 테스트
# =====================================================

def test_save_settings_and_get_briefing():
    """
    Test: 통합 테스트
    1. 설정 저장
    2. 설정 조회 확인
    3. 브리핑 조회 (새로운 시간으로)
    """
    user_id = "user_integration_test"

    # Step 1: 설정 저장
    response = client.post(
        "/api/v1/briefings/commute-settings",
        params={
            "user_id": user_id,
            "home_address": "테스트 집",
            "work_address": "테스트 회사",
            "target_arrival_hour": 10,
            "target_arrival_minute": 0,
            "first_mile_duration": 5,
            "last_mile_duration": 5,
        }
    )
    assert response.status_code == 200

    # Step 2: 설정 조회
    response = client.get(
        f"/api/v1/briefings/commute-settings?user_id={user_id}"
    )
    assert response.status_code == 200
    assert response.json()["data"]["userId"] == user_id

    # Step 3: 브리핑 조회
    response = client.get(
        f"/api/v1/briefings/commute?user_id={user_id}"
    )
    assert response.status_code == 200
    assert "alertType" in response.json()["data"]

    print(f"✅ Test 9 통과: 통합 테스트 (설정 저장 → 조회 → 브리핑)")


# =====================================================
# Test 10: 퇴근 목표별 막차 알림 테스트
# =====================================================

def test_retreat_choice_affects_bus_alert():
    """
    Test: 퇴근 목표 선택에 따른 막차 알림 변경 확인
    - A 선택 → 막차 10분
    - B 선택 → 막차 30분
    - C 선택 → 막차 25분
    """
    user_id = "user_retreat_test"

    # 선택지 A로 설정
    client.post(
        "/api/v1/briefings/retreat-choice",
        params={"user_id": user_id, "choice": "A"}
    )

    # 막차 알림 조회 (A)
    response_a = client.get(f"/api/v1/briefings/retreat?user_id={user_id}")
    assert response_a.status_code == 200
    message_a = response_a.json()["data"]["message"]
    assert "10분" in message_a

    # 선택지 B로 변경
    client.post(
        "/api/v1/briefings/retreat-choice",
        params={"user_id": user_id, "choice": "B"}
    )

    # 막차 알림 조회 (B)
    response_b = client.get(f"/api/v1/briefings/retreat?user_id={user_id}")
    assert response_b.status_code == 200
    message_b = response_b.json()["data"]["message"]
    assert "30분" in message_b

    # 메시지가 다름을 확인
    assert message_a != message_b

    print(f"✅ Test 10 통과: 퇴근 선택에 따른 막차 시간 변경 확인")


# =====================================================
# Test 11: 출근 브리핑 응답 구조 검증
# =====================================================

def test_commute_briefing_response_structure():
    """
    Test: OpenAPI 응답 구조 준수 확인
    """
    response = client.get("/api/v1/briefings/commute?user_id=user_001")
    data = response.json()

    # 최상위 구조
    assert "data" in data or "error" in data

    # 성공 응답 구조
    if "data" in data:
        assert isinstance(data["data"], dict)
        assert "alertType" in data["data"]
        assert "message" in data["data"]

    print(f"✅ Test 11 통과: OpenAPI 응답 구조 검증")


# =====================================================
# Test 12: Mock DB 상태 유지 확인
# =====================================================

def test_mock_db_persistence():
    """
    Test: Mock DB에 저장된 데이터가 유지되는지 확인
    """
    user_id = "user_persistence_test"
    home_address = "영구 저장 주소"

    # 데이터 저장
    response1 = client.post(
        "/api/v1/briefings/commute-settings",
        params={
            "user_id": user_id,
            "home_address": home_address,
            "work_address": "테스트 회사",
            "target_arrival_hour": 8,
            "target_arrival_minute": 30,
        }
    )
    assert response1.status_code == 200

    # 데이터 재조회
    response2 = client.get(
        f"/api/v1/briefings/commute-settings?user_id={user_id}"
    )
    assert response2.status_code == 200
    assert response2.json()["data"]["homeAddress"] == home_address

    print(f"✅ Test 12 통과: Mock DB 데이터 유지 확인")


# =====================================================
# 테스트 실행
# =====================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
