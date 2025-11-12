# 모듈 설계서 (MODULES.md)

> 각 모듈의 상세 설계 및 비즈니스 로직을 정의하는 문서입니다.

## 📋 목차

- [AI 패턴 학습 모듈](#ai-패턴-학습-모듈)
- [경로 최적화 모듈](#경로-최적화-모듈)
- [위험 관리 모듈](#위험-관리-모듈)

---

## 🤖 AI 패턴 학습 모듈

**위치**: `server/app/modules/ai_pattern/`  
**API 라우터**: `server/app/api/v1/ai_pattern_router.py`

### 개요

사용자의 이동 패턴을 학습하고 분석하여 개인화된 경로 추천 및 예측을 제공하는 모듈입니다.

### 주요 기능

1. **패턴 학습**
   - 사용자의 이동 경로 데이터 수집
   - 시간대별, 요일별 패턴 분석
   - 머신러닝 모델 학습

2. **패턴 예측**
   - 현재 위치 기반 다음 경로 예측
   - 목적지 추천
   - 예상 소요 시간 계산

3. **패턴 조회**
   - 학습된 패턴 목록 조회
   - 패턴 통계 정보 제공

### 비즈니스 로직

```python
# modules/ai_pattern/service.py
class AIPatternService:
    - learn_pattern(user_id, journey_data) -> Dict
    - get_patterns(user_id) -> List[Dict]
    - predict_next_path(user_id, current_location) -> Dict
```

### 데이터 모델

- **입력**: 여정 데이터 (Journey 모델)
- **출력**: 패턴 정보, 예측 결과

### API 엔드포인트

- `POST /api/v1/ai-pattern/learn` - 패턴 학습 시작
- `GET /api/v1/ai-pattern/patterns` - 패턴 목록 조회

### 향후 계획

- [ ] 머신러닝 모델 선택 (예: LSTM, Transformer)
- [ ] 실시간 패턴 업데이트
- [ ] 패턴 기반 알림 기능

---

## 🗺️ 경로 최적화 모듈

**위치**: `server/app/modules/path_optimize/`  
**API 라우터**: `server/app/api/v1/path_optimize_router.py`

### 개요

시작점과 종료점을 기반으로 최적의 경로를 계산하고, 위험 지역을 회피하는 경로를 제공하는 모듈입니다.

### 주요 기능

1. **경로 최적화**
   - 최단 경로 계산
   - 위험 지역 회피
   - 다중 제약 조건 지원 (시간, 거리, 안전도)

2. **위험도 계산**
   - 경로의 위험도 점수 계산
   - 실시간 위험 정보 반영

3. **최적화 이력**
   - 사용자별 최적화 이력 저장
   - 이력 기반 개선

### 비즈니스 로직

```python
# modules/path_optimize/service.py
class PathOptimizeService:
    - optimize_path(start_point, end_point, constraints) -> Dict
    - get_optimization_history(user_id) -> List[Dict]
    - calculate_risk_score(path) -> float
```

### 데이터 모델

- **입력**: 시작점, 종료점, 제약 조건
- **출력**: 최적화된 경로 (LineString), 거리, 예상 시간, 위험도

### API 엔드포인트

- `POST /api/v1/path-optimize/optimize` - 경로 최적화
- `GET /api/v1/path-optimize/history` - 최적화 이력 조회

### 기술 스택

- **PostGIS**: 공간 데이터 처리 및 경로 계산
- **알고리즘**: A* 알고리즘 또는 Dijkstra 알고리즘

### 향후 계획

- [ ] 실시간 교통 정보 반영
- [ ] 다중 경로 옵션 제공
- [ ] 사용자 선호도 기반 가중치 적용

---

## ⚠️ 위험 관리 모듈

**위치**: `server/app/modules/risk_manage/`  
**API 라우터**: `server/app/api/v1/risk_manage_router.py`

### 개요

시민 리포트를 수집하고, 위험 지역을 관리하며, 실시간 위험 정보를 제공하는 모듈입니다.

### 주요 기능

1. **시민 리포트 관리**
   - 리포트 생성 및 저장
   - 리포트 검증 및 승인
   - 리포트 상태 관리

2. **위험 지역 관리**
   - 위험 지역 자동 생성 (리포트 기반)
   - 위험 지역 업데이트
   - 위험 지역 조회 (공간 쿼리)

3. **위험 정보 제공**
   - 특정 지역의 위험도 조회
   - 실시간 위험 정보 업데이트

### 비즈니스 로직

```python
# modules/risk_manage/service.py
class RiskManageService:
    - create_report(reporter_id, location, risk_type, description) -> Dict
    - get_reports(filters) -> List[Dict]
    - get_risk_zones(bounds) -> List[Dict]
    - update_risk_zone(zone_id, data) -> Dict
```

### 데이터 모델

- **입력**: 리포트 정보 (위치, 유형, 설명)
- **출력**: 리포트 정보, 위험 지역 정보 (Geometry)

### API 엔드포인트

- `POST /api/v1/risk-manage/report` - 리포트 생성
- `GET /api/v1/risk-manage/reports` - 리포트 목록 조회
- `GET /api/v1/risk-manage/risk-zones` - 위험 지역 조회

### 기술 스택

- **PostGIS**: 공간 데이터 저장 및 쿼리
- **Point Geometry**: 리포트 위치 저장
- **Polygon Geometry**: 위험 지역 저장 (향후)

### 향후 계획

- [ ] 리포트 검증 시스템
- [ ] 위험 지역 자동 클러스터링
- [ ] 위험도 레벨 분류 (낮음/보통/높음/매우높음)
- [ ] 리포트 통계 및 분석

---

## 🔄 모듈 간 상호작용

```
┌─────────────────┐
│  AI Pattern     │
│   (학습)        │
└────────┬────────┘
         │ 패턴 데이터
         ▼
┌─────────────────┐
│ Path Optimize   │◄──┐
│  (최적화)       │   │ 위험 정보
└────────┬────────┘   │
         │             │
         ▼             │
┌─────────────────┐   │
│ Risk Manage     │───┘
│  (위험 관리)     │
└─────────────────┘
```

### 데이터 흐름

1. **Risk Manage** → **Path Optimize**: 위험 지역 정보 제공
2. **AI Pattern** → **Path Optimize**: 사용자 패턴 기반 경로 추천
3. **Path Optimize** → **AI Pattern**: 최적화된 경로 데이터 수집

---

## 📝 설계 원칙

### 1. 모듈 독립성
- 각 모듈은 독립적인 비즈니스 로직을 가집니다
- 모듈 간 의존성을 최소화합니다

### 2. 서비스 계층 분리
- API 라우터는 HTTP 요청/응답만 처리
- 비즈니스 로직은 `service.py`에만 위치
- 데이터베이스 접근은 모델을 통해서만

### 3. 확장 가능성
- 향후 MSA 전환 시 모듈 단위로 분리 가능
- 새로운 기능 추가 시 기존 모듈에 영향 최소화

---

## 🔗 관련 문서

- [프로젝트 헌법](../AGENTS.md) - 전체 프로젝트 규칙
- [백엔드 README](../server/README.md) - 백엔드 개발 가이드
- [OpenAPI 스펙](./openapi/v1.yaml) - API 설계도

