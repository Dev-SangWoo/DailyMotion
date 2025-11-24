# DailyMotion 백엔드 작업 진행 요약 (Phase A/B 기준)

> 이 문서는 지금까지 DailyMotion 백엔드(특히 `path_optimize` 모듈)에서 진행한 작업을  
> **한눈에 볼 수 있는 진행 로그**입니다. 자세한 TODO 로드맵은 `TASKS_DAILYMOTION_ROADMAP.md`를 참고하세요.

---

## 1. Phase A – API / 라우터 정리

- OpenAPI 정합성
  - `docs/openapi/v1.yaml`에 Logic 2.x/3.x/4.x 엔드포인트 정의
    - `/context/mode-switch`, `/routes/alternative`, `/seating/optimize`
    - `/exceptions/delays`, `/taxi/suggest`, `/routes/by-goal`, `/polling/frequency`
  - `/users/me/settings/commute`, `/api/v1/health` 등 스펙과 실제 라우트 일치시킴.
  - 쿼리 파라미터를 camelCase(`userId`, `homeAddress`, …)로 통일.

- FastAPI 라우터
  - `server/app/api/v1/path_optimize_router.py`
    - Logic 2.1~4.3 엔드포인트 구현 및 서비스 레이어 연결.
    - `/briefings/commute`, `/briefings/retreat`, `/briefings/retreat-choice` 등 Phase 12 플로우 정리.
    - ODSAY 기반 경로 검색:
      - 좌표가 있으면: `searchPubTransPathT(SX/SY/EX/EY)` 직접 호출.
      - 좌표가 없으면: `searchStation`으로 역/정류장 검색 후 경로 검색.
  - `server/app/api/v1/user_router.py`
    - `PUT /users/me/settings/commute` 구현 (Design-First 스펙 반영).
    - `CommuteSettings` Pydantic 모델을 받아 MockUserDB/DB에 저장.
    - 좌표 필드(`homeLatitude/homeLongitude`, `workLatitude/workLongitude`)도 함께 저장하도록 확장.
  - `server/app/api/v1/health_router.py`
    - `GET /api/v1/health` 추가 → OpenAPI와 실제 라우팅 정합성 확보.

---

## 2. Phase B – DB 전환/연동

- DB 모델 및 전역 스키마
  - `server/app/modules/path_optimize/models/db_models.py`
    - `CommuteSettingsDB` (출퇴근 설정)
    - `AverageDurationDB` (구간별 평균 소요시간 통계)
    - `OptimizationHistoryDB` (경로 최적화 이력)
    - `LastBusScheduleDB` (퇴근 모드 막차 시간표)
  - `server/app/db/models/path_optimize.py`
    - 위 모델들을 `db/models` 레벨에서 재노출하여 프로젝트 전역 스키마 관점으로 정리.

- Alembic 마이그레이션
  - `83d6e363514e_create_initial_schema_for_path_optimize_.py`
    - `average_duration`, `commute_settings`, `optimization_history` 테이블 생성.
  - `4a2f9c7d9b1b_add_last_bus_schedule_table.py`
    - `last_bus_schedule` 테이블 생성.
    - 개발/테스트용 A/B/C 기본 막차 샘플 데이터 시드.

- 레포지토리 / 헬퍼
  - `mock_user_db.py`
    - 출퇴근 설정/퇴근 목표를 관리하는 임시 저장소 + DB 연동 래퍼.
    - 전략:
      - DB 우선 조회, 실패/미존재 시 메모리 Mock fallback.
      - 설정값 `PATH_OPTIMIZE_COMMUTE_DB_ONLY`로 운영(DB-only) / 로컬(Mock 허용) 모드 분리.
    - 출퇴근 설정 저장 시 좌표까지 DB에 저장, 조회 시에도 좌표를 함께 반환.
  - `average_duration_repository.py`
    - Logic 3.1용 평균 소요시간 맵 조회 (`AverageDurationDB` 기반).
  - `optimization_history_repository.py`
    - Logic 1.1/1.2 호출 후 추천 결과를 `OptimizationHistoryDB`에 기록.
  - `last_bus_schedule_repository.py`
    - Logic 1.2 퇴근 모드에서 A/B/C 선택에 따른 막차까지 남은 시간(분) 계산.

---

## 3. Logic별 핵심 개선 (1.1 / 1.2 / 3.1)

- Logic 1.1 – 출근 출발 알림 (`get_commute_briefing`)
  - Door-to-Door 슬랙 계산 수정
    - First Mile + 대중교통 대기 + Transit + Last Mile 모두 포함하여 예상 도착 시간 계산.
  - 추천 교통수단 추출 (`_extract_recommended_transport`)
    - ODSAY 좌표 기반 경로 → 최적 경로(path[0])의 첫 번째 대중교통 구간 선택.
    - 지하철:
      - `subwayCode` / `wayCode` → “N호선 / 상·하행” 정보 생성.
      - 서울시 실시간 지하철 API 연동, 실패 시 통계 → ODSAY 순으로 Fallback.
    - 버스:
      - `busID` / `busNo` 기반 노선 정보 추출.
      - 서울 버스 실시간 API 연동, 실패 시 통계 → ODSAY 순으로 Fallback.
      - 실시간 응답의 `busNumber`를 사용해 `name`/`lineNumber` 정확히 표현.
    - 실패 시 `departureInMinutes`가 기본값 5로 떨어지도록 방어 로직 유지.
  - 로그 강화
    - ODSAY 최적 경로 요약: `totalTimeMinutes`, `busCount`, `subwayCount`, `transferCount` 로깅.

- Logic 1.2 – 마지노선 경고
  - 출근 모드:
    - 슬랙 기준에 따라 `GO_NOW` / `LAST_CHANCE` / `NO_ACTION` 판정.
    - `recommendedTransport.type`에 따라
      - `"SUBWAY"` → “마지막 지하철[…]”
      - `"BUS"` → “마지막 버스[…]”
      - 기타 → “마지막 교통수단[…]”
      로 메시지 문구 분기.
  - 퇴근 모드 (`get_retreat_mode_last_bus_alert`)
    - `userSelectedRoute`(A/B/C) + `LastBusScheduleDB`를 사용해 막차까지 남은 시간 계산.
    - DB에 데이터가 없을 때는 명세서 기본값(A:10/B:30/C:25분)으로 Fallback.
    - 응답은 `alertType=LAST_CHANCE`, “선택하신 [X]의 막차가 N분 뒤입니다.” 형식으로 반환.

- Logic 3.1 – 지연 감지 (`get_exception_alert`)
  - `AverageDurationDB`로부터 구간별 평균 소요시간을 조회하는 레포지토리 도입.
  - DelayDetector 호출 시 `statistical_data_map`으로 전달하여 평균 vs 실시간 비교 기반 지연 감지.
  - 통계가 없는 경우 기존 NO_ACTION/실시간-only 동작 유지.

---

## 4. 테스트 / 문서 / 로드맵 연동

- 테스트 보강
  - 주요 엔드포인트 E2E:
    - `/context/mode-switch`, `/context/routes/alternative`, `/context/polling/frequency` 등.
    - `/briefings/commute`, `/briefings/retreat`, `/briefings/transfer-reminder`.
  - DB 연동 테스트:
    - `CommuteSettingsDB`, `AverageDurationDB`, `OptimizationHistoryDB`에 대한 단위/통합 테스트.
  - Logic 테스트:
    - Logic 1.1/1.2/2.4/3.1 등을 검증하는 기존 테스트가 새로운 DB/실시간 로직과 함께 계속 통과하도록 유지.

- 설계/문서 정리
  - `TASKS_DAILYMOTION_ROADMAP.md`
    - Phase A/B 항목별 체크박스 + “부분 완료/남은 TODO”를 상세 주석으로 기록.
  - `server/docs/USERS_SCHEMA.md`
    - `users`를 기준으로 `commute_settings`, `journeys`, `optimization_history`, `reports`가 어떻게 연결되는지 ERD 수준으로 설명.
  - `server/app/modules/path_optimize/DESIGN.md`, `server/docs/path_optimize/LOGIC_GUIDE.md`
    - 실제 구현과 헌법(v3.0 Logic 명세)을 맞추도록 보완.

---

## 5. 현재 상태 요약 & 다음 단계 힌트

- 현재까지:
  - 출퇴근 설정 저장(주소 + 좌표) → DB/Mock 연동 완료.
  - 좌표 또는 역 이름을 기반으로 ODSAY 경로 검색 → Logic 1.1/1.2/3.1/4.1/4.2/4.3 플로우 대부분 동작.
  - 평균 소요시간/막차/최적화 이력용 테이블과 레포지토리 연결 완료.

- 다음에 집중하면 좋은 것들:
  - 실시간 혼잡도/도로(TPEG)까지 반영한 더 정교한 departureInMinutes/경험 품질 계산.
  - `last_bus_schedule`에 실제 서비스용 막차 데이터 적재 후 완전 DB-only로 전환.
  - React Native 클라이언트에서 주소 지오코딩 후 lat/lng를 채워 넣는 흐름 구현.
  - users 스키마를 실제 인증/회원 시스템과 연결하는 마이그레이션 수행.

