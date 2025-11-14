"""
Path Optimize 모듈 데이터베이스 모델

사용자 출퇴근 설정, 최적화 이력, 평균 소요시간 통계를 저장합니다.
PostGIS를 활용한 지리공간 데이터 지원.
"""

from datetime import datetime, time
from sqlalchemy import Column, String, Float, Integer, DateTime, Time, JSON, Enum, CheckConstraint
from sqlalchemy.dialects.postgresql import POINT
from geoalchemy2 import Geometry
from app.db.database import Base
import enum


class TransportType(str, enum.Enum):
    """교통수단 타입"""
    BUS = "BUS"
    SUBWAY = "SUBWAY"
    BOTH = "BOTH"


class SystemMode(str, enum.Enum):
    """시스템 모드"""
    COMMUTE = "COMMUTE"  # 출근
    RETREAT = "RETREAT"  # 퇴근
    NEUTRAL = "NEUTRAL"  # 대기


class CommuteSettingsDB(Base):
    """
    사용자 출퇴근 설정 테이블

    각 사용자의 집/회사 위치, 목표 도착 시간, 도보 시간 등을 저장합니다.
    PostGIS Point 타입으로 위치 정보를 저장하여 공간 쿼리 지원.
    """

    __tablename__ = "commute_settings"

    # 기본 정보
    user_id = Column(String(50), primary_key=True, nullable=False, index=True)
    """사용자 ID (고유 식별자)"""

    # 집 위치 정보
    home_address = Column(String(255), nullable=False)
    """집 주소"""

    home_latitude = Column(Float, nullable=False)
    """집 위도"""

    home_longitude = Column(Float, nullable=False)
    """집 경도"""

    # 회사 위치 정보
    work_address = Column(String(255), nullable=False)
    """회사 주소"""

    work_latitude = Column(Float, nullable=False)
    """회사 위도"""

    work_longitude = Column(Float, nullable=False)
    """회사 경도"""

    # 출퇴근 설정
    target_arrival_time = Column(Time, nullable=True)
    """목표 도착 시간 (출근 모드에서만 사용)"""

    first_mile_duration = Column(Integer, default=5, nullable=False)
    """First Mile 도보 시간 (분)"""

    last_mile_duration = Column(Integer, default=7, nullable=False)
    """Last Mile 도보 시간 (분)"""

    preference_routes = Column(JSON, nullable=True)
    """선호 경로 정보 (JSON 형식)"""

    alert_start_time = Column(Time, nullable=True)
    """알림 시작 시간"""

    # 타임스탬프
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    """생성 시간"""

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    """수정 시간"""

    # 제약 조건
    __table_args__ = (
        CheckConstraint("first_mile_duration > 0", name="first_mile_positive"),
        CheckConstraint("last_mile_duration > 0", name="last_mile_positive"),
        CheckConstraint("home_latitude >= -90 AND home_latitude <= 90", name="home_lat_valid"),
        CheckConstraint("home_longitude >= -180 AND home_longitude <= 180", name="home_lon_valid"),
        CheckConstraint("work_latitude >= -90 AND work_latitude <= 90", name="work_lat_valid"),
        CheckConstraint("work_longitude >= -180 AND work_longitude <= 180", name="work_lon_valid"),
    )

    def __repr__(self):
        return f"<CommuteSettings(user_id='{self.user_id}', target_arrival={self.target_arrival_time})>"


class OptimizationHistoryDB(Base):
    """
    경로 최적화 이력 테이블

    사용자가 경로 최적화 서비스를 사용한 기록을 저장합니다.
    추천 경로와 실제 선택 경로, 도착 시간 등을 기록하여 학습 데이터로 활용.
    """

    __tablename__ = "optimization_history"

    # 기본 정보
    id = Column(Integer, primary_key=True, autoincrement=True)
    """이력 ID (자동 증가)"""

    user_id = Column(String(50), nullable=False, index=True)
    """사용자 ID"""

    journey_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    """여정 날짜/시간"""

    # 모드 정보
    mode = Column(String(20), nullable=False)
    """시스템 모드 (COMMUTE: 출근, RETREAT: 퇴근)"""

    # 경로 정보
    suggested_route = Column(JSON, nullable=True)
    """추천 경로 (JSON 형식)
    {
        "pathId": "path_1",
        "totalTime": 1680,  # 초
        "totalDistance": 9494,  # 미터
        "transportModes": ["BUS", "SUBWAY"],
        "transferCount": 1
    }
    """

    selected_route = Column(JSON, nullable=True)
    """사용자가 선택한 경로 (JSON 형식)"""

    # 결과 정보
    actual_arrival_time = Column(DateTime, nullable=True)
    """실제 도착 시간"""

    delay_occurred = Column(Integer, default=0, nullable=False)
    """지연 발생 여부 (0=정상, 분 단위)"""

    feedback = Column(String(255), nullable=True)
    """사용자 피드백"""

    # 타임스탬프
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    """생성 시간"""

    def __repr__(self):
        return f"<OptimizationHistory(user_id='{self.user_id}', mode='{self.mode}', date={self.journey_date})>"


class AverageDurationDB(Base):
    """
    구간별 평균 소요시간 통계 테이블

    대중교통 각 구간의 시간대별, 요일별 평균 소요시간을 저장합니다.
    Logic 3.1 (지연 감지)에서 실시간 소요시간과 비교하는 기준 데이터.
    """

    __tablename__ = "average_duration"

    # 기본 정보
    id = Column(Integer, primary_key=True, autoincrement=True)
    """통계 ID (자동 증가)"""

    segment_id = Column(String(100), nullable=False, index=True)
    """구간 ID (예: "bus_146_강남역-을지로입구")"""

    # 시간대/요일 정보
    departure_hour = Column(Integer, nullable=False)
    """출발 시간대 (0~23)"""

    day_of_week = Column(Integer, nullable=False)
    """요일 (0=월요일, 6=일요일)"""

    # 통계 데이터
    avg_duration_seconds = Column(Integer, nullable=False)
    """평균 소요시간 (초)"""

    sample_count = Column(Integer, default=0, nullable=False)
    """샘플 개수 (신뢰도 지표)"""

    transport_type = Column(String(20), nullable=False)
    """교통수단 타입 (BUS, SUBWAY)"""

    transport_name = Column(String(50), nullable=True)
    """교통수단 이름 (예: "146번", "2호선")"""

    # 구간 정보
    start_station_name = Column(String(100), nullable=True)
    """출발역 이름"""

    end_station_name = Column(String(100), nullable=True)
    """도착역 이름"""

    # 신뢰도 지표
    is_reliable = Column(Integer, default=0, nullable=False)
    """신뢰도 (0=낮음, 1=높음, MIN_SAMPLE_COUNT >= 100)"""

    # 타임스탬프
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    """생성 시간"""

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False, index=True)
    """마지막 업데이트 시간"""

    # 제약 조건
    __table_args__ = (
        CheckConstraint("departure_hour >= 0 AND departure_hour <= 23", name="hour_range_valid"),
        CheckConstraint("day_of_week >= 0 AND day_of_week <= 6", name="day_range_valid"),
        CheckConstraint("avg_duration_seconds > 0", name="duration_positive"),
        CheckConstraint("sample_count >= 0", name="sample_count_non_negative"),
    )

    def __repr__(self):
        return (
            f"<AverageDuration("
            f"segment_id='{self.segment_id}', "
            f"hour={self.departure_hour}, "
            f"dow={self.day_of_week}, "
            f"avg={self.avg_duration_seconds}s, "
            f"samples={self.sample_count}"
            f")>"
        )


# 인덱스 설정 (복합 조건 쿼리 최적화)
from sqlalchemy import Index

# AverageDurationDB 복합 인덱스
Index("ix_avg_duration_composite",
      AverageDurationDB.segment_id,
      AverageDurationDB.departure_hour,
      AverageDurationDB.day_of_week)

# OptimizationHistoryDB 복합 인덱스
Index("ix_optimization_history_composite",
      OptimizationHistoryDB.user_id,
      OptimizationHistoryDB.journey_date)
