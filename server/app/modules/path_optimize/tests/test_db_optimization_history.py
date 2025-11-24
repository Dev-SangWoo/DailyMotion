"""
OptimizationHistoryDB 모델 테스트

사용자의 경로 최적화 이력을 저장/조회하는 기능을 테스트합니다.
- CRUD 작업
- 이력 검색 (사용자별, 날짜별)
- JSON 데이터 저장
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.modules.path_optimize.models.db_models import OptimizationHistoryDB


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


class TestOptimizationHistoryDB:
    """OptimizationHistoryDB 모델 테스트"""

    def test_create_optimization_history(self, test_db):
        """✅ 최적화 이력 생성"""
        history = OptimizationHistoryDB(
            user_id="user_001",
            journey_date=datetime(2025, 11, 14, 8, 0),
            mode="COMMUTE",
            suggested_route={
                "pathId": "path_1",
                "totalTime": 1680,  # 28분
                "totalDistance": 9494,
                "transportModes": ["BUS", "SUBWAY"],
                "transferCount": 1
            },
            selected_route={
                "pathId": "path_1",
                "totalTime": 1680,
                "totalDistance": 9494,
                "transportModes": ["BUS", "SUBWAY"],
                "transferCount": 1
            },
            actual_arrival_time=datetime(2025, 11, 14, 8, 28),
            delay_occurred=0,
            feedback="좋음"
        )

        test_db.add(history)
        test_db.commit()
        test_db.refresh(history)

        assert history.user_id == "user_001"
        assert history.mode == "COMMUTE"
        assert history.delay_occurred == 0
        assert history.suggested_route["totalTime"] == 1680
        print(f"✅ 이력 생성 완료: {history.user_id}")

    def test_read_optimization_history_by_user(self, test_db):
        """✅ 사용자별 이력 조회"""
        # 여러 이력 생성
        for i in range(3):
            history = OptimizationHistoryDB(
                user_id="user_001",
                journey_date=datetime(2025, 11, 14) + timedelta(days=i),
                mode="COMMUTE" if i % 2 == 0 else "RETREAT",
                suggested_route={"pathId": f"path_{i}"},
                delay_occurred=0
            )
            test_db.add(history)

        test_db.commit()

        # 조회
        user_histories = test_db.query(OptimizationHistoryDB).filter(
            OptimizationHistoryDB.user_id == "user_001"
        ).all()

        assert len(user_histories) == 3
        print(f"✅ 사용자별 이력 조회 완료: {len(user_histories)}건")

    def test_read_optimization_history_by_date_range(self, test_db):
        """✅ 날짜 범위로 이력 조회"""
        base_date = datetime(2025, 11, 14)

        # 이력 생성 (7일간)
        for i in range(7):
            history = OptimizationHistoryDB(
                user_id="user_001",
                journey_date=base_date + timedelta(days=i),
                mode="COMMUTE",
                delay_occurred=0
            )
            test_db.add(history)

        test_db.commit()

        # 3일 범위 조회
        start_date = base_date + timedelta(days=2)
        end_date = base_date + timedelta(days=4)

        histories = test_db.query(OptimizationHistoryDB).filter(
            OptimizationHistoryDB.journey_date >= start_date,
            OptimizationHistoryDB.journey_date <= end_date
        ).all()

        assert len(histories) == 3
        print(f"✅ 날짜 범위 조회 완료: {len(histories)}건")

    def test_update_optimization_history(self, test_db):
        """✅ 이력 수정"""
        history = OptimizationHistoryDB(
            user_id="user_001",
            journey_date=datetime(2025, 11, 14),
            mode="COMMUTE",
            delay_occurred=0
        )
        test_db.add(history)
        test_db.commit()

        # 수정: 지연 시간 기록
        history.actual_arrival_time = datetime(2025, 11, 14, 9, 0)
        history.delay_occurred=10  # 10분 지연
        history.feedback = "지연 발생"
        test_db.commit()
        test_db.refresh(history)

        assert history.delay_occurred == 10
        assert history.feedback == "지연 발생"
        print(f"✅ 이력 수정 완료: delay_occurred={history.delay_occurred}")

    def test_delete_optimization_history(self, test_db):
        """✅ 이력 삭제"""
        history = OptimizationHistoryDB(
            user_id="user_001",
            journey_date=datetime(2025, 11, 14),
            mode="COMMUTE"
        )
        test_db.add(history)
        test_db.commit()

        # 삭제
        test_db.delete(history)
        test_db.commit()

        # 검증
        count = test_db.query(OptimizationHistoryDB).count()
        assert count == 0
        print(f"✅ 이력 삭제 완료")

    def test_optimization_history_mode_values(self, test_db):
        """✅ 모드별 이력 구분"""
        # COMMUTE 모드
        commute_history = OptimizationHistoryDB(
            user_id="user_001",
            journey_date=datetime(2025, 11, 14, 8, 0),
            mode="COMMUTE"
        )

        # RETREAT 모드
        retreat_history = OptimizationHistoryDB(
            user_id="user_001",
            journey_date=datetime(2025, 11, 14, 18, 0),
            mode="RETREAT"
        )

        test_db.add(commute_history)
        test_db.add(retreat_history)
        test_db.commit()

        # 모드별 조회
        commute_count = test_db.query(OptimizationHistoryDB).filter(
            OptimizationHistoryDB.mode == "COMMUTE"
        ).count()

        retreat_count = test_db.query(OptimizationHistoryDB).filter(
            OptimizationHistoryDB.mode == "RETREAT"
        ).count()

        assert commute_count == 1
        assert retreat_count == 1
        print(f"✅ 모드별 이력 구분 완료: COMMUTE={commute_count}, RETREAT={retreat_count}")

    def test_optimization_history_json_data(self, test_db):
        """✅ JSON 데이터 저장/조회"""
        suggested_route = {
            "pathId": "path_1",
            "totalTime": 1680,
            "totalDistance": 9494,
            "transportModes": ["BUS", "SUBWAY"],
            "transferCount": 1,
            "fare": 1450
        }

        history = OptimizationHistoryDB(
            user_id="user_001",
            journey_date=datetime(2025, 11, 14),
            mode="COMMUTE",
            suggested_route=suggested_route
        )

        test_db.add(history)
        test_db.commit()
        test_db.refresh(history)

        # JSON 데이터 검증
        assert history.suggested_route["pathId"] == "path_1"
        assert history.suggested_route["totalTime"] == 1680
        assert len(history.suggested_route["transportModes"]) == 2
        assert history.suggested_route["fare"] == 1450
        print(f"✅ JSON 데이터 저장/조회 완료")

    def test_optimization_history_delay_tracking(self, test_db):
        """✅ 지연 추적"""
        histories = [
            OptimizationHistoryDB(
                user_id="user_001",
                journey_date=datetime(2025, 11, 14, 8, 0),
                mode="COMMUTE",
                delay_occurred=0  # 정상
            ),
            OptimizationHistoryDB(
                user_id="user_001",
                journey_date=datetime(2025, 11, 15, 8, 0),
                mode="COMMUTE",
                delay_occurred=5  # 5분 지연
            ),
            OptimizationHistoryDB(
                user_id="user_001",
                journey_date=datetime(2025, 11, 16, 8, 0),
                mode="COMMUTE",
                delay_occurred=15  # 15분 지연
            ),
        ]

        test_db.add_all(histories)
        test_db.commit()

        # 지연 통계
        all_histories = test_db.query(OptimizationHistoryDB).all()
        total_delay = sum(h.delay_occurred for h in all_histories)
        avg_delay = total_delay / len(all_histories)

        assert len(all_histories) == 3
        assert total_delay == 20
        assert avg_delay == 20 / 3
        print(f"✅ 지연 추적 완료: 총 지연={total_delay}분, 평균={avg_delay:.1f}분")

    def test_optimization_history_timestamp(self, test_db):
        """✅ 타임스탬프 자동 생성"""
        history = OptimizationHistoryDB(
            user_id="user_001",
            journey_date=datetime(2025, 11, 14),
            mode="COMMUTE"
        )

        test_db.add(history)
        test_db.commit()
        test_db.refresh(history)

        assert history.created_at is not None
        assert isinstance(history.created_at, datetime)
        print(f"✅ 타임스탬프 자동 생성 완료")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
