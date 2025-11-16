from datetime import time
from typing import Optional, Dict, Any

import logging
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.db.database import get_session_local
from app.modules.path_optimize.models import CommuteSettingsDB

logger = logging.getLogger(__name__)


class MockUserDB:
    """
    출퇴근 설정/퇴근 목표를 관리하는 임시 저장소.

    - PATH_OPTIMIZE_COMMUTE_DB_ONLY = True (운영/스테이징 등)
      → 출퇴근 설정은 항상 DB(commute_settings 테이블) 기반으로만 사용
        (DB 조회 실패/미존재 시 None 반환, 메모리 Mock 사용 안 함)
    - PATH_OPTIMIZE_COMMUTE_DB_ONLY = False (기본, 로컬/테스트)
      → 실제 DB를 우선 사용하고, DB 오류 또는 레코드가 없을 때만
        메모리 기반 Mock 데이터를 fallback 으로 사용
    """

    # 기본 사용자 데이터 (하드코딩)
    _commute_settings: Dict[str, Dict[str, Any]] = {
        "user_001": {
            "homeAddress": "강남역",
            "workAddress": "을지로입구역",
            "targetArrivalTime": time(8, 50),
            "firstMileDefaultDuration": 5,
            "lastMileDefaultDuration": 7,
        },
        "user_002": {
            "homeAddress": "서울 서초구",
            "workAddress": "서울 강남구 테헤란로",
            "targetArrivalTime": time(9, 30),
            "firstMileDefaultDuration": 3,
            "lastMileDefaultDuration": 5,
        },
    }

    # 퇴근 목표 저장소 (현재는 메모리 기반 유지)
    _retreat_choices: Dict[str, str] = {}  # user_id -> choice (A/B/C)

    # ----------------------------------------
    # 내부 헬퍼: DB 세션
    # ----------------------------------------
    @staticmethod
    def _get_db_session():
        try:
            SessionLocal = get_session_local()
            return SessionLocal()
        except Exception as e:
            logger.warning(f"⚠️ DB 세션 초기화 실패, Mock 데이터 사용: {str(e)}")
            return None

    # ----------------------------------------
    # 출퇴근 설정 (CommuteSettings)
    # ----------------------------------------
    @classmethod
    def get_commute_settings(cls, user_id: str) -> Optional[Dict[str, Any]]:
        """
        출근 설정 조회

        - DB-only 모드: DB 조회만 사용, 실패/미존재 시 None 반환
        - 기본 모드: DB 우선, 실패/미존재 시 메모리 Mock fallback
        """
        db = cls._get_db_session()
        if db is not None:
            try:
                row = (
                    db.query(CommuteSettingsDB)
                    .filter(CommuteSettingsDB.user_id == user_id)
                    .first()
                )
                if row:
                    logger.info(f"✅ DB에서 출근 설정 조회: {user_id}")
                    return {
                        "homeAddress": row.home_address,
                        "workAddress": row.work_address,
                        "targetArrivalTime": row.target_arrival_time
                        or cls._commute_settings.get(user_id, {}).get(
                            "targetArrivalTime", time(8, 50)
                        ),
                        "firstMileDefaultDuration": row.first_mile_duration,
                        "lastMileDefaultDuration": row.last_mile_duration,
                    }
            except SQLAlchemyError as e:
                logger.warning(f"⚠️ DB 출근 설정 조회 실패: {str(e)}")
            finally:
                db.close()

        # DB-only 모드에서는 Mock을 전혀 사용하지 않음
        if settings.PATH_OPTIMIZE_COMMUTE_DB_ONLY:
            return None

        return cls._commute_settings.get(user_id)

    @classmethod
    def save_commute_settings(cls, user_id: str, commute_settings: Dict[str, Any]) -> bool:
        """
        출근 설정 저장

        - DB-only 모드: DB 저장만 시도, 실패 시 False 반환 (메모리 미사용)
        - 기본 모드: 메모리에도 저장 + DB 저장 시도 (기존 동작 유지)
        """
        if not commute_settings.get("targetArrivalTime"):
            return False

        # 기본 모드에서는 메모리에도 저장 (테스트/로컬 편의)
        if not settings.PATH_OPTIMIZE_COMMUTE_DB_ONLY:
            cls._commute_settings[user_id] = commute_settings
            logger.info(f"✅ 출근 설정 저장 (메모리): {user_id}")

        # DB 저장 시도
        db = cls._get_db_session()
        if db is not None:
            try:
                row = (
                    db.query(CommuteSettingsDB)
                    .filter(CommuteSettingsDB.user_id == user_id)
                    .first()
                )
                if row is None:
                    row = CommuteSettingsDB(user_id=user_id)

                row.home_address = commute_settings["homeAddress"]
                row.work_address = commute_settings["workAddress"]
                row.target_arrival_time = commute_settings["targetArrivalTime"]
                row.first_mile_duration = commute_settings.get(
                    "firstMileDefaultDuration", 5
                )
                row.last_mile_duration = commute_settings.get(
                    "lastMileDefaultDuration", 7
                )

                # 위치 정보는 아직 없는 상태라, 일단 (0,0)으로 저장
                # 나중에 지오코딩/실제 좌표 연동 시 업데이트
                row.home_latitude = getattr(row, "home_latitude", 0.0) or 0.0
                row.home_longitude = getattr(row, "home_longitude", 0.0) or 0.0
                row.work_latitude = getattr(row, "work_latitude", 0.0) or 0.0
                row.work_longitude = getattr(row, "work_longitude", 0.0) or 0.0

                db.add(row)
                db.commit()
                logger.info(f"✅ 출근 설정 저장 (DB): {user_id}")
            except SQLAlchemyError as e:
                db.rollback()
                logger.warning(f"⚠️ 출근 설정 DB 저장 실패: {str(e)}")
                # DB-only 모드에서는 실패 시 False 반환 (메모리 fallback 없음)
                if settings.PATH_OPTIMIZE_COMMUTE_DB_ONLY:
                    return False
            finally:
                db.close()

        # DB-only 모드인데 DB 세션이 전혀 없으면 저장 실패
        if settings.PATH_OPTIMIZE_COMMUTE_DB_ONLY and db is None:
            logger.warning("⚠️ DB-only 모드에서 DB 세션 없음: 출근 설정 저장 실패")
            return False

        return True

    # ----------------------------------------
    # 퇴근 목표 선택 (Retreat Choice)
    # ----------------------------------------
    @classmethod
    def get_retreat_choice(cls, user_id: str) -> Optional[str]:
        """퇴근 목표 선택 조회 (A/B/C)"""
        return cls._retreat_choices.get(user_id)

    @classmethod
    def save_retreat_choice(cls, user_id: str, choice: str) -> bool:
        """퇴근 목표 선택 저장 (A/B/C)"""
        if choice not in ["A", "B", "C"]:
            return False
        cls._retreat_choices[user_id] = choice
        logger.info(f"✅ 퇴근 목표 저장: {user_id} -> {choice}")
        return True
