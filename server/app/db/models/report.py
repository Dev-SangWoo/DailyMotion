"""
시민 리포트 모델
PostGIS의 Point를 사용하여 위치를 저장합니다.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.db.database import Base


class Report(Base):
    """시민 리포트 테이블 모델 (PostGIS Point 사용)"""
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    location = Column(Geometry("POINT", srid=4326), nullable=False)  # PostGIS Point
    risk_type = Column(String, nullable=False)  # 위험 유형
    description = Column(Text)  # 상세 설명
    status = Column(String, default="pending")  # 처리 상태
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

