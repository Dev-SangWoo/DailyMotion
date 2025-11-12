"""
Phase 1.1: 경로 최적화 모듈의 데이터 모델

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
from datetime import time
from enum import Enum
from typing import List, Optional


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
    departureInMinutes: int = Field(..., description="출발까지 남은 시간 (분)")
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
            "recommendedTransport": { ... }
        }
    }
    """
    alertType: AlertType = Field(..., description="알림 타입")
    message: str = Field(..., description="사용자에게 표시할 메시지")
    recommendedTransport: Optional[RecommendedTransport] = Field(
        None,
        description="추천 교통수단"
    )

    class Config:
        schema_extra = {
            "example": {
                "alertType": "GO_NOW",
                "message": "8:50 도착을 위해, 지금 집에서 출발하셔서 5분 뒤 오는 [123번 버스]를 타세요.",
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
