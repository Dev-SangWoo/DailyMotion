"""
여정 모델
PostGIS의 LineString을 사용하여 경로를 저장합니다.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.db.database import Base


class Journey(Base):
    """여정 테이블 모델 (PostGIS LineString 사용)"""
    __tablename__ = "journeys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    path = Column(Geometry("LINESTRING", srid=4326), nullable=False)  # PostGIS LineString
    start_point = Column(Geometry("POINT", srid=4326), nullable=False)  # 시작 지점
    end_point = Column(Geometry("POINT", srid=4326), nullable=False)  # 종료 지점
    distance = Column(String)  # 거리 (미터)
    duration = Column(Integer)  # 소요 시간 (초)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

