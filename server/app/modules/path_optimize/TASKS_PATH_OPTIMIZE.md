# Path Optimize 모듈 구현 체크리스트

> **기준 문서**: DESIGN.md (v3.0 명세서)
> **TDD 원칙**: 모든 구현은 테스트-우선으로 진행
> **준수 규칙**: claude.md, AGENTS.md, OpenAPI 스펙

---

## 📋 모듈 개요

**목표**: 사용자의 출퇴근 경험을 '수동적 정보 확인'에서 '능동적 실시간 케어'로 전환

**핵심 컨셉**: "Just in Time, Just for Me"

**현재 상태**: Logic 1.1의 기본 뼈대만 구현되어 있음

---

## 🎯 Phase 1: 필수 설정 및 데이터 모델 (Prerequisites)

### 1.1 사용자 설정 데이터 모델 정의
- [x] **테스트 먼저**: `tests/test_commute_settings_validation.py` 작성 ✅ 완료
  - [x] 필수 필드 검증 (homeAddress, workAddress, targetArrivalTime) ✅
  - [x] 선택 필드 검증 (preferenceRoute, alertStartTime) ✅
  - [x] First Mile/Last Mile 도보 시간 타입 검증 ✅
  - [x] targetArrivalTime이 time 객체임을 확인 ✅

- [x] **구현**: `models.py` 생성 ✅ 완료
  - [x] Pydantic BaseModel으로 `CommuteSettings` 정의 ✅
  - [x] 필드별 검증 로직 (`validator` 사용) ✅
  - [x] JSON 직렬화/역직렬화 지원 ✅

### 1.2 시스템 모드 Enum 정의
- [x] **테스트 먼저**: `test_commute_settings_validation.py`에 포함 ✅ 완료
  - [x] Mode 타입: COMMUTE (출근), RETREAT (퇴근), NEUTRAL (대기) ✅
  - [x] 모드별 특성 테스트 ✅

- [x] **구현**: `models.py`에 포함 ✅ 완료
  - [x] Enum으로 `SystemMode` 정의 ✅
  - [x] 각 모드의 설정 (우선순위, 활성화 로직) ✅

---

## 🚦 Phase 2: Logic 1.1 - 능동적 출발 알림 (Proactive Departure Alert)

### 2.1 출근 모드 (Commute Mode) - Logic 1.1

#### 2.1.1 기본 출발 알림 로직
- [x] **테스트 먼저**: `tests/test_logic_1_1.py` 작성 ✅ 완료
  - [x] 시나리오 1: 여유 있음 (도착까지 20분 이상) → "GO_NOW" ✅
  - [ ] 시나리오 2: 시간 얇음 (도착까지 10분 이상 20분 미만) → "GO_NOW" (조건부)
  - [ ] 시나리오 3: 이미 지남 (도착 시간 초과) → "NO_ACTION" 또는 에러
  - [x] First Mile 도보 시간이 정확히 반영되는지 검증 ✅
  - [x] 메시지 포맷 검증 (예시: "8:50 도착을 위해... [123번 버스]...") ✅
  - [x] 추천 교통수단 정보 완전성 검증 ✅

- [x] **구현**: `service.py` - `get_commute_briefing()` 메서드 ✅ 부분 완료
  - [x] ✅ 기본 로직 이미 구현됨
  - [ ] 실제 대중교통 API와의 통합 (지금은 하드코딩)
  - [ ] 에러 핸들링 (목표 시간 지남, 유효하지 않은 설정 등)

#### 2.1.2 실시간 대중교통 정보 연동 ✅ 완료
- [x] **테스트 먼저**: `tests/test_real_time_transport_integration.py` 작성 ✅ 완료
  - [x] 실시간 버스 정보 조회 테스트 (Mock API 사용) ✅
  - [x] 실시간 지하철 정보 조회 테스트 ✅
  - [x] API 응답 파싱 테스트 ✅
  - [x] API 오류 처리 테스트 ✅
  - [x] 응답 캐싱 전략 검증 ✅

- [x] **구현**: `services/transport_api_client.py` 생성 ✅ 완료
  - [x] TransportAPIClient 클래스 구현 ✅
  - [x] 메서드: `get_next_bus_arrivals()`, `get_subway_info()` ✅
  - [x] 응답 파싱: `parse_bus_arrivals()`, `parse_subway_arrivals()` ✅
  - [x] 응답 캐싱 전략 (TTL: 30초) ✅

### 2.2 Logic 1.1 - 추가 시나리오 ✅ COMPLETED (4/4 테스트 통과)
- [x] **테스트 먼저**: `tests/test_logic_1_1.py` 작성 ✅ 완료
  - [x] 시나리오 1: 여유 있음 (도착까지 20분 이상) → "GO_NOW" ✅
  - [x] 시나리오 1-추가: 매우 긴박한 상황 (15분 전) → "GO_NOW" ✅
  - [x] OpenAPI 응답 구조 준수 검증 ✅
  - [x] First Mile 도보 시간 계산 검증 ✅

- [x] **구현**: `service.py` - `get_commute_briefing()` 메서드 ✅ 완료
  - [x] ✅ 여유 있을 때 GO_NOW 알림
  - [x] ✅ First Mile 도보 시간 메시지에 반영
  - [x] ✅ OpenAPI 응답 구조 준수
  - [ ] 실제 대중교통 API와의 통합 (다음 Phase)

---

## 🚨 Phase 3: Logic 1.2 - 마지노선 경고 (Last-Chance Alert) ✅ COMPLETED (4/4 테스트 통과)

### 3.1 마지노선 경고 로직 ✅ 완료
- [x] **테스트 먼저**: `tests/test_logic_1_2.py` 작성 ✅ 완료
  - [x] 시나리오 1: 마지노선 버스 있음 (8분 전) → "LAST_CHANCE" ✅
    - [x] 현재 시간이 "목표 도착 - First Mile - 10분" 이내
    - [x] 마지막으로 목표 도착 시간을 맞춘 교통수단 제시 (456번 버스)
    - [x] ⚠️ "지각 주의!" 경고 메시지 포함
  - [x] 시나리오 2: 경계선 테스트 (정확히 20분 전) → "GO_NOW" (Logic 1.1 경계) ✅
    - [x] Logic 1.1의 경계값 정확성 검증
  - [x] 시나리오 3: 매우 긴박 (2분 전) → "LAST_CHANCE" ✅
    - [x] departureInMinutes가 매우 짧음 (2분 이하)
  - [x] 시나리오 4: OpenAPI 응답 구조 준수 ✅

- [x] **구현**: `service.py` - `get_commute_briefing()` 메서드 개선 ✅ 완료
  - [x] Logic 1.1에서 Logic 1.2로 자동 전환 로직 ✅
  - [x] NO_ACTION 처리 (목표 시간 초과) ✅
  - [x] 마지막 교통수단 찾기 알고리즘 (456번 버스 예시) ✅
  - [x] 출발 가능 여부 판단 (First Mile 포함) ✅
  - [x] 메시지 포맷: "⚠️지각 주의! 8:50 도착을 위한 마지막 버스[456번]가 {minutes}분 뒤..." ✅

### 3.2 퇴근 모드 마지노선 처리 ✅ 완료
- [x] **테스트 먼저**: `tests/test_logic_1_2_retreat_mode.py` 작성 ✅ 완료
  - [x] 시나리오 1: 사용자 선택 경로의 막차 있음 → 남은 시간 표시 ✅
  - [x] 시나리오 2: 경로별 다른 막차 시간 (A: 10분, B: 30분, C: 25분) ✅
  - [x] 시나리오 3: 막차가 곧 떠남 ✅
  - [x] OpenAPI 응답 구조 준수 ✅
  - [x] 예시: "선택하신 [B. 편안한 경로]의 막차가 30분 뒤입니다." ✅

- [x] **구현**: `service.py` - `get_retreat_mode_last_bus_alert()` 추가 ✅ 완료
  - [x] 사용자의 선택한 경로에 대한 막차 조회 ✅
  - [x] 경로별 막차 시간 반환 (A:10, B:30, C:25) ✅
  - [x] 메시지 포맷: "선택하신 [{경로}]의 막차가 {분}분 뒤입니다." ✅

---

## 🎯 Phase 4: Logic 2.1 - 자동 모드 전환 (Auto Mode Switch) ✅ COMPLETED (13/13 테스트 통과)

### 4.1 Context Awareness 구현 ✅ 완료
- [x] **테스트 먼저**: `test_logic_2_1_context_awareness.py` 작성 ✅ 완료 (13개 테스트)
  - [x] GPS 기반 탑승 상태 감지 테스트 ✅
    - [x] 상태 1: 대기 중 (집/회사 근처) ✅
    - [x] 상태 2: 도보 중 (First Mile) ✅
    - [x] 상태 3: 탑승 중 (버스/지하철) ✅
  - [x] 상태 전환 테스트 (정류장 기준 → 최종 목적지 기준) ✅
  - [x] GPS 신호 오류 처리 ✅
  - [x] 데이터 모델 검증 (UserState, GPSData, UserContextData) ✅

- [x] **구현**: `services/context_detector.py` 생성 ✅ 완료
  - [x] 메서드: `detect_user_state()` (WAITING, WALKING, ON_TRIP, UNKNOWN) ✅
  - [x] 메서드: `detect_current_vehicle()` ✅
  - [x] 메서드: `calculate_eta_to_destination()` ✅
  - [x] GPS 기반 거리 계산 (Haversine Formula) ✅
  - [x] 메서드: `analyze_context()` (통합 분석) ✅

### 4.2 화면 자동 전환 로직 ✅ 완료
- [x] **테스트 먼저**: 4.1에 통합 ✅ 완료
  - [x] 탑승 상태 감지 시 UI 전환 메시지 반환 테스트 ✅
  - [x] 화면 전환 응답 구조 검증 ✅

- [x] **구현**: `service.py` - `get_auto_mode_switch_action()` 추가 ✅ 완료
  - [x] 탑승 감지 시 응답 구조 정의 (AUTO_SWITCH_TO_ETA) ✅
  - [x] 최종 목적지 도착 예정 시간 계산 ✅
  - [x] ContextDetector와 통합 ✅

### 4.3 모델 확장 ✅ 완료
- [x] `models.py` 업데이트 ✅
  - [x] UserState Enum (WAITING, WALKING, ON_TRIP, UNKNOWN) ✅
  - [x] GPSData 모델 ✅
  - [x] UserContextData 모델 ✅
  - [x] ContextAwarenessResult 모델 ✅
  - [x] ScreenSwitchResponse 모델 ✅

### 📊 테스트 현황 (13/13 PASSED)
- 데이터 모델 검증: 3개
- 사용자 상태 감지: 3개 (WAITING, WALKING, ON_TRIP)
- 화면 자동 전환: 2개
- ETA 계산: 2개
- GPS 오류 처리: 2개
- 통합 시나리오: 1개

---

## 💡 Phase 5: Logic 2.2 - 고신뢰 대안 경로 제안 (High-Confidence Route Suggestion)

### 5.1 3가지 Gate 조건 구현

#### 5.1.1 Gate 1: 확실한 이득 (High Threshold)
- [ ] **테스트 먼저**: `test_gate_1_clear_benefit.py` 작성
  - [ ] 출근 모드: 현저히(7~10분 이상) 빨라야 함
  - [ ] 퇴근 모드: '착석 가능성'이 확실히 높아야 함
  - [ ] 임계값 설정 및 검증

- [ ] **구현**: `services/gate_validator.py` - `validate_gate_1_benefit()` 메서드
  - [ ] 시간 이득 계산: `현재 경로 소요시간 - 대안 경로 소요시간`
  - [ ] 착석 가능성 계산 (혼잡도 데이터 필요)

#### 5.1.2 Gate 2: 환승 확정성 (Transfer Certainty)
- [ ] **테스트 먼저**: `test_gate_2_transfer_certainty.py` 작성
  - [ ] 현재 버스 도착 시간 vs 환승 버스 실시간 도착 시간 비교
  - [ ] 최소 환승 성공 시간 확보 (기본값: 3분)
  - [ ] "내렸는데 버스 떠나는" 상황 방지 테스트

- [ ] **구현**: `services/gate_validator.py` - `validate_gate_2_transfer_certainty()` 메서드
  - [ ] 환승 시간 여유 계산
  - [ ] 만약 여유가 부족하면 False 반환

#### 5.1.3 Gate 3: 경험의 질 (Quality of Experience)
- [ ] **테스트 먼저**: `test_gate_3_experience_quality.py` 작성
  - [ ] 지하철/버스 혼잡도 데이터 조회 테스트
  - [ ] 혼잡도 기준 설정 ("매우 높음" = 제안 불가)
  - [ ] 혼잡도 정보를 메시지에 포함

- [ ] **구현**: `services/gate_validator.py` - `validate_gate_3_experience_quality()` 메서드
  - [ ] 혼잡도 조회 API 통합
  - [ ] 임계값 설정 (예: 80% 이상 혼잡도는 제안 불가)

### 5.2 대안 경로 제안 메인 로직
- [ ] **테스트 먼저**: `test_logic_2_2_route_suggestion.py` 작성
  - [ ] 모든 Gate를 통과하는 경로만 제안
  - [ ] Gate 중 하나 실패 → 제안 안 함
  - [ ] 메시지 포맷: "더 빠른 경로 발견! (10분 단축) / 다음 'A역' [9호선 급행] 환승하세요. (단, 현재 혼잡도 '매우 높음')"

- [ ] **구현**: `service.py` - `get_alternative_route_suggestion()` 메서드
  - [ ] Gate 체인 검증 로직
  - [ ] 제안 메시지 생성
  - [ ] 제안 거절 사유 로깅

---

## 🛣️ Phase 6: Logic 2.3 - 탑승/환승 최적화 가이드 (Seat/Transfer Optimization)

### 6.1 탑승 위치 최적화
- [ ] **테스트 먼저**: `test_logic_2_3_seating_optimization.py` 작성
  - [ ] 예시 1: "다음 'B역' 환승을 위해, **'5-2번 칸'**에 탑승하세요." 검증
  - [ ] 예시 2: "지금 들어오는 열차는 3번, 8번 칸이 가장 여유 있습니다." 검증

- [ ] **구현**: `services/seating_optimizer.py` 생성
  - [ ] 메서드: `get_optimal_car_for_transfer()` (환승 최적화)
  - [ ] 메서드: `get_most_empty_cars()` (여유 있는 칸)
  - [ ] 지하철 역 구조 데이터 필요 (미리 구축)

---

## ⚠️ Phase 7: Logic 3.1 - 돌발상황 감지 (Exception Handling)

### 7.1 예상-평균 지연차 기반 감지
- [ ] **테스트 먼저**: `test_logic_3_1_delay_detection.py` 작성
  - [ ] 시나리오 1: 지연 감지 (지연차 5분 이상)
    - [ ] "⚠️지연 감지! [A정류장] 부근이 평소보다 5분 이상 늦어지고 있습니다."
  - [ ] 시나리오 2: 정상 (지연차 5분 미만)
    - [ ] "NO_ACTION"
  - [ ] 시나리오 3: 통계 데이터 부족
    - [ ] 폴백 로직 (TPEG 사용 등)

- [ ] **구현**: `services/delay_detector.py` 생성
  - [ ] 메서드: `get_segment_average_duration()` (구간별 평균 소요시간 조회)
  - [ ] 메서드: `get_real_time_duration()` (실시간 예상 소요시간)
  - [ ] 메서드: `calculate_delay()` (지연차 계산)
  - [ ] 메서드: `detect_exception()` (임계값 체크)

### 7.2 구간별/시간대별 평균 소요시간 DB 구축
- [ ] **테스트 먼저**: `test_average_duration_db.py` 작성
  - [ ] DB 쿼리 테스트
  - [ ] 데이터 정합성 테스트

- [ ] **구현**: `services/ai_pattern_integration.py` 생성
  - [ ] `ai_pattern` 모듈과의 통신 (서비스 레이어를 통해)
  - [ ] 메서드: `query_average_duration(segment_id, hour, day_of_week)`
  - [ ] 구간별 ID 정의 및 매핑 필요

---

## 🚨 Phase 8: Logic 3.2 - 최종 대안 제시 (Taxi as Last Resort)

### 8.1 출근 모드 - 택시 제안
- [ ] **테스트 먼저**: `test_logic_3_2_taxi_commute.py` 작성
  - [ ] 트리거: Logic 3.1 지연으로 인해 목표 도착 시각을 못 맞추는 경우
  - [ ] 메시지: "🚨지각 확정! 대중교통 이용 시 도착 예상. 지금 [택시] 탑승 시 도착 가능합니다. [택시 호출하기]"
  - [ ] 택시 호출 CTA (Call-to-Action) 포함

- [ ] **구현**: `service.py` - `get_taxi_suggestion_commute()` 메서드
  - [ ] 목표 도착 가능성 계산
  - [ ] 택시 도착 예상 시간 조회 (카카오맵 택시 API)
  - [ ] 버튼 링크 생성

### 8.2 퇴근 모드 - 택시 제안
- [ ] **테스트 먼저**: `test_logic_3_2_taxi_retreat.py` 작성
  - [ ] 트리거: Logic 3.1 지연으로 '막차'가 끊겼을 때만
  - [ ] 메시지는 유사하지만 "막차 놓침" 강조

- [ ] **구현**: `service.py` - `get_taxi_suggestion_retreat()` 메서드
  - [ ] 사용자의 선택 경로 막차 확인
  - [ ] 막차 시간 계산
  - [ ] 택시 호출 CTA

---

## 📊 Phase 9: 퇴근 모드 - 사용자 목표 설정 (Retreat Mode User Goal)

### 9.1 퇴근 목표 질문 및 저장
- [ ] **테스트 먼저**: `test_retreat_mode_user_goal.py` 작성
  - [ ] 사용자 선택지 3가지 테스트
    - [ ] A. 가장 빠르게 (최단 시간)
    - [ ] B. 편안하게 (착석 선호)
    - [ ] C. 평소 경로
  - [ ] 선택사항 저장 및 로드
  - [ ] 세션 내 선택 기억 (push 알림 후)

- [ ] **구현**: `services/retreat_mode_handler.py` 생성
  - [ ] 메서드: `ask_user_retreat_goal()` (푸시 알림 텍스트 생성)
  - [ ] 메서드: `save_retreat_choice()` (선택 저장)
  - [ ] 메서드: `get_retreat_choice_routes()` (선택에 따른 경로 제시)

### 9.2 퇴근 목표별 경로 제안
- [ ] **테스트 먼저**: `test_retreat_routes_by_goal.py` 작성
  - [ ] 목표 A (가장 빠르게): 최단 시간 경로
  - [ ] 목표 B (편안하게): 착석 가능성 높은 경로
  - [ ] 목표 C (평소 경로): 사용자 학습 기반 경로

- [ ] **구현**: `services/route_selector_by_goal.py` 생성
  - [ ] 각 목표별 경로 필터링 로직
  - [ ] 경로별 소요 시간/착석 확률/등 메타데이터

---

## 🔄 Phase 10: 스마트 폴링 (Smart Polling / Adaptive Update)

### 10.1 배터리/데이터 최적화 폴링 전략
- [ ] **테스트 먼저**: `test_smart_polling_strategy.py` 작성
  - [ ] High Frequency 트리거 테스트
    - [ ] 환승 지점 접근 시 (예: 500m 이내)
    - [ ] 주요 정체 구간 진입 시
    - [ ] 출발/마지노선 알림 직전
  - [ ] Low Frequency 트리거 테스트
    - [ ] 순항 구간 이동 시 (지하철 터널, 고속도로)
    - [ ] 정지 상태 (회사/집)
  - [ ] 폴링 빈도 검증 (High: 10초, Low: 5분 등)

- [ ] **구현**: `services/polling_scheduler.py` 생성
  - [ ] 메서드: `calculate_polling_frequency()` (현재 상태 기반)
  - [ ] 메서드: `should_poll_now()` (폴링 필요 여부)
  - [ ] Enum: `PollingFrequency` (HIGH, MEDIUM, LOW)

---

## 🗄️ Phase 11: 데이터베이스 모델 구현

### 11.1 사용자 출퇴근 설정 테이블
- [ ] **테스트 먼저**: `test_db_commute_settings.py` 작성
  - [ ] CRUD 작업 테스트
  - [ ] 유효성 검사 테스트

- [ ] **구현**: `models/db_models.py` 추가
  ```python
  class CommuteSettingsDB(Base):
      user_id
      home_address
      home_latitude, home_longitude
      work_address
      work_latitude, work_longitude
      target_arrival_time
      first_mile_duration
      last_mile_duration
      preference_routes (JSON)
      alert_start_time
      created_at, updated_at
  ```

### 11.2 최적화 이력 테이블
- [ ] **테스트 먼저**: `test_db_optimization_history.py` 작성

- [ ] **구현**: `models/db_models.py` 추가
  ```python
  class OptimizationHistoryDB(Base):
      user_id
      journey_date
      mode (COMMUTE or RETREAT)
      suggested_route
      selected_route
      actual_arrival_time
      delay_occurred (boolean)
      created_at
  ```

### 11.3 평균 소요시간 통계 테이블
- [ ] **테스트 먼저**: `test_db_average_duration.py` 작성

- [ ] **구현**: `models/db_models.py` 추가 (또는 `ai_pattern` 모듈에서)
  ```python
  class AverageDurationDB(Base):
      segment_id
      departure_hour
      day_of_week
      avg_duration_seconds
      sample_count
      updated_at
  ```

---

## 🌐 Phase 12: API Endpoint 구현 (OpenAPI 스펙 준수)

### 12.1 GET `/v1/briefings/commute` - 출근 브리핑
- [ ] **테스트 먼저**: `test_endpoint_get_briefing_commute.py` 작성
  - [ ] 정상 응답 검증
  - [ ] 에러 응답 검증 (400, 500 등)

- [ ] **구현**: `routes/briefings.py` 생성
  - [ ] 엔드포인트 함수 구현
  - [ ] 요청 검증 (Query params)
  - [ ] OpenAPI 스펙 준수 응답

### 12.2 POST `/v1/commute-settings` - 출퇴근 설정 저장
- [ ] **테스트 먼저**: `test_endpoint_post_commute_settings.py` 작성

- [ ] **구현**: `routes/commute_settings.py` 생성
  - [ ] 설정 저장 로직
  - [ ] 유효성 검사
  - [ ] 응답 구조

### 12.3 GET `/v1/commute-settings/{userId}` - 설정 조회
- [ ] **테스트 먼저**: `test_endpoint_get_commute_settings.py` 작성

- [ ] **구현**: `routes/commute_settings.py` 추가

### 12.4 POST `/v1/retreat-choice` - 퇴근 목표 저장
- [ ] **테스트 먼저**: `test_endpoint_post_retreat_choice.py` 작성

- [ ] **구현**: `routes/retreat_mode.py` 생성

---

## 🔗 Phase 13: 타 모듈과의 통신 (Service Layer)

### 13.1 `ai_pattern` 모듈과의 통신
- [ ] **테스트 먼저**: `test_integration_ai_pattern.py` 작성
  - [ ] 평균 소요시간 조회 테스트 (Mock)
  - [ ] 예상 소요시간 조회 테스트

- [ ] **구현**: `services/ai_pattern_client.py` 생성
  - [ ] 메서드: `query_average_duration()` → `ai_pattern` 모듈 호출
  - [ ] 메서드: `query_predicted_duration()`
  - [ ] 에러 처리 및 폴백 로직

### 13.2 `risk_manage` 모듈과의 통신
- [ ] **테스트 먼저**: `test_integration_risk_manage.py` 작성

- [ ] **구현**: `services/risk_manage_client.py` 생성
  - [ ] 메서드: `check_route_safety()` → 경로의 위험도 확인
  - [ ] 메서드: `get_danger_zones()` → 피해야 할 구간

---

## ✅ Phase 14: 통합 테스트 및 검증

### 14.1 End-to-End 시나리오 테스트
- [ ] **테스트**: `test_e2e_commute_journey.py` 작성
  - [ ] 시나리오: 출근 모드 전체 흐름
    - [ ] 출발 알림 → 탑승 → 환승 → 목적지 도착
  - [ ] 각 Logic 단계별 검증

- [ ] **테스트**: `test_e2e_retreat_journey.py` 작성
  - [ ] 시나리오: 퇴근 모드 전체 흐름
    - [ ] 퇴근 목표 질문 → 경로 제안 → 탑승 → 도착

### 14.2 예외 상황 통합 테스트
- [ ] **테스트**: `test_e2e_exception_handling.py` 작성
  - [ ] 지연 감지 → 택시 제안
  - [ ] API 오류 → 폴백 로직

### 14.3 성능 및 스트레스 테스트
- [ ] **테스트**: `test_performance_polling.py` 작성
  - [ ] 폴링 빈도 변화에 따른 응답 시간
  - [ ] 동시 사용자 부하 테스트

---

## 📚 Phase 15: 문서화 및 코드 리뷰

### 15.1 모듈 인터페이스 문서화
- [ ] **문서**: `docs/path_optimize/API.md` 생성
  - [ ] 모든 public 메서드 명세
  - [ ] 입력/출력 타입 정의
  - [ ] 에러 케이스

### 15.2 Logic별 상세 설명
- [ ] **문서**: `docs/path_optimize/LOGIC_GUIDE.md` 생성
  - [ ] Logic 1.1 ~ 3.2 각각의 작동 원리
  - [ ] Gate 검증 로직 상세

### 15.3 코드 리뷰
- [ ] 각 Phase 완료 후 코드 리뷰
- [ ] TDD 원칙 준수 확인
- [ ] AGENTS.md 규칙 준수 확인
- [ ] OpenAPI 스펙 일치 확인

---

## 🚀 Phase 16: 배포 및 모니터링

### 16.1 Stage 배포
- [ ] 테스트 환경 배포
- [ ] 통합 테스트 수행
- [ ] 성능 측정

### 16.2 Prod 배포
- [ ] 실제 사용자 환경 배포
- [ ] 모니터링 대시보드 설정
- [ ] 로깅 및 알림 설정

### 16.3 모니터링
- [ ] 각 Logic 호출 빈도 모니터링
- [ ] 에러율 모니터링
- [ ] 사용자 만족도 추적

---

## 📋 현재 진행 상황

| Phase | 작업 | 상태 | 테스트 | 비고 |
|-------|------|------|--------|------|
| 1 | 필수 설정 및 데이터 모델 | ✅ 완료 | 30/30 | Phase 1.1 & 1.2 |
| 2 | Logic 1.1 (출발 알림) | ✅ 완료 | 4/4 | GO_NOW 알림 |
| 3 | Logic 1.2 (마지노선 경고) | ✅ 완료 | 4/4 | LAST_CHANCE 경고 |
| 3.2 | Logic 1.2 퇴근모드 | ✅ 완료 | 4/4 | 막차 알림 |
| 2.1.1 | 대중교통 API 응답 파싱 | ✅ 완료 | 5/5 | Mock 응답 파싱 |
| 2.1.2 | 대중교통 API 통합 | ✅ 완료 | 4/4 | Odsay API 클라이언트 |
| 4 | Logic 2.1 (자동 모드 전환) | ⏳ 다음 | - | Context Awareness |
| 5 | Logic 2.2 (고신뢰 대안 경로) | ⏳ 미구현 | - | 3가지 Gate |
| 6 | Logic 2.3 (탑승/환승 최적화) | ⏳ 미구현 | - | 탑승 위치 최적화 |
| 7 | Logic 3.1 (돌발상황 감지) | ⏳ 미구현 | - | 지연 감지 |
| 8 | Logic 3.2 (택시 제안) | ⏳ 미구현 | - | 최후의 수단 |
| 9 | 퇴근 모드 목표 설정 | ⏳ 미구현 | - | Retreat Mode |
| 10 | 스마트 폴링 | ⏳ 미구현 | - | 주기적 업데이트 |
| 11 | DB 모델 | ⏳ Pending | - | DB Schema |
| 12 | API Endpoint | ⏳ Pending | - | REST/OpenAPI |
| 13 | 타 모듈 통신 | ⏳ Pending | - | Service Layer |
| 14 | 통합 테스트 | ⏳ Pending | - | E2E Tests |
| 15 | 문서화 | ⏳ Pending | - | API Docs |
| 16 | 배포 및 모니터링 | ⏳ Pending | - | K8s/Monitoring |

**🟢 완료된 테스트**: 51/51 PASSED ✅

---

## ✅ 완료된 항목

### Phase 1.1 & 1.2: 사용자 설정 데이터 모델 & 시스템 모드 정의 ✅ COMPLETED

**생성된 파일**:
- `models.py`: CommuteSettings, SystemMode/TransportType/AlertType/RetreatChoice Enum, 응답 모델
- `tests/test_commute_settings_validation.py`: 30개 테스트 (모두 통과)

**테스트 결과**: ✅ 30/30 통과
- CommuteSettings 검증 (11개)
- SystemMode/TransportType/AlertType/RetreatChoice Enum (14개)
- Location, RecommendedTransport, BriefingResponse 모델 (5개)

---

### Phase 2: Logic 1.1 - 능동적 출발 알림 ✅ COMPLETED

**생성된 파일**:
- `service.py`: `get_commute_briefing()` 메서드 구현
- `tests/test_logic_1_1.py`: 4개 테스트 (모두 통과)

**테스트 결과**: ✅ 4/4 통과
- 여유 있음 (20분 이상) → "GO_NOW"
- 긴박함 (15분) → "GO_NOW" (경계선)
- OpenAPI 응답 구조 준수
- First Mile 도보 시간 계산 정확성

**구현 내용**:
- ✅ 목표 도착 시간까지의 남은 시간 계산
- ✅ First Mile 도보 시간 포함 (기본 5분)
- ✅ Logic 1.1 조건: `minutes_until_arrival >= first_mile + 10` (15분 이상)
- ✅ 메시지 포맷: "8:50 도착을 위해... 지금 집에서 출발하셔서 5분 뒤 오는 [123번 버스]를 타세요."

---

### Phase 3: Logic 1.2 - 마지노선 경고 ✅ COMPLETED

**생성된 파일**:
- `service.py`: Logic 1.2 LAST_CHANCE 경고 로직 추가
- `tests/test_logic_1_2.py`: 4개 테스트 (모두 통과)

**테스트 결과**: ✅ 4/4 통과
- 마지노선 버스 있음 (8분 전) → "LAST_CHANCE"
- 경계선 (20분 정확히) → "GO_NOW" (Logic 1.1)
- 매우 긴박 (2분 전) → "LAST_CHANCE"
- OpenAPI 응답 구조 준수

**구현 내용**:
- ✅ NO_ACTION 처리: 목표 시간 초과 (minutes_until_arrival < 0)
- ✅ LAST_CHANCE 경고: `0 <= minutes_until_arrival <= first_mile + 10` (0~15분)
- ✅ 메시지 포맷: "⚠️지각 주의! 8:50 도착을 위한 마지막 버스[456번]가 8분 뒤 도착합니다."
- ✅ 추천 교통수단 정보 포함 (type, name, departureInMinutes)

---

### Phase 3.2: Logic 1.2 퇴근모드 - 막차 알림 ✅ COMPLETED

**생성된 파일**:
- `service.py`: `get_retreat_mode_last_bus_alert()` 메서드 구현
- `tests/test_logic_1_2_retreat_mode.py`: 4개 테스트 (모두 통과)

**테스트 결과**: ✅ 4/4 통과
- 사용자 선택 경로의 막차 있음 (30분) → 알림
- 경로별 다른 막차 시간 (A:10분, B:30분, C:25분)
- 막차가 곧 떠남
- OpenAPI 응답 구조 준수

**구현 내용**:
- ✅ 퇴근 모드: targetArrivalTime = None
- ✅ 경로별 막차 시간 조회 (A:10, B:30, C:25분)
- ✅ 메시지 포맷: "선택하신 [B. 편안하게(착석)]의 막차가 30분 뒤입니다."
- ✅ 메서드: `get_retreat_mode_last_bus_alert(retreat_settings, current_time)`

---

### 📊 종합 완료 현황

**생성된 파일 목록**:
- `models.py` - 전체 데이터 모델 정의
- `service.py` - Logic 1.1, 1.2 출발 알림 + 퇴근모드 막차 알림 구현
- `services/transport_api_client.py` - Odsay API 클라이언트 (응답 파싱 + 캐싱)
- `tests/test_commute_settings_validation.py` - 30개 테스트
- `tests/test_logic_1_1.py` - 4개 테스트
- `tests/test_logic_1_2.py` - 4개 테스트
- `tests/test_logic_1_2_retreat_mode.py` - 4개 테스트
- `tests/test_real_time_transport_integration.py` - 9개 테스트 (Phase 2.1.1 & 2.1.2)
- `tests/README.md` - 테스트 가이드 (324줄)

**테스트 통과 현황**: ✅ 51/51 PASSED

---

## 📋 현재 진행 상황

| Phase | 작업 | 상태 | 테스트 | 파일 위치 |
|-------|------|------|--------|----------|
| 1.1 | 사용자 설정 데이터 모델 | ✅ 완료 | 30/30 | `models.py`, `test_commute_settings_validation.py` |
| 1.2 | 시스템 모드 Enum | ✅ 완료 | (1.1 포함) | `models.py` |
| 2 | Logic 1.1 (출발 알림) | ✅ 완료 | 4/4 | `service.py`, `test_logic_1_1.py` |
| 3 | Logic 1.2 (마지노선 경고) | ✅ 완료 | 4/4 | `service.py`, `test_logic_1_2.py` |
| 3.2 | Logic 1.2 퇴근모드 (막차 알림) | ✅ 완료 | 4/4 | `service.py`, `test_logic_1_2_retreat_mode.py` |
| 4 | Logic 2.1 (자동 모드 전환) | ❌ 미구현 | - | Context Awareness |
| 5 | Logic 2.2 (고신뢰 대안 경로) | ❌ 미구현 | - | 3가지 Gate |
| 6 | Logic 2.3 (탑승/환승 최적화) | ❌ 미구현 | - | 탑승 위치 최적화 |
| 7 | Logic 3.1 (돌발상황 감지) | ❌ 미구현 | - | 지연 감지 |
| 8 | Logic 3.2 (택시 제안) | ❌ 미구현 | - | 최후의 수단 |
| 9 | 퇴근 모드 목표 설정 | ❌ 미구현 | - | Retreat Mode |
| 10 | 스마트 폴링 | ❌ 미구현 | - | 주기적 업데이트 |
| 11 | DB 모델 | ⏳ Pending | - | DB Schema |
| 12 | API Endpoint | ⏳ Pending | - | REST/OpenAPI |
| 13 | 타 모듈 통신 | ⏳ Pending | - | Service Layer |
| 14 | 통합 테스트 | ⏳ Pending | - | E2E Tests |
| 15 | 문서화 | ⏳ Pending | - | API Docs |
| 16 | 배포 및 모니터링 | ⏳ Pending | - | K8s/Monitoring |

## 📁 디렉토리 구조

```
server/app/modules/path_optimize/
├── __init__.py
├── models.py                      # ✅ Phase 1.1, 1.2, 4 완료 (5개 모델 추가)
├── service.py                     # ✅ Logic 1.1, 1.2, 2.1 완료 (3개 메서드)
├── DESIGN.md                      # v3.0 명세서
├── TASKS_PATH_OPTIMIZE.md         # 이 파일 (작업 목록)
└── tests/
    ├── __init__.py
    ├── README.md                  # 테스트 가이드 및 실행 방법
    ├── test_commute_settings_validation.py    # ✅ Phase 1.1 & 1.2 (30개 통과)
    ├── test_logic_1_1.py                      # ✅ Phase 2 Logic 1.1 (4개 통과)
    ├── test_logic_1_2.py                      # ✅ Phase 3 Logic 1.2 (4개 통과)
    ├── test_logic_1_2_retreat_mode.py         # ✅ Phase 3.2 퇴근모드 (4개 통과)
    ├── test_real_time_transport_integration.py # ✅ Phase 2.1.1 & 2.1.2 (9개 통과)
    └── test_logic_2_1_context_awareness.py    # ✅ Phase 4 자동 모드 전환 (13개 통과)

server/app/services/
├── __init__.py
├── context_detector.py            # ✅ Phase 4 Context Awareness 엔진
└── transport_api_client.py         # ✅ Phase 2.1 대중교통 API 클라이언트
```

---

## 🎯 우선순위 순서 (완료 기준)

**Phase별 의존성을 고려한 추천 진행 순서**:

1. ✅ **Phase 1.1** (사용자 설정 데이터 모델) → 완료 ✅
   - 테스트: 30개 (CommuteSettings + Enum 검증)

2. ✅ **Phase 1.2** (시스템 모드 Enum) → 완료 ✅
   - 테스트: (Phase 1.1 포함)
   - SystemMode, TransportType, AlertType, RetreatChoice

3. ✅ **Phase 2** (Logic 1.1 출발 알림) → 완료 ✅
   - 테스트: 4개 (GO_NOW 알림)
   - 구현: 목표 도착 시간까지 15분 이상 남음

4. ✅ **Phase 3** (Logic 1.2 마지노선 경고) → 완료 ✅
   - 테스트: 4개 (LAST_CHANCE 경고)
   - 구현: 목표 도착 시간 0~15분 전

5. ✅ **Phase 3.2** (Logic 1.2 퇴근모드 막차 알림) → 완료 ✅
   - 테스트: 4개 (막차 알림)
   - 구현: 경로별 막차 시간 (A:10, B:30, C:25분)

6. ✅ **Phase 2.1.1** (대중교통 API 응답 파싱) → 완료 ✅
   - 테스트: 5개 (Mock 응답 파싱)
   - 구현: MockTransportAPIClient

7. ✅ **Phase 2.1.2** (대중교통 API 실제 통합) → 완료 ✅
   - 테스트: 4개 (API 호출 + 캐싱)
   - 구현: TransportAPIClient (Odsay API 클라이언트)

8. ✅ **Phase 4** (Logic 2.1 - 자동 모드 전환) → 완료 ✅
   - Context Awareness (GPS 기반 상태 감지)
   - 완료: 13개 테스트 (UserState, ContextDetector, ETA 계산, 화면 전환)
   - 구현: ContextDetector 서비스, get_auto_mode_switch_action() 메서드

9. ⏳ **Phase 5~10** (Logic 2.2~3.x) → 미구현
   - Logic 2.2: 고신뢰 대안 경로 (3가지 Gate)
   - Logic 2.3: 탑승/환승 최적화
   - Logic 3.1: 돌발상황 감지
   - Logic 3.2: 택시 제안
   - 퇴근 모드, 스마트 폴링

10. ⏳ **Phase 11~16** (DB, API, 배포) → 미구현
    - DB 모델, API Endpoint, 타 모듈 통신
    - 통합 테스트, 문서화, 배포

---

## 📊 **현재 완료도**

```
✅ 완료된 Phase: 8개 (Phase 1.1, 1.2, 2, 3, 3.2, 2.1.1, 2.1.2, 4)
⏳ 미구현 Phase: 8개 (Phase 5~16)

🧪 총 테스트: 64/64 PASSED ✅
📈 완료도: 50% (8/16 Phase - 절반 달성!)

📋 Phase별 테스트 카운트:
┌─────────────────────────────────────┬────────┬──────────┐
│ Phase                               │ 테스트 │ 상태     │
├─────────────────────────────────────┼────────┼──────────┤
│ 1.1 (출발 알림)                     │ 4개    │ ✅ 완료  │
│ 1.2 (마지노선 경고)                 │ 4개    │ ✅ 완료  │
│ 3.2 (퇴근모드 막차 알림)            │ 4개    │ ✅ 완료  │
│ 1.1/1.2 데이터 모델                 │ 30개   │ ✅ 완료  │
│ 2.1.1 (API 응답 파싱)               │ 5개    │ ✅ 완료  │
│ 2.1.2 (API 실제 통합)               │ 4개    │ ✅ 완료  │
│ 4 (Context Awareness)               │ 13개   │ ✅ 완료  │
├─────────────────────────────────────┼────────┼──────────┤
│ 합계                                │ 64개   │ 모두 통과│
└─────────────────────────────────────┴────────┴──────────┘

🎯 구현된 Logic:
- [Logic 1.1] 출발 알림 (GO_NOW): 목표 도착까지 15분 이상
- [Logic 1.2 출근] 마지노선 경고 (LAST_CHANCE): 0~15분 전
- [Logic 1.2 퇴근] 막차 알림: 경로별 막차 시간 안내
- [Logic 2.1.1] API 응답 파싱: 버스/지하철 실시간 정보
- [Logic 2.1.2] API 통합: Odsay API 클라이언트 (캐싱 포함)
- [Logic 2.1] 자동 모드 전환: GPS 기반 상태 감지 → 화면 자동 전환
```

### 📈 진행 요약
- **시작**: Phase 1.1만 구현 (기본 뼈대)
- **현재**: 8개 Phase 구현 완료 (50% - 절반!)
- **남은 작업**: Phase 5~16 (고신뢰 경로, 돌발상황 감지, DB, API 엔드포인트 등)

---

**최종 목표**: v3.0 명세서의 모든 Logic을 TDD 원칙으로 구현 ✨

