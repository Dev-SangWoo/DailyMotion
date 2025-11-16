"""
Path Optimize 모듈 관련 전역 DB 모델 집합.

이 파일은 `server/app/db/models/` 레벨에서 경로 최적화용 테이블을
한 눈에 볼 수 있도록 묶어 두는 어댑터입니다.

- `segment_statistics`  → `AverageDurationDB`   (테이블명: `average_duration`)
- `route_history`       → `OptimizationHistoryDB` (테이블명: `optimization_history`)
- `commute_settings`    → `CommuteSettingsDB`  (테이블명: `commute_settings`)
- `last_bus_schedule`   → `LastBusScheduleDB`  (테이블명: `last_bus_schedule`)

실제 SQLAlchemy 모델 정의는 Path Optimize 모듈 내부
`app.modules.path_optimize.models.db_models` 에 존재하며,
여기서는 프로젝트 전역 스키마 관점에서 “공용 DB 모델”로 재노출만 합니다.
다른 모듈(ai_pattern, risk_manage 등)에서 경로 통계/이력 데이터를
참조할 때는 이 모듈을 import해서 사용하는 것을 권장합니다.
"""

from app.modules.path_optimize.models.db_models import (
    CommuteSettingsDB,
    OptimizationHistoryDB,
    AverageDurationDB,
    LastBusScheduleDB,
)

__all__ = [
    "CommuteSettingsDB",
    "OptimizationHistoryDB",
    "AverageDurationDB",
    "LastBusScheduleDB",
]

