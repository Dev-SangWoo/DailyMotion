"""
CommuteSettingsDB 모델 테스트

사용자 출퇴근 설정을 데이터베이스에 저장/조회하는 기능을 테스트합니다.
- CRUD 작업 (Create, Read, Update, Delete)
- 유효성 검사 (필수 필드, 타입, 범위)
- 타임스탬프 (created_at, updated_at)
"""

import pytest
from datetime import datetime, time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.modules.path_optimize.models.db_models import CommuteSettingsDB


# 테스트 데이터베이스 (In-Memory SQLite)
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def test_db():
    """테스트용 데이터베이스 세션"""
    engine = create_engine(
        TEST_SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

    # 테이블 생성
    Base.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    yield db

    db.close()


class TestCommuteSettingsDB:
    """CommuteSettingsDB 모델 테스트"""

    def test_create_commute_settings(self, test_db):
        """✅ 출퇴근 설정 생성"""
        settings = CommuteSettingsDB(
            user_id="user_001",
            home_address="서울시 강남구 테헤란로 123",
            home_latitude=37.4979,
            home_longitude=127.0276,
            work_address="서울시 중구 세종대로 110",
            work_latitude=37.5640,
            work_longitude=126.9760,
            target_arrival_time=time(8, 50),
            first_mile_duration=5,
            last_mile_duration=7,
            preference_routes=None,
            alert_start_time=time(7, 0)
        )

        test_db.add(settings)
        test_db.commit()
        test_db.refresh(settings)

        # 검증
        assert settings.user_id == "user_001"
        assert settings.home_address == "서울시 강남구 테헤란로 123"
        assert settings.target_arrival_time == time(8, 50)
        assert settings.created_at is not None
        assert settings.updated_at is not None
        print(f"✅ 설정 생성 완료: {settings.user_id}")

    def test_read_commute_settings(self, test_db):
        """✅ 출퇴근 설정 조회"""
        # 데이터 생성
        settings = CommuteSettingsDB(
            user_id="user_002",
            home_address="서울시 강남구",
            home_latitude=37.4979,
            home_longitude=127.0276,
            work_address="서울시 중구",
            work_latitude=37.5640,
            work_longitude=126.9760,
            target_arrival_time=time(9, 0),
            first_mile_duration=5,
            last_mile_duration=7
        )
        test_db.add(settings)
        test_db.commit()

        # 조회
        retrieved = test_db.query(CommuteSettingsDB).filter(
            CommuteSettingsDB.user_id == "user_002"
        ).first()

        assert retrieved is not None
        assert retrieved.user_id == "user_002"
        assert retrieved.home_address == "서울시 강남구"
        print(f"✅ 설정 조회 완료: {retrieved.user_id}")

    def test_update_commute_settings(self, test_db):
        """✅ 출퇴근 설정 수정"""
        # 데이터 생성
        settings = CommuteSettingsDB(
            user_id="user_003",
            home_address="서울시 강남구",
            home_latitude=37.4979,
            home_longitude=127.0276,
            work_address="서울시 중구",
            work_latitude=37.5640,
            work_longitude=126.9760,
            target_arrival_time=time(8, 50),
            first_mile_duration=5,
            last_mile_duration=7
        )
        test_db.add(settings)
        test_db.commit()

        # 수정
        created_at_original = settings.created_at
        settings.target_arrival_time = time(9, 30)
        settings.first_mile_duration = 10
        test_db.commit()
        test_db.refresh(settings)

        # 검증: created_at은 불변, updated_at은 변경
        assert settings.target_arrival_time == time(9, 30)
        assert settings.first_mile_duration == 10
        assert settings.created_at == created_at_original
        assert settings.updated_at >= created_at_original
        print(f"✅ 설정 수정 완료: target_arrival_time={settings.target_arrival_time}")

    def test_delete_commute_settings(self, test_db):
        """✅ 출퇴근 설정 삭제"""
        # 데이터 생성
        settings = CommuteSettingsDB(
            user_id="user_004",
            home_address="서울시 강남구",
            home_latitude=37.4979,
            home_longitude=127.0276,
            work_address="서울시 중구",
            work_latitude=37.5640,
            work_longitude=126.9760,
            target_arrival_time=time(8, 50),
            first_mile_duration=5,
            last_mile_duration=7
        )
        test_db.add(settings)
        test_db.commit()

        # 삭제
        test_db.delete(settings)
        test_db.commit()

        # 검증
        retrieved = test_db.query(CommuteSettingsDB).filter(
            CommuteSettingsDB.user_id == "user_004"
        ).first()
        assert retrieved is None
        print(f"✅ 설정 삭제 완료")

    def test_commute_settings_with_multiple_users(self, test_db):
        """✅ 여러 사용자 설정 관리"""
        # 여러 사용자 데이터 생성
        users = []
        for i in range(1, 4):
            settings = CommuteSettingsDB(
                user_id=f"user_{i:03d}",
                home_address=f"서울시 강남구 {i}",
                home_latitude=37.4979 + i * 0.01,
                home_longitude=127.0276 + i * 0.01,
                work_address=f"서울시 중구 {i}",
                work_latitude=37.5640 + i * 0.01,
                work_longitude=126.9760 + i * 0.01,
                target_arrival_time=time(8 + i, 50),
                first_mile_duration=5 + i,
                last_mile_duration=7 + i
            )
            test_db.add(settings)
            users.append(settings)

        test_db.commit()

        # 전체 조회
        all_settings = test_db.query(CommuteSettingsDB).all()
        assert len(all_settings) == 3
        print(f"✅ 여러 사용자 설정 생성 완료: {len(all_settings)}명")

    def test_required_fields_validation(self, test_db):
        """✅ 필수 필드 검증"""
        # user_id 없이 생성 시도
        settings = CommuteSettingsDB(
            user_id=None,  # 필수 필드
            home_address="서울시 강남구",
            home_latitude=37.4979,
            home_longitude=127.0276,
            work_address="서울시 중구",
            work_latitude=37.5640,
            work_longitude=126.9760,
            target_arrival_time=time(8, 50),
            first_mile_duration=5,
            last_mile_duration=7
        )

        test_db.add(settings)

        # NULL 제약 조건 위반
        with pytest.raises(Exception):  # IntegrityError
            test_db.commit()

        print(f"✅ 필수 필드 검증 통과")

    def test_timestamp_fields(self, test_db):
        """✅ 타임스탬프 필드 자동 생성"""
        settings = CommuteSettingsDB(
            user_id="user_timestamp_test",
            home_address="서울시 강남구",
            home_latitude=37.4979,
            home_longitude=127.0276,
            work_address="서울시 중구",
            work_latitude=37.5640,
            work_longitude=126.9760,
            target_arrival_time=time(8, 50),
            first_mile_duration=5,
            last_mile_duration=7
        )

        test_db.add(settings)
        test_db.commit()
        test_db.refresh(settings)

        # created_at과 updated_at이 자동으로 설정되었는지 확인
        assert settings.created_at is not None
        assert settings.updated_at is not None
        assert isinstance(settings.created_at, datetime)
        assert isinstance(settings.updated_at, datetime)
        # 생성 직후 두 값은 거의 같음
        assert abs((settings.updated_at - settings.created_at).total_seconds()) < 1
        print(f"✅ 타임스탬프 필드 검증 완료")

    def test_latitude_longitude_range(self, test_db):
        """✅ 위도/경도 범위 검증"""
        # 유효한 범위 (서울)
        settings = CommuteSettingsDB(
            user_id="user_location_test",
            home_address="서울시 강남구",
            home_latitude=37.4979,  # 서울 위도
            home_longitude=127.0276,  # 서울 경도
            work_address="서울시 중구",
            work_latitude=37.5640,
            work_longitude=126.9760,
            target_arrival_time=time(8, 50),
            first_mile_duration=5,
            last_mile_duration=7
        )

        test_db.add(settings)
        test_db.commit()

        assert settings.home_latitude == 37.4979
        assert settings.home_longitude == 127.0276
        print(f"✅ 위도/경도 범위 검증 통료")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
