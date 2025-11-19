# Phase C – 실시간 데이터 연동 세부 작업 목록

> 목적: Logic 1.1 ~ 3.2에서 **실시간 ETA/혼잡도/지연 데이터**를 안전하게 활용할 수 있도록  
> 외부 API 연동, Fallback, 테스트 전략을 세분화한 TODO 리스트입니다.

---

## 공통 준비 사항 (C-1/C-2/C-3 공통)

- [ ] 환경 변수 정리
  - [ ] `SEOUL_SUBWAY_API_KEY` (서울 지하철 실시간 API – realtimeStationArrival)
  - [ ] `SEOUL_BUS_API_KEY` (서울 버스 실시간 API – getArrInfoByRouteList)
  - [ ] `ODSAY_API_KEY` (대중교통 경로/구간 정보)
  - [ ] (선택) `TPEG_API_KEY` 또는 도로 실시간 정보 API 키
  - [ ] (선택) `TAXI_API_KEY` (카카오T/타다 등 택시/모빌리티 서비스)

- [ ] 테스트 정책 결정
  - [ ] pytest에서 외부 API를 **실제로 호출해도 되는지** 여부 (네트워크/쿼터 고려)
  - [ ] 그렇지 않다면, HTTP 응답을 fixture/mock으로 대체하는 범위 정의

- [ ] 로그/모니터링
  - [ ] 모든 실시간 API 호출에 대해 `url`, 핵심 파라미터, 응답 상태/코드/요약 로그 추가
  - [ ] 실패 사유(키 오류/쿼터 초과/네트워크 타임아웃 등)를 구분해 로깅

---

## C-1. Logic 1.1/1.2 – 실시간 혼잡도 + 대기시간 Fallback 강화

### C-1.1 ETA · Door-to-Door 계산 정교화

- [x] Door-to-Door 기본 계산
  - [x] `First Mile + 대기시간 + Transit + Last Mile`로 `expected_arrival`·`totalDurationMinutes` 계산
  - [x] `departureInMinutes = First Mile + 정류장/역 대기시간`으로 응답 정의
- [ ] ETA 품질 확인
  - [ ] 실시간 지하철 ETA가 실제 도착 시각과 얼마나 차이 나는지 샘플 로그/검증
  - [ ] 실시간 버스 ETA가 없는 노선(마을버스 등)에 대한 Fallback 전략 확인

**사용자가 제공/확인해 줄 것**
- [ ] 몇 개 대표 구간(출근/퇴근)에 대해:
  - [ ] 실제 출발·도착 시각 vs 우리 시스템 `totalDurationMinutes` 비교 값 (손으로 측정)

### C-1.2 혼잡도 데이터 연동 (지하철 중심, 역/구간 단위)

- [x] 혼잡도 데이터 소스 (1단계: 역/구간 단위 평균 혼잡도)
  - [x] 서울교통공사_지하철혼잡도정보 활용
    - [x] 노선/역/시간대별 평균 혼잡도(예: 혼잡률 %)를 수집·파싱
    - [ ] 필요한 경우, 버스 혼잡도는 별도 통계 or 추정 로직으로 후순위에 추가
  - [x] 혼잡도 모델링
  - [x] 혼잡도 스케일 정의 (0~100 → LOW/MED/HIGH/VERY_HIGH로 매핑)
  - [x] “경험의 질” 판정 기준:
    - [x] 0~40=LOW, 40~70=MED, 70~90=HIGH, 90+=VERY_HIGH
  - [x] `RecommendedTransport`에 혼잡도 필드 추가 여부 논의 (예: `congestionLevel`, `congestionValue`)
- [x] Logic 1.1/1.2/2.2/3.1 연동 준비
  - [x] ODSAY `subPath`의 `startID`, `lane.subwayCode`, `wayCode`를 활용해 평균 혼잡도 조회
  - [x] 조회 성공 시, 로그에 혼잡도 요약 출력 (예: “🚇 평균 혼잡도 조회: 고속터미널(3호선) 82.3% (HIGH)”)
  - [ ] (후속) 메시지/Logic Gate에 실제 혼잡도 반영 (텍스트/페널티)

> 주의: 서울교통공사 혼잡도 데이터는 **열차 전체/역·구간 단위 평균 혼잡도**까지만 제공하고,  
> 칸(1~10칸)별 상세 혼잡도는 제공하지 않습니다.  
> 따라서 1단계에서는 “구간/열차 전체의 혼잡도 기반 경험의 질 판단”까지만 구현하고,  
> Logic 2.3에서 요구하는 “몇 번 칸 타라” 수준의 칸 단위 추천은  
> **T map PUZZLE 등의 칸별 혼잡도 소스가 준비된 이후에** Phase 2.3 확장으로 다룹니다.

**사용자가 제공/확인해 줄 것**
- [x] 서울교통공사_지하철혼잡도정보 샘플 응답(JSON/CSV/XML) 1~2개
- [x] 혼잡도 → LOW/MED/HIGH/VERY_HIGH로 나누는 임계값 (40/70/90%)

#### C-1.2 현재 구현 현황 (MVP 기준)

- 데이터/매핑
  - [x] 서울교통공사 혼잡도 CSV 파일 저장 (`server/data/seoul_subway_congestion.csv`)
  - [x] ODSAY 역ID ↔ 서울 역번호 매핑 초안 (`server/data/master_station_map.json`, 2/3/9호선 일부 샘플)
  - [x] 역/호선/방향/시간대 인덱싱 및 30분 버킷 Fallback 구현 (`seoul_subway_congestion_repository.py`)
  - [x] ODSAY 라인 정의 config(`server/config/odsay_lines.json`) 및 마스터 빌드 스크립트(`server/build_odsay_master.py`) 추가
  - [x] `build_odsay_master.py 1 2` 실행 시 1·2호선 ODSAY 역 마스터 JSON/CSV 생성 및 `master_station_map.json` 자동 병합
- 서비스 연동
  - [x] PathOptimizeService에서 지하철 segment(`startID`, `subwayCode`, `wayCode`) 기반 평균 혼잡도 조회
  - [x] 혼잡도 조회 성공 시 로그 출력 (역/호선/퍼센트/등급)
  - [x] 추천 교통수단 payload에 `congestionValue`(%) / `congestionLevel`(LOW~VERY_HIGH) 포함
  - [x] Logic 1.1/1.2 GO_NOW / LAST_CHANCE 메시지에 혼잡도 텍스트 suffix 추가
- 스키마/테스트
  - [x] `RecommendedTransport` 모델/스펙에 `congestionValue`·`congestionLevel` 필드 추가 (Pydantic + OpenAPI)
  - [x] Logic 1.1 테스트에 혼잡도 메시지 포함 여부 검증 케이스 추가 (회귀 방지)

### C-1.3 ETA Fallback 전략 강화

- [x] 실시간 실패 시 Fallback 순서 명시
  - [x] 현재: 실시간 실패 → 통계(`AverageDurationDB`) → ODSay 출발시각 → 기본값(5분)
  - [x] 각 단계별 “사용 가능/사용 불가” 기준 정의 (예: 통계 샘플수 < N이면 사용 안 함, N=1로 설정)
- [x] 실패 시 메시지 정책
  - [x] ETA가 Fallback만 가능한 경우, 사용자에게 어느 정도까지 노출할지 결정
    - [x] 예: “⚠️ 실시간 정보 없음 (평균 소요시간)” suffix로 안내

**사용자가 제공/확인해 줄 것**
- [x] “통계 데이터 신뢰도 기준”(샘플 개수/최신 업데이트 시점 등)에 대한 정책 (N=1로 합의)

---

## C-2. Logic 2.2/3.1 – 환승 대기시간 + TPEG 지연 감지

### C-2.1 환승 대기시간 강화 (Logic 2.2)

- [ ] 환승 포인트에서의 실시간 대기시간 계산
  - [x] 지하철 환승: 도착역/환승역 기준 다음 열차 ETA 조회 (`get_transfer_vehicle_realtime_info`, `/context/routes/with-transfer-eta`)
  - [ ] 버스 환승: 환승 정류장 기준 다음 버스 ETA 조회
  - [ ] ODSay `sectionTime`과 실시간 ETA를 조합해 “환승 여유 시간(≥ 3분)”을 더 정확히 계산
- [x] Logic 2.2 Gate 2(환승 확정성) 개선
  - [x] 현재 상수/단순 계산 부분을 “실시간 환승 대기시간”으로 교체 (`compute_transfer_window` + 실시간 ETA 주입, transfer_window=None 시 보수적 FAIL)

**사용자가 제공/확인해 줄 것**
- [ ] 환승 시나리오 예시 1~2개 (환승역/노선 이름, 실제 환승 여유 시간 대략치)

### C-2.2 실시간 지연 감지 (Logic 3.1) – 도로/TPEG 연동

- [x] 평균 소요시간 데이터 파이프라인 정리
  - [x] `AverageDurationDB` 기반 구간별/시간대별 평균 소요시간 스키마 확정 (`average_duration` 테이블)  
  - [x] 서울교통공사 열차시간표 API 기반 구간 소요시간 집계 및 CSV 생성 (`build_seoul_subway_timetable.py`, `data/average_duration_stats.csv`)  
  - [x] CSV → `AverageDurationDB` import/upsert 스크립트 추가 (`import_average_duration_from_csv.py`)
- [x] DelayDetector ↔ 실시간 ETA 통합 (지하철/버스)
  - [x] `PathOptimizeService.build_realtime_data_map`, `_get_api_params_by_segment_id`를 통해  
        특정 구간 ID(`subway_7_남구로-온수`, `subway_1호선_서울역-시청_1` 등)에 대해  
        AverageDurationDB 평균 vs 서울시 실시간 ETA를 비교하는 지연 감지 경로 구현
  - [x] 샘플 수/신뢰도 기준(`MIN_SAMPLE_COUNT_FOR_RELIABILITY=100`) 적용 → 데이터 부족 시 실시간-only 폴백(TPEG 역할)으로 NO_ACTION 처리
  
- [ ] 도로/TPEG 기반 실시간 정보 소스 결정 (추가 확장)
  - [ ] TPEG/도로 속도 API 후보 (국토부, 민간 사업자 등)
  - [ ] 도로/TPEG 데이터를 AverageDuration 대비 지연 판단에 어떻게 포함할지 설계
- [ ] DelayDetector 도로/TPEG 확장
  - [ ] `real_time_data_map`에 도로 속도/구간 지연 정보 구조 설계
  - [ ] 평균 대비 “지연” 기준 강화/세분화 (예: +5분 or +30% 이상, 구간 타입별 차등)

**사용자가 제공/확인해 줄 것**
- [ ] 사용할 TPEG/도로 정보 API의 샘플 응답
- [ ] “지연”으로 간주할 기준 (분/퍼센트 기준) (도로/TPEG 확장 버전)


---

### C-2.x 현재 백엔드 기준 남은 핵심 TODO 정리

- [ ] **버스 환승 대기시간**  
  - C-2.1 에서 지하철 환승 ETA는 구현 완료 (`get_transfer_vehicle_realtime_info`, `/context/routes/with-transfer-eta`).  
  - 버스 환승 정류장 기준 다음 버스 ETA를 조회해서 Gate 2 환승 여유 시간에 반영하는 로직은 아직 미구현.

- [ ] **실시간 혼잡도 / 도로 지연 / 택시 연동**  
  - 지하철 혼잡도는 현재 통계(서울교통공사 평균)만 사용 중이며, 실시간 혼잡도 소스(TPEG/사업자 API 등)는 미연동.  
  - 도로/TPEG 기반 구간 지연 감지(Logic 3.1)와 택시 ETA/요금 API(Logic 3.2)는 설계 단계에 머물러 있음.

- [ ] **ETA 품질 검증 및 실패 시나리오 테스트**  
  - 대표 구간에 대해 “실제 도착 시각 vs 시스템 ETA(도어 투 도어, 환승 포함)”를 비교하는 검증 작업 미진행.  
  - 서울시/버스/ODSAY API 타임아웃·오류·비정상 응답에 대한 실패 시나리오 테스트 케이스도 아직 작성 필요.

## C-3. Logic 3.2 – 택시 ETA/요금 연동

### C-3.1 택시 ETA/요금 API 설계

- [ ] 사용 서비스 결정
  - [ ] 카카오T / 타다 / 다른 택시/모빌리티 API 중 하나 선택
- [ ] 요청/응답 스키마 파악
  - [ ] 입력: 출발지(lat/lng), 도착지(lat/lng), 요청 시간
  - [ ] 출력: 예상 도착 시간 범위, ETA(분), 예상 요금, 옵션(일반/고급 등)

**사용자가 제공/확인해 줄 것**
- [ ] 선택한 택시 API의 문서 링크 + 샘플 응답(JSON) 1~2개
- [ ] `.env`에 사용할 키 이름 (예: `TAXI_API_KEY`)

### C-3.2 Logic 3.2와의 통합

- [ ] Logic 3.2에서 택시 제안 기준 정의
  - [ ] 대중교통 ETA vs 택시 ETA 비교 로직 (몇 분 이상 차이 나야 제안할지)
  - [ ] 요금 상한/경고 메시지 정책
- [ ] `/context/taxi/suggest` 응답 확장
  - [ ] 택시 ETA/요금/도착 시간 범위를 포함하는 응답 스키마 설계
  - [ ] OpenAPI 스펙(`v1.yaml`) 업데이트

**사용자가 제공/확인해 줄 것**
- [ ] “언제 택시를 추천할지”에 대한 비즈니스 기준:
  - [ ] 출근: 지각까지 남은 시간 vs 택시 ETA 차이
  - [ ] 퇴근: 막차 끊긴 후, 요금 vs 거리 기준 등

---

## 실행 순서 제안

1. 공통 준비(키/테스트 정책/로그) 정리
2. C-1 (ETA · Door-to-Door + 간단한 혼잡도 텍스트)  
3. C-2 (환승 대기시간 → TPEG 지연)  
4. C-3 (택시 API 연동)  

각 단계로 들어갈 때, 위 리스트에서 “사용자가 제공/확인해 줄 것” 항목부터 채워 주면  
