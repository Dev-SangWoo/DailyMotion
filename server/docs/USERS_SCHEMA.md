# USERS 스키마 설계 메모

> 목적: DailyMotion v3.0에서 **사용자(User)** 를 기준으로  
> 출퇴근 설정, 여정(Journey), 최적화 이력 등을 어떻게 연결할지 정의한다.

이 문서는 **최종 DB 구조를 강제하는 스펙**이라기보다는,  
현재 구현 + 향후 확장 방향을 이해하기 위한 **설계 메모**입니다.

---

## 1. 최상단 엔티티: `users`

소스: `server/app/db/models/user.py`

- `users`
  - `id` (PK, int) – 내부 시스템용 사용자 ID
  - `email`, `name`, `hashed_password`, `is_active`
  - `created_at`, `updated_at`
  - (향후) `external_id` (str, optional)
    - 예: 모바일 클라이언트에서 사용하는 `"user_001"` 같은 식별자 매핑용
  - (향후) 전역 사용자 설정
    - `default_commute_mode` (COMMUTE/RETREAT/NEUTRAL)
    - `default_retreat_goal` (A/B/C)
    - `notification_enabled` (bool) 등

**역할**  
모든 도메인(출퇴근 최적화, 위험 리포트, AI 패턴 등)이 공통으로 참조하는 “뿌리” 엔티티.

---

## 2. 출퇴근 설정: `commute_settings` (1:1)

소스: `CommuteSettingsDB`  
`server/app/modules/path_optimize/models/db_models.py`  
전역 노출: `server/app/db/models/path_optimize.py`

- `commute_settings`
  - `user_id` (PK, FK → `users.id` 를 목표로 함)  
    - 현재는 문자열 기반(`"user_001"`)이지만,  
      최종적으로는 `users.id`와 타입/FK를 맞추는 것이 목표.
  - `home_address`, `home_latitude`, `home_longitude`
  - `work_address`, `work_latitude`, `work_longitude`
  - `target_arrival_time`
  - `first_mile_duration`, `last_mile_duration`
  - `preference_routes` (JSON)
  - `alert_start_time`
  - `created_at`, `updated_at`

**관계**  
- `users (1) ─── (1) commute_settings`  
  한 유저당 하나의 출퇴근 설정 레코드를 갖는 것을 기본 가정으로 한다.

**사용처**  
- Logic 1.1/1.2/2.1/4.1/4.2 등 출퇴근 관련 모든 로직의 기본 입력.
- `/users/me/settings/commute`, `/briefings/commute-settings` 등에서 읽기/저장.

---

## 3. 여정: `journeys` (1:N)

소스: `Journey`  
`server/app/db/models/user.py`

- `journeys`
  - `id` (PK)
  - `user_id` (FK → `users.id`)
  - `path` (PostGIS `LINESTRING`)
  - `start_point`, `end_point` (PostGIS `POINT`)
  - `distance` (string)
  - `duration` (int, seconds)
  - `created_at`
  - (향후) `mode` (COMMUTE/RETREAT)
  - (향후) `goal_choice` (A/B/C) – 퇴근 목표와의 연결

**관계**
- `users (1) ─── (N) journeys`

**사용처 (계획)**  
- E2E 출퇴근 여정 기록 및 시각화.  
- AI 패턴 분석(`ai_pattern`)에서 학습 데이터로 활용 예정.

---

## 4. 최적화 이력: `optimization_history` (1:N)

소스: `OptimizationHistoryDB`  
`server/app/modules/path_optimize/models/db_models.py`  
전역 노출: `server/app/db/models/path_optimize.py`

- `optimization_history`
  - `id` (PK)
  - `user_id` (FK → `users.id` 를 목표로 함, 현재는 문자열 기반)
  - (향후) `journey_id` (nullable FK → `journeys.id`)
  - `mode` (COMMUTE / RETREAT / NEUTRAL)
  - `suggested_route` (JSON)
  - `selected_route` (JSON)
  - `actual_arrival_time`
  - `delay_occurred` (int, minutes)
  - `feedback` (string)
  - `created_at`

**관계 (목표 구조)**  
- `users (1) ─── (N) optimization_history`  
- `journeys (1) ─── (N) optimization_history` (선택)

**현재 구현 상태**  
- Logic 1.1/1.2 실행 후 “추천 결과(suggested_route)”를 이력으로 저장하는 1차 연결 완료.  
- 사용자가 실제로 어떤 경로를 탔는지(selected_route), 실제 도착 시간, 지연 여부는  
  추후 프론트엔드/추적 로직 추가 시 확장 예정.

---

## 5. 리포트: `reports` (1:N)

소스: `Report`  
`server/app/db/models/user.py`

- `reports`
  - `id` (PK)
  - `reporter_id` (FK → `users.id`)
  - `location` (PostGIS `POINT`)
  - `risk_type`, `description`, `status`
  - `created_at`, `updated_at`

**관계**
- `users (1) ─── (N) reports`

**사용처**  
- `risk_manage` 모듈에서 시민 리포트 기반 위험 구간 관리에 활용.

---

## 6. 전역 통계/막차 테이블 (유저와 직접 FK 없음)

소스: `AverageDurationDB`, `LastBusScheduleDB`  
`server/app/modules/path_optimize/models/db_models.py`

- `average_duration` (구간별/시간대별 평균 소요시간)
  - Logic 3.1 지연 감지의 “통계 기준선” 역할.
- `last_bus_schedule` (막차 시간표)
  - Logic 1.2 퇴근 모드 막차 알림에서 사용.

이 두 테이블은 **특정 유저에 귀속되지 않는 전역 데이터**로 설계되어 있으며,  
FK 없이 별도로 두고 `user_id`와 상관없이 참조하는 구조를 유지한다.

---

## 7. 향후 마이그레이션/정리 방향 요약

1. `CommuteSettingsDB.user_id` / `OptimizationHistoryDB.user_id`를  
   최종적으로는 `users.id` 타입/FK와 맞추는 마이그레이션 수행.
2. 필요하다면 `Journey`와 `OptimizationHistory`를 `journey_id`로 연결하여  
   “어떤 여정에서 어떤 추천/선택/지연이 있었는지”를 추적 가능하게 확장.
3. 출퇴근 목표/모드(예: 퇴근 목표 A/B/C, 기본 모드)는
   - 전역 기본값은 `users` 테이블에,  
   - 세부 설정은 `commute_settings`에 두는 2단계 구조를 유지.

이 설계를 기준으로, 추후 인증/회원 시스템이 붙을 때  
ID 타입/FK만 변경해도 전체 데이터 모델이 자연스럽게 이어지도록 하는 것을 목표로 한다.

