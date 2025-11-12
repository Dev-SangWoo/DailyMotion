"""
Phase 1.1: 사용자 설정 데이터 모델 검증 테스트

헌법 준수:
- AGENTS.md 백엔드 헌법 [제5장] 개발 방법론 (TDD/Pytest)
- v3.0 명세서 [필수 사용자 설정] 검증
- 모든 필수/선택 필드 타입 검증
"""
import pytest
from datetime import time
from pydantic import ValidationError
from app.modules.path_optimize.models import (
    CommuteSettings,
    SystemMode,
    TransportType,
    AlertType,
    Location,
    RecommendedTransport,
    BriefingResponse,
    RetreatChoice,
)


class TestCommuteSettingsValidation:
    """사용자 출퇴근 설정 검증 테스트"""

    def test_commute_settings_complete_valid_object(self):
        """
        모든 필드가 유효한 CommuteSettings 객체 생성 성공

        Given:
        - homeAddress: "서울 강남구 역삼동 123-45"
        - workAddress: "서울 중구 을지로 678-90"
        - targetArrivalTime: time(8, 50, 0)
        - firstMileDefaultDuration: 5
        - lastMileDefaultDuration: 7
        - preferenceRoutes: ["최단 시간"]
        - alertStartTime: time(7, 30, 0)

        When: CommuteSettings 객체 생성

        Then:
        - 객체가 정상 생성됨
        - 모든 필드가 설정된 값과 일치
        """
        # Given
        settings_data = {
            "homeAddress": "서울 강남구 역삼동 123-45",
            "workAddress": "서울 중구 을지로 678-90",
            "targetArrivalTime": time(8, 50, 0),
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7,
            "preferenceRoutes": ["최단 시간"],
            "alertStartTime": time(7, 30, 0),
        }

        # When
        settings = CommuteSettings(**settings_data)

        # Then
        assert settings.homeAddress == "서울 강남구 역삼동 123-45"
        assert settings.workAddress == "서울 중구 을지로 678-90"
        assert settings.targetArrivalTime == time(8, 50, 0)
        assert settings.firstMileDefaultDuration == 5
        assert settings.lastMileDefaultDuration == 7
        assert settings.preferenceRoutes == ["최단 시간"]
        assert settings.alertStartTime == time(7, 30, 0)

    def test_commute_settings_with_defaults(self):
        """
        필수 필드만 입력하고 선택 필드는 기본값으로 설정

        Given:
        - homeAddress: "서울 강남구"
        - workAddress: "서울 중구"
        - targetArrivalTime: time(9, 0, 0)

        Then:
        - firstMileDefaultDuration = 5 (기본값)
        - lastMileDefaultDuration = 7 (기본값)
        """
        # Given & When
        settings = CommuteSettings(
            homeAddress="서울 강남구",
            workAddress="서울 중구",
            targetArrivalTime=time(9, 0, 0),
        )

        # Then
        assert settings.firstMileDefaultDuration == 5
        assert settings.lastMileDefaultDuration == 7
        assert settings.preferenceRoutes is None
        assert settings.alertStartTime is None

    def test_commute_settings_home_address_required(self):
        """homeAddress는 필수 필드 (빈 문자열 불가)"""
        with pytest.raises(ValidationError):
            CommuteSettings(
                homeAddress="",  # 빈 문자열
                workAddress="서울 중구",
                targetArrivalTime=time(9, 0, 0),
            )

    def test_commute_settings_work_address_required(self):
        """workAddress는 필수 필드 (빈 문자열 불가)"""
        with pytest.raises(ValidationError):
            CommuteSettings(
                homeAddress="서울 강남구",
                workAddress="",  # 빈 문자열
                targetArrivalTime=time(9, 0, 0),
            )

    def test_commute_settings_target_arrival_time_required(self):
        """targetArrivalTime은 필수 필드"""
        with pytest.raises(ValidationError):
            CommuteSettings(
                homeAddress="서울 강남구",
                workAddress="서울 중구",
                # targetArrivalTime 누락
            )

    def test_commute_settings_target_arrival_time_is_time_object(self):
        """targetArrivalTime은 datetime.time 객체여야 함"""
        # Given
        settings = CommuteSettings(
            homeAddress="서울 강남구",
            workAddress="서울 중구",
            targetArrivalTime=time(8, 50, 0),
        )

        # Then
        assert isinstance(settings.targetArrivalTime, time)

    def test_commute_settings_first_mile_duration_positive(self):
        """firstMileDefaultDuration은 양수여야 함"""
        with pytest.raises(ValidationError):
            CommuteSettings(
                homeAddress="서울 강남구",
                workAddress="서울 중구",
                targetArrivalTime=time(9, 0, 0),
                firstMileDefaultDuration=0,  # 0은 불가
            )

    def test_commute_settings_last_mile_duration_positive(self):
        """lastMileDefaultDuration은 양수여야 함"""
        with pytest.raises(ValidationError):
            CommuteSettings(
                homeAddress="서울 강남구",
                workAddress="서울 중구",
                targetArrivalTime=time(9, 0, 0),
                lastMileDefaultDuration=-1,  # 음수는 불가
            )

    def test_commute_settings_preference_routes_max_3(self):
        """preferenceRoutes는 최대 3개까지만 가능"""
        with pytest.raises(ValidationError):
            CommuteSettings(
                homeAddress="서울 강남구",
                workAddress="서울 중구",
                targetArrivalTime=time(9, 0, 0),
                preferenceRoutes=["A", "B", "C", "D"],  # 4개는 불가
            )

    def test_commute_settings_json_serialization(self):
        """CommuteSettings를 JSON으로 직렬화할 수 있어야 함"""
        # Given
        settings = CommuteSettings(
            homeAddress="서울 강남구",
            workAddress="서울 중구",
            targetArrivalTime=time(9, 0, 0),
        )

        # When
        json_data = settings.model_dump_json()

        # Then
        assert isinstance(json_data, str)
        assert "homeAddress" in json_data

    def test_commute_settings_json_deserialization(self):
        """JSON을 CommuteSettings 객체로 역직렬화할 수 있어야 함"""
        # Given
        json_data = {
            "homeAddress": "서울 강남구",
            "workAddress": "서울 중구",
            "targetArrivalTime": "09:00:00",
        }

        # When
        settings = CommuteSettings(**json_data)

        # Then
        assert settings.homeAddress == "서울 강남구"


class TestSystemModeDefinition:
    """시스템 모드 정의 검증 테스트"""

    def test_system_mode_enum_exists(self):
        """SystemMode Enum이 정의되어 있어야 함"""
        assert hasattr(SystemMode, "COMMUTE")
        assert hasattr(SystemMode, "RETREAT")
        assert hasattr(SystemMode, "NEUTRAL")

    def test_system_mode_commute_mode(self):
        """SystemMode.COMMUTE 모드가 정의되어 있어야 함"""
        assert SystemMode.COMMUTE.value == "COMMUTE"

    def test_system_mode_retreat_mode(self):
        """SystemMode.RETREAT 모드가 정의되어 있어야 함"""
        assert SystemMode.RETREAT.value == "RETREAT"

    def test_system_mode_neutral_mode(self):
        """SystemMode.NEUTRAL 모드가 정의되어 있어야 함"""
        assert SystemMode.NEUTRAL.value == "NEUTRAL"

    def test_system_mode_string_representation(self):
        """SystemMode가 문자열로 변환 가능해야 함"""
        mode = SystemMode.COMMUTE
        assert str(mode.value) == "COMMUTE"

    def test_system_mode_comparison(self):
        """SystemMode 값들을 비교할 수 있어야 함"""
        assert SystemMode.COMMUTE == SystemMode.COMMUTE
        assert SystemMode.COMMUTE != SystemMode.RETREAT


class TestLocationModel:
    """위치 정보 모델 테스트"""

    def test_location_has_address(self):
        """Location 모델이 address 필드를 가져야 함"""
        location = Location(address="서울 강남구")
        assert location.address == "서울 강남구"

    def test_location_has_coordinates(self):
        """Location 모델이 latitude/longitude 필드를 가져야 함 (선택사항)"""
        location = Location(
            address="서울 강남구",
            latitude=37.4979,
            longitude=127.0276,
        )
        assert location.latitude == 37.4979
        assert location.longitude == 127.0276


class TestTransportTypeEnum:
    """교통 수단 타입 Enum 테스트"""

    def test_transport_type_bus(self):
        """TransportType.BUS가 정의되어 있어야 함"""
        assert TransportType.BUS.value == "BUS"

    def test_transport_type_subway(self):
        """TransportType.SUBWAY가 정의되어 있어야 함"""
        assert TransportType.SUBWAY.value == "SUBWAY"

    def test_transport_type_walk(self):
        """TransportType.WALK가 정의되어 있어야 함"""
        assert TransportType.WALK.value == "WALK"

    def test_transport_type_taxi(self):
        """TransportType.TAXI가 정의되어 있어야 함"""
        assert TransportType.TAXI.value == "TAXI"


class TestAlertTypeEnum:
    """알림 타입 Enum 테스트"""

    def test_alert_type_go_now(self):
        """AlertType.GO_NOW가 정의되어 있어야 함"""
        assert AlertType.GO_NOW.value == "GO_NOW"

    def test_alert_type_last_chance(self):
        """AlertType.LAST_CHANCE가 정의되어 있어야 함"""
        assert AlertType.LAST_CHANCE.value == "LAST_CHANCE"

    def test_alert_type_no_action(self):
        """AlertType.NO_ACTION이 정의되어 있어야 함"""
        assert AlertType.NO_ACTION.value == "NO_ACTION"

    def test_alert_type_taxi_required(self):
        """AlertType.TAXI_REQUIRED가 정의되어 있어야 함"""
        assert AlertType.TAXI_REQUIRED.value == "TAXI_REQUIRED"


class TestRecommendedTransport:
    """추천 교통수단 모델 테스트"""

    def test_recommended_transport_basic(self):
        """기본 추천 교통수단 생성"""
        transport = RecommendedTransport(
            type=TransportType.BUS,
            name="123번",
            departureInMinutes=5,
        )
        assert transport.type == TransportType.BUS
        assert transport.name == "123번"
        assert transport.departureInMinutes == 5

    def test_recommended_transport_with_optional_fields(self):
        """선택 필드 포함한 추천 교통수단"""
        transport = RecommendedTransport(
            type=TransportType.BUS,
            name="123번",
            departureInMinutes=5,
            lineNumber="123",
            destination="강남역",
        )
        assert transport.lineNumber == "123"
        assert transport.destination == "강남역"


class TestBriefingResponse:
    """브리핑 응답 모델 테스트"""

    def test_briefing_response_go_now(self):
        """GO_NOW 알림 응답 생성"""
        response = BriefingResponse(
            alertType=AlertType.GO_NOW,
            message="지금 출발하세요",
            recommendedTransport=RecommendedTransport(
                type=TransportType.BUS,
                name="123번",
                departureInMinutes=5,
            ),
        )
        assert response.alertType == AlertType.GO_NOW
        assert response.message == "지금 출발하세요"
        assert response.recommendedTransport is not None
