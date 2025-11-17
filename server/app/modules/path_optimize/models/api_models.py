"""
Phase 1.1: 경로 최적화 모듈의 Pydantic API 모델

헌법 준수:
- AGENTS.md 상호 규약 [제2장] 데이터 교환 (JSON camelCase)
- v3.0 명세서 [필수 사용자 설정]
- OpenAPI 스펙 준수

모델:
1. CommuteSettings: 사용자 출퇴근 설정
2. SystemMode: 시스템 모드 (COMMUTE, RETREAT, NEUTRAL)
3. TransportType: 교통 수단 타입
4. AlertType: 알림 타입
5. Location: 위치 정보
6. RecommendedTransport: 추천 교통수단
"""

from pydantic import BaseModel, Field, validator
from datetime import time, datetime
from enum import Enum
from typing import List, Optional, Union


class SystemMode(str, Enum):
    """시스템 모드 정의"""
    COMMUTE = "COMMUTE"  # 출근 모드 (지각 방지)
    RETREAT = "RETREAT"  # 퇴근 모드 (경험 충족)
    NEUTRAL = "NEUTRAL"  # 중립 모드 (대기)


class TransportType(str, Enum):
    """교통 수단 타입"""
    BUS = "BUS"
    SUBWAY = "SUBWAY"
    WALK = "WALK"
    TAXI = "TAXI"
    UNKNOWN = "UNKNOWN"


class AlertType(str, Enum):
    """알림 타입 정의"""
    GO_NOW = "GO_NOW"              # 지금 출발하세요
    LAST_CHANCE = "LAST_CHANCE"    # 마지노선 경고
    NO_ACTION = "NO_ACTION"         # 조치 필요 없음
    TAXI_REQUIRED = "TAXI_REQUIRED" # 택시 필요
    USER_CHOICE_REQUIRED = "USER_CHOICE_REQUIRED"  # 사용자 선택 필요 (퇴근 모드)


class RetreatChoice(str, Enum):
    """퇴근 모드 사용자 선택"""
    FASTEST = "A"      # 가장 빠르게
    COMFORTABLE = "B"  # 편안하게 (착석)
    USUAL = "C"        # 평소 경로


class UserState(str, Enum):
    """
    사용자 상태 (Context Awareness)

    Phase 2.1: 자동 모드 전환
    GPS 기반 사용자 상태 감지
    """
    WAITING = "WAITING"      # 대기 중 (집/회사 근처, 이동 없음)
    WALKING = "WALKING"      # 도보 중 (First Mile 진행 중)
    ON_TRIP = "ON_TRIP"      # 탑승 중 (버스/지하철 이용 중)
    UNKNOWN = "UNKNOWN"      # 알 수 없음 (GPS 신호 없음)


class Location(BaseModel):
    """위치 정보"""
    address: str = Field(..., description="주소")
    latitude: Optional[float] = Field(None, description="위도")
    longitude: Optional[float] = Field(None, description="경도")

    class Config:
        schema_extra = {
            "example": {
                "address": "서울 강남구 역삼동 123-45",
                "latitude": 37.4979,
                "longitude": 127.0276
            }
        }


class RecommendedTransport(BaseModel):
    """추천 교통수단"""
    type: TransportType = Field(..., description="교통 수단 타입")
    name: str = Field(..., description="교통수단 이름 (예: 123번 버스, 2호선)")
    departureInMinutes: Optional[int] = Field(..., description="출발까지 남은 시간 (분)")
    lineNumber: Optional[str] = Field(None, description="노선 번호")
    destination: Optional[str] = Field(None, description="목적지")

    class Config:
        schema_extra = {
            "example": {
                "type": "BUS",
                "name": "123번",
                "departureInMinutes": 5,
                "lineNumber": "123",
                "destination": "강남역"
            }
        }


class CommuteSettings(BaseModel):
    """
    사용자 출퇴근 설정 (v3.0 명세서 [필수 사용자 설정])

    필수 필드:
    - homeAddress: 출근지 (문 앞)
    - workAddress: 목적지 (문 앞)
    - targetArrivalTime: 목표 도착 시각 (출근 모드 전용)

    선택 필드:
    - firstMileDefaultDuration: First Mile 도보 시간
    - lastMileDefaultDuration: Last Mile 도보 시간
    - preferenceRoutes: 선호 경로
    - alertStartTime: 알림 시작 시각
    """

    # 필수 필드
    homeAddress: str = Field(..., min_length=1, description="출근지 주소 (문 앞)")
    workAddress: str = Field(..., min_length=1, description="목적지 주소 (문 앞)")
    targetArrivalTime: time = Field(..., description="목표 도착 시각 (예: 08:50:00)")

    # 선택 필드 (기본값 포함)
    firstMileDefaultDuration: int = Field(
        default=5,
        ge=1,
        le=60,
        description="First Mile 도보 시간 (분, 기본값: 5분)"
    )
    lastMileDefaultDuration: int = Field(
        default=7,
        ge=1,
        le=60,
        description="Last Mile 도보 시간 (분, 기본값: 7분)"
    )
    preferenceRoutes: Optional[List[str]] = Field(
        default=None,
        description="선호 경로 (예: ['최단 시간', '최소 환승', '착석 선호'])"
    )
    alertStartTime: Optional[time] = Field(
        default=None,
        description="알림 시작 시각 (예: 07:30:00)"
    )
    homeLatitude: Optional[float] = Field(
        default=None,
        description="집 위도"
    )
    homeLongitude: Optional[float] = Field(
        default=None,
        description="집 경도"
    )
    workLatitude: Optional[float] = Field(
        default=None,
        description="회사 위도"
    )
    workLongitude: Optional[float] = Field(
        default=None,
        description="회사 경도"
    )

    @validator("targetArrivalTime", "alertStartTime", pre=True)
    def validate_time_field(cls, v):
        """
        시간 필드 Validator: "HH:MM" 또는 "HH:MM:SS" 문자열을 time 객체로 파싱

        Swagger 호환성을 위해 문자열 입력 허용:
        - "09:00" → time(9, 0)
        - "09:00:00" → time(9, 0, 0)
        - time 객체는 그대로 통과
        """
        if v is None:
            return v
        if isinstance(v, time):
            return v
        if isinstance(v, str):
            # "HH:MM" 또는 "HH:MM:SS" 파싱
            try:
                parts = v.split(":")
                if len(parts) == 2:  # "HH:MM"
                    return time(int(parts[0]), int(parts[1]))
                elif len(parts) == 3:  # "HH:MM:SS"
                    return time(int(parts[0]), int(parts[1]), int(parts[2]))
                else:
                    raise ValueError(f"시간 형식이 잘못되었습니다: {v} (HH:MM 또는 HH:MM:SS 형식)")
            except (ValueError, IndexError) as e:
                raise ValueError(f"시간 파싱 실패: {v} - {str(e)}")
        raise ValueError(f"지원하지 않는 타입: {type(v)} (time 객체 또는 문자열만 가능)")

    @validator("firstMileDefaultDuration", "lastMileDefaultDuration")
    def validate_duration_positive(cls, v):
        """도보 시간은 양수여야 함"""
        if v is not None and v <= 0:
            raise ValueError("도보 시간은 양수여야 합니다 (분 단위)")
        return v

    @validator("preferenceRoutes", pre=True, always=True)
    def validate_preference_routes(cls, v):
        """선호 경로 유효성 검사"""
        if v is None:
            return None
        if not isinstance(v, list):
            raise ValueError("preferenceRoutes는 리스트여야 합니다")
        if len(v) > 3:
            raise ValueError("선호 경로는 최대 3개까지만 지정 가능합니다")
        return v

    class Config:
        populate_by_name = True  # camelCase/snake_case 혼용 허용
        schema_extra = {
            "example": {
                "homeAddress": "서울 강남구 역삼동 123-45",
                "workAddress": "서울 중구 을지로 678-90",
                "targetArrivalTime": "08:50:00",
                "firstMileDefaultDuration": 5,
                "lastMileDefaultDuration": 7,
                "preferenceRoutes": ["최단 시간"],
                "alertStartTime": "07:30:00"
            }
        }


class BriefingResponse(BaseModel):
    """
    출퇴근 브리핑 응답 (OpenAPI 스펙 준수)

    구조:
    {
        "data": {
            "alertType": "GO_NOW" | "LAST_CHANCE" | "NO_ACTION" | "TAXI_REQUIRED",
            "message": "사용자 메시지",
            "totalDurationMinutes": 42,
            "recommendedTransport": { ... }
        }
    }
    """
    alertType: AlertType = Field(..., description="알림 타입")
    message: str = Field(..., description="사용자에게 표시할 메시지")
    totalDurationMinutes: Optional[int] = Field(
        None,
        description="출발지(집)에서 도착지(회사)까지 예상 총 소요시간 (분, Door-to-Door)"
    )
    recommendedTransport: Optional[RecommendedTransport] = Field(
        None,
        description="추천 교통수단"
    )

    class Config:
        schema_extra = {
            "example": {
                "alertType": "GO_NOW",
                "message": "8:50 도착을 위해, 지금 집에서 출발하셔서 5분 뒤 오는 [123번 버스]를 타세요.",
                "totalDurationMinutes": 42,
                "recommendedTransport": {
                    "type": "BUS",
                    "name": "123번",
                    "departureInMinutes": 5
                }
            }
        }


class BriefingResponseWrapper(BaseModel):
    """
    API 응답 래퍼 (OpenAPI 표준화된 응답 구조)

    모든 성공 응답은 { "data": {...} } 형태여야 함
    """
    data: BriefingResponse


class ErrorResponse(BaseModel):
    """
    에러 응답 (OpenAPI 표준화된 에러 구조)

    모든 실패 응답은 { "error": {...} } 형태여야 함
    """
    code: str = Field(..., description="에러 코드 (예: E001)")
    message: str = Field(..., description="에러 메시지")

    class Config:
        schema_extra = {
            "example": {
                "code": "E001",
                "message": "사용자 설정이 유효하지 않습니다"
            }
        }


class ErrorResponseWrapper(BaseModel):
    """에러 응답 래퍼"""
    error: ErrorResponse


class GPSData(BaseModel):
    """
    실시간 GPS 데이터 (Phase 2.1: 자동 모드 전환)

    사용자의 현재 위치 정보
    """
    latitude: float = Field(..., description="현재 위도")
    longitude: float = Field(..., description="현재 경도")
    accuracy: Optional[float] = Field(None, description="GPS 정확도 (미터)")
    timestamp: Optional[str] = Field(None, description="데이터 수집 시간")

    class Config:
        schema_extra = {
            "example": {
                "latitude": 37.4979,
                "longitude": 127.0276,
                "accuracy": 5.0,
                "timestamp": "2025-01-15T07:30:00Z"
            }
        }


class UserContextData(BaseModel):
    """
    사용자 컨텍스트 정보 (Phase 2.1: 자동 모드 전환)

    GPS 위치 + 설정 정보를 조합하여 사용자 상태 추론
    """
    currentGPS: GPSData = Field(..., description="현재 GPS 위치")
    commute_settings: CommuteSettings = Field(..., description="사용자 출퇴근 설정")
    mode: SystemMode = Field(..., description="현재 시스템 모드 (COMMUTE/RETREAT)")

    class Config:
        schema_extra = {
            "example": {
                "currentGPS": {
                    "latitude": 37.4979,
                    "longitude": 127.0276,
                    "accuracy": 5.0
                },
                "commute_settings": {
                    "homeAddress": "서울 강남구 역삼동",
                    "workAddress": "서울 중구 을지로",
                    "targetArrivalTime": "08:50:00",
                    "firstMileDefaultDuration": 5,
                    "lastMileDefaultDuration": 7,
                    "homeLatitude": 37.4979,
                    "homeLongitude": 127.0276,
                    "workLatitude": 37.5662,
                    "workLongitude": 126.9778
                },
                "mode": "COMMUTE"
            }
        }


class ContextAwarenessResult(BaseModel):
    """
    Context Awareness 감지 결과 (Phase 2.1)

    사용자의 현재 상태, 탑승 중인 교통수단, 예상 도착 시간
    """
    state: UserState = Field(..., description="사용자 상태 (WAITING/WALKING/ON_TRIP)")
    currentVehicle: Optional[TransportType] = Field(None, description="탑승 중인 교통수단")
    distanceToWork: float = Field(..., description="현재 위치에서 직장까지 거리 (미터)")
    estimatedArrivalTime: Optional[str] = Field(None, description="직장 도착 예정 시간")
    estimatedMinutes: Optional[int] = Field(None, description="도착까지 예상 시간 (분)")
    screenSwitchNeeded: bool = Field(False, description="화면 전환 필요 여부")
    switchMessage: Optional[str] = Field(None, description="화면 전환 메시지")

    class Config:
        schema_extra = {
            "example": {
                "state": "ON_TRIP",
                "currentVehicle": "BUS",
                "distanceToWork": 2500,
                "estimatedArrivalTime": "08:45:00",
                "estimatedMinutes": 15,
                "screenSwitchNeeded": True,
                "switchMessage": "탑승 감지! 직장 도착까지 약 15분 남았습니다."
            }
        }


class ScreenSwitchResponse(BaseModel):
    """
    화면 자동 전환 응답 (Phase 2.1)

    탑승 감지 시 클라이언트에 반환되는 응답
    """
    action: str = Field(..., description="수행할 액션 (AUTO_SWITCH_TO_ETA)")
    destinationArrivalTime: str = Field(..., description="목적지 도착 예정 시간")
    estimatedMinutes: int = Field(..., description="도착까지 예상 시간 (분)")
    currentLocation: dict = Field(..., description="현재 위치")
    destination: dict = Field(..., description="목적지 정보")

    class Config:
        schema_extra = {
            "example": {
                "action": "AUTO_SWITCH_TO_ETA",
                "destinationArrivalTime": "08:45:00",
                "estimatedMinutes": 15,
                "currentLocation": {
                    "latitude": 37.4979,
                    "longitude": 127.0276
                },
                "destination": {
                    "address": "서울 중구 을지로 678-90",
                    "latitude": 37.5662,
                    "longitude": 126.9778
                }
            }
        }
