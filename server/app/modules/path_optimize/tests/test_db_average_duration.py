"""
AverageDurationDB 모델 테스트

구간별 평균 소요시간 통계를 저장/조회하는 기능을 테스트합니다.
- CRUD 작업
- 시간대/요일별 조회
- 신뢰도 지표 검증
- 데이터 병합 (샘플 카운트 업데이트)
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.modules.path_optimize.models.db_models import AverageDurationDB


TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def test_db():
    """테스트용 데이터베이스 세션"""
    engine = create_engine(
        TEST_SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    yield db
    db.close()


class TestAverageDurationDB:
    """AverageDurationDB 모델 테스트"""

    def test_create_average_duration(self, test_db):
        """✅ 평균 소요시간 통계 생성"""
        duration = AverageDurationDB(
            segment_id="bus_146_강남역-을지로입구",
            departure_hour=8,
            day_of_week=1,  # 월요일
            avg_duration_seconds=1200,  # 20분
            sample_count=150,
            transport_type="BUS",
            transport_name="146번",
            start_station_name="강남역",
            end_station_name="을지로입구",
            is_reliable=1
        )

        test_db.add(duration)
        test_db.commit()
        test_db.refresh(duration)

        assert duration.segment_id == "bus_146_강남역-을지로입구"
        assert duration.avg_duration_seconds == 1200
        assert duration.sample_count == 150
        assert duration.is_reliable == 1
        print(f"✅ 통계 생성 완료: {duration.segment_id}")

    def test_read_average_duration_by_hour(self, test_db):
        """✅ 시간대별 통계 조회"""
        # 같은 구간, 다른 시간대 데이터
        for hour in range(6, 10):  # 6시~9시
            duration = AverageDurationDB(
                segment_id="bus_146_강남역-을지로입구",
                departure_hour=hour,
                day_of_week=1,
                avg_duration_seconds=1200 + (hour - 6) * 60,  # 시간이 갈수록 +1분
                sample_count=100 + hour * 10,
                transport_type="BUS",
                transport_name="146번"
            )
            test_db.add(duration)

        test_db.commit()

        # 8시 조회
        morning_duration = test_db.query(AverageDurationDB).filter(
            AverageDurationDB.segment_id == "bus_146_강남역-을지로입구",
            AverageDurationDB.departure_hour == 8
        ).first()

        assert morning_duration is not None
        assert morning_duration.avg_duration_seconds == 1200 + 2 * 60  # 22분
        print(f"✅ 시간대별 통계 조회 완료: {morning_duration.avg_duration_seconds}초")

    def test_read_average_duration_by_day_of_week(self, test_db):
        """✅ 요일별 통계 조회"""
        # 같은 구간, 같은 시간, 다른 요일
        for day in range(0, 5):  # 월~금요일
            duration = AverageDurationDB(
                segment_id="bus_146_강남역-을지로입구",
                departure_hour=8,
                day_of_week=day,
                avg_duration_seconds=1200 + day * 30,  # 요일마다 +30초
                sample_count=100,
                transport_type="BUS",
                transport_name="146번"
            )
            test_db.add(duration)

        test_db.commit()

        # 월요일 (0) 조회
        monday = test_db.query(AverageDurationDB).filter(
            AverageDurationDB.day_of_week == 0,
            AverageDurationDB.departure_hour == 8
        ).first()

        # 금요일 (4) 조회
        friday = test_db.query(AverageDurationDB).filter(
            AverageDurationDB.day_of_week == 4,
            AverageDurationDB.departure_hour == 8
        ).first()

        assert monday.avg_duration_seconds == 1200
        assert friday.avg_duration_seconds == 1200 + 4 * 30
        print(f"✅ 요일별 통계 조회 완료: 월={monday.avg_duration_seconds}초, 금={friday.avg_duration_seconds}초")

    def test_update_average_duration_sample_count(self, test_db):
        """✅ 샘플 카운트 업데이트 (데이터 병합)"""
        duration = AverageDurationDB(
            segment_id="bus_146_강남역-을지로입구",
            departure_hour=8,
            day_of_week=1,
            avg_duration_seconds=1200,
            sample_count=100,
            transport_type="BUS",
            transport_name="146번"
        )
        test_db.add(duration)
        test_db.commit()

        # 샘플 추가: 50개의 새로운 샘플, 평균 시간 1250초
        old_avg = duration.avg_duration_seconds
        old_count = duration.sample_count
        new_count = 50
        new_avg = 1250

        # 새로운 평균 계산
        combined_avg = (old_avg * old_count + new_avg * new_count) / (old_count + new_count)

        duration.avg_duration_seconds = int(combined_avg)
        duration.sample_count = old_count + new_count
        test_db.commit()
        test_db.refresh(duration)

        assert duration.sample_count == 150
        assert 1200 < duration.avg_duration_seconds < 1250
        print(f"✅ 샘플 카운트 업데이트 완료: {duration.sample_count}개, 평균 {duration.avg_duration_seconds}초")

    def test_delete_average_duration(self, test_db):
        """✅ 통계 삭제"""
        duration = AverageDurationDB(
            segment_id="bus_146_강남역-을지로입구",
            departure_hour=8,
            day_of_week=1,
            avg_duration_seconds=1200,
            sample_count=100,
            transport_type="BUS",
            transport_name="146번"
        )
        test_db.add(duration)
        test_db.commit()

        # 삭제
        test_db.delete(duration)
        test_db.commit()

        # 검증
        count = test_db.query(AverageDurationDB).count()
        assert count == 0
        print(f"✅ 통계 삭제 완료")

    def test_average_duration_reliability_threshold(self, test_db):
        """✅ 신뢰도 지표 (MIN_SAMPLE_COUNT = 100)"""
        # 샘플 부족 (신뢰도 낮음)
        low_reliability = AverageDurationDB(
            segment_id="bus_146_강남역-을지로입구",
            departure_hour=8,
            day_of_week=1,
            avg_duration_seconds=1200,
            sample_count=50,  # < 100
            transport_type="BUS",
            transport_name="146번",
            is_reliable=0
        )

        # 샘플 충분 (신뢰도 높음)
        high_reliability = AverageDurationDB(
            segment_id="bus_146_강남역-을지로입구",
            departure_hour=8,
            day_of_week=2,
            avg_duration_seconds=1200,
            sample_count=150,  # >= 100
            transport_type="BUS",
            transport_name="146번",
            is_reliable=1
        )

        test_db.add_all([low_reliability, high_reliability])
        test_db.commit()

        # 신뢰도 높은 데이터만 조회
        reliable_data = test_db.query(AverageDurationDB).filter(
            AverageDurationDB.is_reliable == 1,
            AverageDurationDB.segment_id == "bus_146_강남역-을지로입구"
        ).all()

        assert len(reliable_data) == 1
        assert reliable_data[0].sample_count == 150
        print(f"✅ 신뢰도 지표 검증 완료: 신뢰도 높은 데이터 {len(reliable_data)}건")

    def test_average_duration_by_transport_type(self, test_db):
        """✅ 교통수단별 통계 구분"""
        # 버스 데이터
        bus = AverageDurationDB(
            segment_id="bus_146_강남역-을지로입구",
            departure_hour=8,
            day_of_week=1,
            avg_duration_seconds=1200,
            sample_count=100,
            transport_type="BUS",
            transport_name="146번"
        )

        # 지하철 데이터
        subway = AverageDurationDB(
            segment_id="subway_2_강남역-을지로입구",
            departure_hour=8,
            day_of_week=1,
            avg_duration_seconds=900,  # 지하철이 더 빠름
            sample_count=120,
            transport_type="SUBWAY",
            transport_name="2호선"
        )

        test_db.add_all([bus, subway])
        test_db.commit()

        # 교통수단별 조회
        bus_data = test_db.query(AverageDurationDB).filter(
            AverageDurationDB.transport_type == "BUS"
        ).first()

        subway_data = test_db.query(AverageDurationDB).filter(
            AverageDurationDB.transport_type == "SUBWAY"
        ).first()

        assert bus_data.transport_name == "146번"
        assert subway_data.transport_name == "2호선"
        assert bus_data.avg_duration_seconds > subway_data.avg_duration_seconds
        print(f"✅ 교통수단별 통계 구분 완료: 버스={bus_data.avg_duration_seconds}초, 지하철={subway_data.avg_duration_seconds}초")

    def test_average_duration_hour_range_validation(self, test_db):
        """✅ 시간 범위 검증 (0~23)"""
        valid_hours = [0, 6, 12, 18, 23]

        for hour in valid_hours:
            duration = AverageDurationDB(
                segment_id=f"bus_146_hour_{hour}",
                departure_hour=hour,
                day_of_week=1,
                avg_duration_seconds=1200,
                sample_count=100,
                transport_type="BUS"
            )
            test_db.add(duration)

        test_db.commit()

        # 생성된 데이터 확인
        all_data = test_db.query(AverageDurationDB).all()
        assert len(all_data) == len(valid_hours)
        print(f"✅ 시간 범위 검증 완료: {len(all_data)}개 레코드")

    def test_average_duration_day_of_week_range_validation(self, test_db):
        """✅ 요일 범위 검증 (0~6)"""
        day_names = ["월", "화", "수", "목", "금", "토", "일"]

        for day in range(7):
            duration = AverageDurationDB(
                segment_id=f"bus_146_day_{day}",
                departure_hour=8,
                day_of_week=day,
                avg_duration_seconds=1200,
                sample_count=100,
                transport_type="BUS"
            )
            test_db.add(duration)

        test_db.commit()

        all_data = test_db.query(AverageDurationDB).all()
        assert len(all_data) == 7
        print(f"✅ 요일 범위 검증 완료: {len(all_data)}요일")

    def test_average_duration_composite_query(self, test_db):
        """✅ 복합 조건 쿼리 (segment_id + hour + day)"""
        # 데이터 생성: 강남역-을지로입구, 8시, 월요일
        duration = AverageDurationDB(
            segment_id="bus_146_강남역-을지로입구",
            departure_hour=8,
            day_of_week=1,
            avg_duration_seconds=1200,
            sample_count=100,
            transport_type="BUS",
            transport_name="146번"
        )
        test_db.add(duration)
        test_db.commit()

        # 복합 조건으로 조회
        result = test_db.query(AverageDurationDB).filter(
            AverageDurationDB.segment_id == "bus_146_강남역-을지로입구",
            AverageDurationDB.departure_hour == 8,
            AverageDurationDB.day_of_week == 1
        ).first()

        assert result is not None
        assert result.avg_duration_seconds == 1200
        print(f"✅ 복합 조건 쿼리 완료: {result.segment_id} (8시, 월요일)")

    def test_average_duration_timestamp(self, test_db):
        """✅ 타임스탬프 자동 생성"""
        duration = AverageDurationDB(
            segment_id="bus_146_강남역-을지로입구",
            departure_hour=8,
            day_of_week=1,
            avg_duration_seconds=1200,
            sample_count=100,
            transport_type="BUS"
        )

        test_db.add(duration)
        test_db.commit()
        test_db.refresh(duration)

        assert duration.created_at is not None
        assert duration.updated_at is not None
        assert isinstance(duration.created_at, datetime)
        assert isinstance(duration.updated_at, datetime)
        print(f"✅ 타임스탬프 자동 생성 완료")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
