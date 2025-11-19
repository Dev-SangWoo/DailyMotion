# 데일리모션 v3.0 완료를 위한 작업 목록

> 목적: DailyMotion 백엔드/전체 시스템을 “완벽하게” 만들기 위한 실행 가능한 TODO 리스트  
> 범위: Logic 1.1 ~ 4.3, 실시간 데이터, DB, 프론트엔드, AI 모듈까지 전체 로드맵 정리

---

## 0. 메타 / 품질 가드

- [ ] AGENTS.md 헌법과 OpenAPI 스펙(v1.yaml)을 항상 SSOT로 유지할 것 *(지속 과제 – 매 변경 시 점검 필요)*
- [x] 새 기능/변경 시: **스펙 → 서비스 → 라우터 → 테스트(E2E)** 순서로 작업 *(Logic 2.1~4.3 엔드포인트 구현 시 준수)*
- [ ] 테스트 스위트 정기 실행 (unit + integration + E2E) 및 실패 케이스 정리 *(CI/운영 환경에서 지속 실행 필요)*

---

## 1. Phase A – API 엔드포인트 완성 (Critical)

### 1-1. 누락된 핵심 엔드포인트 추가 (path_optimize 중심)

- [ ] OpenAPI에 Logic 2.x / 3.x / 4.x 엔드포인트 추가  
  - [x] `GET /context/mode-switch` → `get_auto_mode_switch_action()`
  - [x] `POST /routes/alternative` → `get_alternative_route_suggestion()`
  - [x] `GET /seating/optimize` → `get_seating_optimization()`
  - [x] `GET /exceptions/delays` → `get_exception_alert()`
  - [x] `POST /taxi/suggest` → `get_taxi_suggestion()`
  - [x] `GET /routes/by-goal` → `get_routes_by_retreat_goal()`
  - [x] `GET /polling/frequency` → `get_smart_polling_frequency()`

- [ ] `server/app/api/v1/path_optimize_router.py`에 대응 라우트 구현
  - [x] Logic 2.1 `/context/mode-switch` 라우트 추가
  - [x] Logic 2.2 `/context/routes/alternative` 라우트 추가
  - [x] Logic 2.3 `/context/seating/optimize` 라우트 추가
  - [x] Logic 3.1 `/context/exceptions/delays` 라우트 추가
  - [x] Logic 3.2 `/context/taxi/suggest` 라우트 추가
  - [x] Logic 4.2 `/context/routes/by-goal` 라우트 추가
  - [x] Logic 4.3 `/context/polling/frequency` 라우트 추가
  - [ ] 응답 Envelope(`Envelope[T]`) 구조 준수 검증
  - [ ] HTTPException → 에러 Envelope로 변환되는지 확인

- [ ] 각 엔드포인트별 테스트 추가
  - [x] Logic 2.1 `/context/mode-switch` E2E 테스트 추가
  - [x] Logic 2.2 `/context/routes/alternative` E2E 테스트 추가
  - [x] Logic 4.3 `/context/polling/frequency` E2E 테스트 추가
  - [ ] 단위 테스트: 서비스 메서드 호출/검증 (필요 시 보강)

### 1-2. 기존 스펙 ↔ 라우터 불일치 정리

- [x] `/health`  
  - [x] 스펙 상 `/api/v1/health` vs 실제 `/health` → `GET /api/v1/health` 라우트 추가로 정합성 확보 (루트 `/health`는 Kubernetes 용으로 유지)

- [ ] 출퇴근 설정 API 정리  
  - [x] 스펙: `PUT /users/me/settings/commute` 구현 (Users 도메인 기준 저장 API)  
        ↳ `user_router.py`에서 `CommuteSettings` Pydantic 모델 + Envelope 응답(`CommuteSettingsSaveResult`)로 정리,  
          좌표 필드(home/work lat/lng)까지 함께 저장하도록 구현.
  - [ ] `/briefings/commute-settings` → 점진적 deprecate: 저장은 Users API 사용, 조회/Phase 12 테스트는 유지 (DB 전환 시 통합)

- [ ] 쿼리 파라미터 이름 정합성  
  - [x] 스펙/라우터/테스트를 모두 camelCase 쿼리 파라미터(`userId`, `homeAddress`, ...)로 통일  
  - [ ] 나머지 모듈(ai_pattern, risk_manage 등)에 대해서도 동일 원칙 적용 여부 검토  
        ↳ `risk_manage_router.py`에 대해는 camelCase(`riskType`, `reporterId`, `minLat` 등)로 맞춰 둔 상태.  
          ai_pattern 모듈은 아직 비활성화 가능성이 있어 보류.

- [ ] `ai_pattern`, `risk_manage`, `users` 라우터  
  - [ ] 스펙에 노출할 API 목록 정의  
        ↳ Users: `/users/me/settings/commute`를 외부 공개 API로 채택, 나머지 `/users` 관련 엔드포인트는 mock/내부용.  
        ↳ RiskManage: `/risk-manage/report`, `/risk-manage/reports`, `/risk-manage/risk-zones`를 외부 공개 API 후보로 정리 (스펙 반영은 추후).  
  - [x] service 레이어(`risk_manage.service`, Users 측 MockUserDB)와 실제로 연결  
        ↳ `risk_manage_router.py`에서 `RiskManageService`의 `create_report/get_reports/get_risk_zones` 호출,  
          `user_router.py`에서 `MockUserDB.save_commute_settings`를 통해 CommuteSettingsDB와 연동.  
          ai_pattern 라우터는 모듈 미개발 가능성 때문에 아직 보류.  
  - [ ] 필요 없거나 내부용인 엔드포인트는 스펙에서 제외 or `/internal` 네임스페이스로 분리

---

## 2. Phase B – DB 전환 (Important)

- [ ] PostgreSQL + PostGIS 스키마 설계
  - [ ] `users` 테이블: 출퇴근 설정, 모드, 선호 경로 등
  - [x] `segment_statistics` 테이블: 구간별/시간대별 평균 소요시간  
        ↳ PathOptimize 모듈 기준으로 `AverageDurationDB` (테이블명 `average_duration`) 설계 + Alembic 마이그레이션 완료.  
        ↳ 프로젝트 전역 스키마 관점에서의 문서화/다른 모듈 연동은 아직.
  - [x] `route_history` 테이블: 출퇴근/퇴근 경로 이력  
        ↳ PathOptimize 모듈 기준으로 `OptimizationHistoryDB` (테이블명 `optimization_history`) 설계 + 마이그레이션 완료,  
          Logic 1.1/1.2 실행 시 추천 결과를 이력으로 저장하는 헬퍼까지 1차 연결 완료.
  - [x] `last_bus_schedule` 테이블: 막차 시간표  
        ↳ `LastBusScheduleDB` 모델 및 `last_bus_schedule_repository` 설계 완료,  
          Logic 1.2 퇴근 모드에서 DB 조회 + 하드코딩 fallback 구조까지 구현.  
          Alembic 마이그레이션(`4a2f9c7d9b1b_add_last_bus_schedule_table`)으로 테이블 생성 +  
          A/B/C 기본 막차 시간 샘플 데이터(개발/테스트용)까지 적재.  
          실제 서비스용 상세 시간표 데이터는 향후 별도 적재 필요.

- [ ] SQLAlchemy 모델 구현 (`server/app/db/models/`)
  - [x] users, journey, report 외에 통계/시간표 관련 모델 추가  
        ↳ 통계/막차/출퇴근 설정 모델은 PathOptimize 모듈 내부의  
          `server/app/modules/path_optimize/models/db_models.py`에서 정의되며,  
          `server/app/db/models/path_optimize.py`에서 프로젝트 전역 스키마 관점의  
          공용 DB 모델로 재노출(CommuteSettingsDB, AverageDurationDB, OptimizationHistoryDB, LastBusScheduleDB).
  - [x] Alembic 마이그레이션 스크립트 작성  
        ↳ `83d6e363514e_create_initial_schema_for_path_optimize_.py`에 `average_duration`, `commute_settings`, `optimization_history` 포함.  
          `last_bus_schedule`용 마이그레이션은 아직 미작성.

- [ ] Mock 데이터 제거/치환
  - [ ] `MockUserDB` → 실제 DB 조회/저장 코드로 교체  
        ↳ 출퇴근 설정은 `CommuteSettingsDB` 기반으로 동작하며,  
          설정값 `PATH_OPTIMIZE_COMMUTE_DB_ONLY`에 따라 동작 모드 분리:  
          - True  : 운영/스테이징 등에서 DB-only (Mock fallback 없음)  
          - False : 로컬/테스트에서 DB 우선 + 메모리 Mock fallback 허용.  
          완전한 Mock 제거는 아직이며, 현재는 환경에 따라 테스트/로컬 전용으로 사용.
  - [x] 하드코딩된 평균 소요시간 → `segment_statistics` 조회  
        ↳ Logic 3.1 (`get_exception_alert`)에서 `AverageDurationDB` 기반 통계 조회를 사용하고, 통계가 없을 때만 기존 기준선 없이 동작하도록 구현.  
          다른 로직들(예: 일부 Mock 통계 상수)은 여전히 존재할 수 있어, 추후 정리 여지 있음.
  - [ ] 막차 시간 하드코딩 → `last_bus_schedule` 조회  
        ↳ Logic 1.2 퇴근 모드에서 `last_bus_schedule_repository`를 통해 DB 조회 후,  
          데이터가 없거나 오류일 때 기존 하드코딩 값으로 fallback 하는 단계까지 구현.  
          실제 막차 시간표 데이터 적재 및 "DB만 기준으로 돌아가게" 만드는 작업은 추후.

---

## 3. Phase C – 실시간 데이터 연동 강화 (Important)

### 3-1. Logic 1.1 / 1.2 관련

- [ ] **실시간 혼잡도 데이터 연동 (아직 미완료)**  
  - 현재 상태:  
    - ✅ 지하철/버스 실시간 “도착 시간” API 연동 (서울시 + ODSAY)  
    - ✅ ODSAY `sectionTime` 기반 Fallback으로 “대기시간 근사” 개선  
    - ❌ “혼잡도(congestion)”는 여전히 통계/Mock 기반
  - TODO:
    - [ ] 지하철 혼잡도 API 후보 조사 (공공데이터/사업자 API 등)
    - [ ] 노선/구간별 혼잡도 → Logic 2.2, 2.3, 3.1에도 재사용 가능한 형태로 모델링
    - [ ] 혼잡도 실시간 값 + 통계 값의 조합 전략 정의 (가중 평균, 보수적 선택 등)

- [ ] API 실패/타임아웃 시 Fallback 강화
  - [ ] 지하철/버스 실시간 API 타임아웃/에러 시, 통계 + ODSAY 기반으로 안전하게 대체
  - [ ] 실패 시나리오 테스트 케이스 추가 (네트워크 오류, 잘못된 응답, 타임아웃 등)

### 3-2. Logic 2.2, 3.1, 3.2 관련

- [ ] 실시간 환승 대기 시간 API 연동 (Logic 2.2)
  - [x] 지하철 환승: ODSAY 경로 + 서울시 realtimeStationArrival 기반 첫 환승 구간 ETA 반영 (Gate 2 / `/context/routes/with-transfer-eta`)
  - [ ] 버스 환승: 실제 버스 실시간 ETA를 사용해 환승 여유 시간 반영

- [ ] 실시간 구간 지연 감지 강화 (Logic 3.1)
  - [ ] 도로/대중교통 TPEG 등 외부 교통 정보 API 후보 조사
  - [ ] delay_detector에 실시간 소스 통합 (현재 Mock/통계 기반)

- [ ] 택시 ETA/요금 API 연동 (Logic 3.2)
  - [ ] 카카오T / 타다 등 호출 API 평가
  - [ ] 택시 ETA vs 대중교통 ETA 비교 로직과 통합 테스트

---

## 4. Phase D – Frontend 통합 (Critical)

- [ ] React Native 클라이언트 구현 (client/)
  - [ ] React Query 기반 API 클라이언트 (Design-First, OpenAPI 코드젠 고려)
  - [ ] GPS 데이터 수집/권한 처리
  - [ ] Logic 2.1 자동 모드 전환과 UI 상태 동기화 (WAITING/WALKING/ON_TRIP)
  - [ ] Logic 2.4, 3.1, 3.2 알림 UI 구현

- [ ] 스마트 폴링 클라이언트 (Logic 4.3)
  - [ ] 서버의 `/polling/frequency`와 `/polling/status`(추가 예정) 사용
  - [ ] 배터리/데이터 사용량 측정 및 튜닝

- [ ] 푸시 알림 시스템
  - [ ] 모바일 푸시(FCM 등) 연동
  - [ ] Logic 1.1/1.2/2.4/3.1/3.2 시나리오별 알림 플로우 정의

---

## 5. Phase E – AI/ML 모듈 통합 (Nice to Have)

- [ ] AI 패턴 학습 모듈 (`ai_pattern`) *(현재 계획 없음 – 필요 시 활성화)*
  - [ ] MockAIPatternService → 실제 모델/피처 엔지니어링 코드로 교체
  - [ ] 출퇴근 패턴, First/Last Mile 자동 학습, 선호 경로 추천

- [ ] NHN Cloud AI/ML 서비스 연동 *(현재 계획 없음 – 필요 시 활성화)*
  - [ ] Vision API: 시민 리포트 이미지 분석 (risk_manage)
  - [ ] NLP API: 리포트 텍스트 분석 및 분류

---

## 6. Cross-cutting – 테스트/운영 개선

- [ ] E2E 테스트 확장
  - [ ] Logic 2.1~4.3에 대한 전체 여정 시나리오 추가
  - [ ] 실제/Mock 실시간 API를 스위치 할 수 있는 테스트 설정

- [ ] 로깅/모니터링
  - [ ] 실시간 API 오류/타임아웃 비율 모니터링
  - [ ] 각 Logic별 “발동 횟수/거절 횟수” 메트릭 수집

- [ ] 설정/환경 관리
  - [ ] `.env`와 실제 배포 환경에서 필요한 키 목록 정리 (ODSAY, 서울시, 버스, 택시, NHN Cloud 등)
  - [ ] 키 누락 시 안전한 Fallback + 명확한 경고 로그 유지

---

### 주의: Logic 1.1 관련 “완벽하게 하려면” 상태

- **실시간 교통 혼잡도 데이터 연동 강화**  
  - 아직 “완료” 상태는 아님.  
  - 현재까지 한 작업:
    - 지하철 실시간 도착정보 API 통합 (`SeoulSubwayRealtimeClient`)
    - 버스 실시간 도착정보 API 통합 (`SeoulBusRealtimeClient`)
    - ODSAY `sectionTime` / `totalTimeMinutes` 기반 Fallback으로 `departureInMinutes`를 기본값 5분보다 현실적인 값으로 근사
  - 여전히 남은 TODO:
    - “혼잡도(congestion)” 자체를 실시간 데이터 소스로부터 가져와 Logic 1.1/2.2/3.1 등에 반영하는 작업
    - 실패 시나리오(타임아웃/에러)에 대한 별도 테스트 케이스 보강
