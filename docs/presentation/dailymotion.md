~~# DailyMotion 프로젝트 완전 가이드

> **목적**: 이 문서는 DailyMotion 프로젝트의 전체 구조를 이해하고, 각 폴더와 파일의 역할을 파악하여 빠르게 프로젝트에 기여할 수 있도록 돕는 종합 가이드입니다.
>
> **최종 업데이트**: 2025-11-21
> **프로젝트 버전**: v3.0

---

## 📚 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [문서 체계](#2-문서-체계)
3. [루트 디렉토리 구조](#3-루트-디렉토리-구조)
4. [백엔드 server](#4-백엔드-server)
5. [프론트엔드 client](#5-프론트엔드-client)
6. [API 문서 및 계약 docs](#6-api-문서-및-계약-docs)
7. [데이터 및 설정 파일](#7-데이터-및-설정-파일)
8. [개발 워크플로우](#8-개발-워크플로우)
9. [핵심 비즈니스 로직 요약](#9-핵심-비즈니스-로직-요약)
10. [FAQ](#10-faq)
11. [테스트·품질 근거](#11-테스트품질-근거)

---

## 1. 프로젝트 개요

### 1.1 DailyMotion이란?

**DailyMotion**은 개인 맞춤형 출퇴근 비서 시스템입니다. 사용자의 출퇴근 경험을 '수동적 정보 확인'에서 '능동적 실시간 케어'로 전환하는 것이 핵심 목표입니다.

**핵심 컨셉**: "Just in Time, Just for Me"
- 나의 습관과 오늘의 상황에 맞춰
- 지금 꼭 필요한 정보만
- 알아서 챙겨줍니다

### 1.2 기술 스택

| 구분 | 기술 |
|------|------|
| **프론트엔드** | React Native, Zustand, React Query, Styled-components |
| **백엔드** | Python, FastAPI, PostgreSQL, PostGIS |
| **인프라** | NHN Cloud (NKS, Object Storage, AI/ML) |
| **외부 API** | ODSAY (대중교통), 서울시 실시간 API (지하철/버스) |
| **개발 방법론** | TDD (Test-Driven Development) |

### 1.3 아키텍처 원칙

**모듈형 모놀리식 (Modular Monolithic)**
- 모놀리식의 단순함 유지
- 각 모듈은 독립적인 비즈니스 로직
- 향후 MSA 전환 시 모듈 단위 분리 가능

**Design-First API**
- OpenAPI 스펙을 먼저 정의
- 프론트엔드/백엔드가 계약 기반으로 개발
- 자동 문서 생성 및 클라이언트 코드 생성

---

## 2. 문서 체계

### 2.1 핵심 문서 (반드시 읽어야 할 문서)

| 문서 | 목적 | 대상 |
|------|------|------|
| **claude.md** | 프로젝트 헌법 (개발 규칙, 아키텍처 원칙) | 모든 개발자 + AI |
| **AGENTS.md** | 상세 개발 규약 (프론트/백엔드 계약) | 모든 개발자 + AI |
| **README.md** | 프로젝트 소개 및 설치 가이드 | 신규 개발자 |
| **docs/presentation/dailymotion.md** | 🎯 이 문서 (프로젝트 구조 가이드) | 모든 개발자 |

### 2.2 API 문서

| 문서 | 위치 | 설명 |
|------|------|------|
| **OpenAPI 스펙** | `docs/openapi/v1.yaml` | API 설계도 (SSOT) |
| **서비스 가이드** | `docs/presentation/serviceGuide.md` | 심사위원용 기술 프레젠테이션 |

### 2.3 백엔드 모듈 문서

| 문서 | 위치 | 설명 |
|------|------|------|
| **모듈 설계서** | `docs/MODULES.md` | 전체 모듈 구조 및 역할 |
| **Path Optimize API** | `server/docs/path_optimize/API.md` | 경로 최적화 모듈 API 상세 |
| **Logic 가이드** | `server/docs/path_optimize/LOGIC_GUIDE.md` | Logic 1.1~4.3 상세 설명 |
| **데이터베이스 스키마** | `server/docs/USERS_SCHEMA.md` | DB 테이블 구조 및 관계 |

### 2.4 프로젝트 관리 문서

| 문서 | 위치 | 설명 |
|------|------|------|
| **진행 상황** | `PROGRESS_DAILYMOTION_BACKEND.md` | Phase A/B 진행 로그 |
| **작업 로드맵** | `TASKS_DAILYMOTION_ROADMAP.md` | Phase A~E 전체 TODO |
| **시나리오** | `시나리오.md` | 사용자 시나리오 및 UX 흐름 |

---

## 3. 루트 디렉토리 구조

```
dailyMotion/
├── 📜 claude.md                    # 프로젝트 헌법 (SSOT)
├── 📜 AGENTS.md                    # 상세 개발 규약
├── 📜 README.md                    # 프로젝트 소개
├── 📜 PROGRESS_DAILYMOTION_BACKEND.md   # 백엔드 진행 로그
├── 📜 TASKS_DAILYMOTION_ROADMAP.md      # 전체 작업 로드맵
├── 📜 TASKS_PHASE_C_REALTIME.md         # Phase C 실시간 연동
├── 📜 시나리오.md                   # 사용자 시나리오
│
├── 🏗️ client/                       # 프론트엔드 (React Native)
│   ├── src/                         # 소스 코드
│   ├── package.json                 # 의존성 관리
│   └── README.md                    # 프론트엔드 가이드
│
├── 🌳 server/                       # 백엔드 (FastAPI)
│   ├── app/                         # 애플리케이션 코드
│   ├── alembic/                     # DB 마이그레이션
│   ├── config/                      # 설정 파일
│   ├── data/                        # 데이터 파일 (CSV 등)
│   ├── docs/                        # 백엔드 문서
│   ├── k8s/                         # Kubernetes 배포 설정
│   ├── requirements.txt             # Python 의존성
│   ├── docker-compose.yml           # 로컬 개발 환경
│   └── README.md                    # 백엔드 가이드
│
├── 🤝 docs/                         # API 문서 및 설계
│   ├── openapi/                     # OpenAPI 스펙 (v1.yaml)
│   ├── api-contracts.md             # API 계약서
│   ├── frontend_integration.md      # 프론트엔드 통합 가이드
│   ├── api-changelog.md             # API 변경 이력
│   ├── MODULES.md                   # 모듈 설계서
│   └── dailymotion.md               # 🎯 이 문서
│
├── 📦 data/                         # 프로젝트 데이터
│   ├── average_duration_stats.csv   # 평균 소요시간 통계
│   └── master_station_map.json      # ODSAY 역 매핑 데이터
│
└── 🤖 .claude/                      # Claude Code 설정
    └── agents/                      # AI 에이전트 설정
```

---

## 4. 백엔드 (server/)

### 4.1 전체 구조

```
server/
├── app/                         # FastAPI 애플리케이션 루트
│   ├── main.py                  # 🚀 FastAPI 앱 진입점
│   ├── api/                     # 🌐 API 라우터 (국경)
│   ├── core/                    # ⚙️ 설정, 인증, 유틸리티
│   ├── db/                      # 🗄️ 데이터베이스 모델
│   ├── modules/                 # 🧩 비즈니스 로직 (가상 MSA)
│   ├── services/                # 🔌 외부 서비스 클라이언트
│   └── common/                  # 🔧 공통 유틸리티
│
├── alembic/                     # DB 마이그레이션
│   ├── versions/                # 마이그레이션 스크립트
│   └── env.py                   # Alembic 설정
│
├── config/                      # 환경 설정
├── data/                        # CSV, 초기 데이터
├── docs/                        # 백엔드 문서
├── k8s/                         # Kubernetes 매니페스트
├── requirements.txt             # Python 패키지
├── docker-compose.yml           # 로컬 DB/Redis 등
└── run_test.sh                  # 테스트 실행 스크립트
```

### 4.2 app/ 디렉토리 상세

#### 4.2.1 main.py
- **역할**: FastAPI 앱의 진입점
- **주요 기능**:
  - CORS 설정
  - 라우터 등록 (`api/v1/`)
  - 미들웨어 설정
  - `/health` 엔드포인트

#### 4.2.2 api/ - API 라우터 (국경)

```
api/
├── __init__.py
└── v1/                          # API v1
    ├── __init__.py
    ├── path_optimize_router.py  # 경로 최적화 API
    ├── user_router.py            # 사용자 설정 API
    ├── risk_manage_router.py     # 위험 관리 API
    ├── ai_pattern_router.py      # AI 패턴 학습 API (미구현)
    └── health_router.py          # 헬스체크 API
```

**중요**: 라우터는 HTTP 요청/응답만 처리하고, 비즈니스 로직은 `modules/` 의 service 레이어에 위임합니다. (경로 최적화 로직: `server/app/modules/path_optimize/service.py`)

#### 4.2.3 core/ - 설정 및 인증

```
core/
├── __init__.py
├── config.py          # 환경 변수 관리 (NHN Cloud, DB 등)
└── security.py        # JWT 인증, 비밀번호 해싱
```

**config.py**:
- `Settings` 클래스로 환경 변수 관리
- Pydantic 기반 타입 검증
- `.env` 파일 자동 로드

#### 4.2.4 db/ - 데이터베이스 모델

```
db/
├── __init__.py
├── database.py        # DB 세션 관리 (SQLAlchemy)
└── models/            # DB 테이블 모델
    ├── __init__.py
    ├── user.py        # 사용자 테이블
    ├── journey.py     # 여정 테이블
    ├── report.py      # 시민 리포트 테이블
    └── path_optimize.py  # 경로 최적화 관련 테이블 재노출
```

**주요 테이블**:
- `users`: 사용자 정보
- `journeys`: 출퇴근 이력
- `reports`: 시민 리포트
- `commute_settings`: 출퇴근 설정
- `average_duration`: 구간별 평균 소요시간
- `optimization_history`: 경로 최적화 이력
- `last_bus_schedule`: 막차 시간표

#### 4.2.5 modules/ - 비즈니스 로직 (핵심)

```
modules/
├── __init__.py
├── path_optimize/       # 🗺️ 경로 최적화 모듈 (핵심)
├── ai_pattern/          # 🤖 AI 패턴 학습 (미구현)
└── risk_manage/         # ⚠️ 위험 관리 및 시민 리포트
```

##### path_optimize/ (경로 최적화 모듈) - 가장 중요!

```
path_optimize/
├── __init__.py
├── service.py                    # 🎯 핵심 비즈니스 로직 (Logic 1.1~4.3)
│
├── models/                       # 📦 DB 모델 및 Pydantic 스키마
│   ├── db_models.py              # SQLAlchemy 모델
│   └── api_models.py             # Pydantic API 스키마
│
├── clients/                      # 🔌 외부 API 클라이언트
│   ├── ai_pattern_client.py      # AI 패턴 학습 클라이언트
│   └── risk_manage_client.py     # 위험 관리 클라이언트
│   # (서울시 실시간 API 클라이언트는 service.py 내부에 통합)
│
├── mock_user_db.py               # 📝 사용자 설정 저장소 (DB + Mock)
├── average_duration_repository.py      # 평균 소요시간 조회
├── optimization_history_repository.py  # 최적화 이력 저장
├── last_bus_schedule_repository.py     # 막차 시간표 조회
├── seoul_subway_congestion_repository.py  # 혼잡도 조회
│
├── tests/                        # 🧪 테스트 (파일 34개, 케이스 229개 통과)
│   ├── test_e2e_commute_flow.py  # E2E 테스트
│   └── ...
│
├── DESIGN.md                     # 설계 문서
├── TASKS_PATH_OPTIMIZE.md        # 작업 목록
├── SERVICE_REVIEW.md             # 코드 리뷰
├── COMPLIANCE_AUDIT.md           # 규정 준수 감사
├── phase12.5.md                  # Phase 1.2.5 작업 로그
└── solution.md                   # 솔루션 설계서
```

**service.py** (2,800+ 라인):
- `PathOptimizeService` 클래스
- Logic 1.1~4.3 전체 구현
- 20개 이상의 public 메서드 (Logic 관련 12개 + 헬퍼 메서드들)
- ODSAY, 실시간 API, DB 연동
- 서울시 지하철/버스 실시간 API 클라이언트 통합

**주요 메서드**:
1. `get_commute_briefing()` - Logic 1.1 (출근 알림)
2. `get_retreat_mode_last_bus_alert()` - Logic 1.2 (막차 알림)
3. `get_auto_mode_switch_action()` - Logic 2.1 (자동 모드 전환)
4. `get_alternative_route_suggestion()` - Logic 2.2 (대안 경로)
5. `get_seating_optimization()` - Logic 2.3 (착석 최적화)
6. `get_exception_alert()` - Logic 3.1 (지연 감지)
7. `get_taxi_suggestion()` - Logic 3.2 (택시 제안)
8. `get_routes_by_retreat_goal()` - Logic 4.2 (퇴근 목표별 경로)
9. `get_smart_polling_frequency()` - Logic 4.3 (스마트 폴링)
10. 기타 헬퍼 메서드

##### risk_manage/ (위험 관리 모듈)

```
risk_manage/
├── __init__.py
├── service.py         # 위험 지역 관리, 시민 리포트 처리
└── models/            # DB 모델 및 스키마
```

**주요 기능**:
- 시민 리포트 생성 (`create_report`)
- 위험 지역 조회 (`get_risk_zones`)
- PostGIS 기반 공간 쿼리

##### ai_pattern/ (AI 패턴 학습 모듈)

```
ai_pattern/
├── __init__.py
└── service.py         # Mock 구현 (추후 개발 예정)
```

**상태**: 현재 미구현 (Phase E에서 개발 예정)

#### 4.2.6 services/ - 외부 서비스 클라이언트

```
services/
└── (공통 외부 API 클라이언트들 - 필요 시 추가)
```

**참고**: 현재는 `modules/path_optimize/clients/` 에 ODSAY, 서울시 API 클라이언트가 위치합니다.

### 4.3 데이터베이스 마이그레이션 (alembic/)

```
alembic/
├── versions/                # 마이그레이션 스크립트
│   ├── 83d6e363514e_create_initial_schema_for_path_optimize_.py
│   └── 4a2f9c7d9b1b_add_last_bus_schedule_table.py
├── env.py                   # Alembic 설정
└── alembic.ini              # Alembic 구성 파일
```

**마이그레이션 명령어**:
```bash
# 새 마이그레이션 생성
alembic revision --autogenerate -m "설명"

# 마이그레이션 적용
alembic upgrade head

# 마이그레이션 롤백
alembic downgrade -1
```

### 4.4 테스트 (tests/)

**주요 테스트 파일**:
- `server/app/modules/path_optimize/tests/test_e2e_commute_flow.py`
  - Logic 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2, 4.3 E2E 테스트
  - 총 229개 테스트, 100% 통과

**테스트 실행**:
```bash
# 전체 테스트
pytest

# 특정 모듈 테스트
pytest server/app/modules/path_optimize/tests/

# 커버리지
pytest --cov=app
```

---

## 5. 프론트엔드 (client/)

### 5.1 전체 구조

```
client/
├── src/
│   ├── @types/           # TypeScript 타입 정의
│   ├── assets/           # 이미지, 폰트 등 정적 자산
│   ├── components/       # UI 컴포넌트
│   │   ├── common/       # 공통 컴포넌트 (Button, Header 등)
│   │   └── domain/       # 도메인별 컴포넌트 (JourneyCard 등)
│   ├── hooks/            # 커스텀 훅
│   │   ├── queries/      # React Query 조회 훅
│   │   └── mutations/    # React Query 변경 훅
│   ├── navigators/       # React Navigation 설정
│   ├── screens/          # 화면 컴포넌트
│   │   ├── DailyBriefing/   # 출근 브리핑 화면
│   │   ├── SafetyGuard/     # 안전 가드 화면
│   │   └── ...
│   ├── services/         # API 클라이언트
│   │   ├── api.ts        # Axios 인스턴스
│   │   └── generated/    # OpenAPI 자동 생성 코드
│   ├── stores/           # Zustand 전역 상태
│   │   ├── useAuthStore.ts      # 인증 상태
│   │   └── useSettingStore.ts   # 설정 상태
│   └── styles/           # 스타일
│       ├── theme.ts      # 테마 (색상, 폰트, 간격)
│       └── global.ts     # 글로벌 스타일
│
├── package.json          # 의존성
└── README.md             # 프론트엔드 가이드
```

### 5.2 핵심 원칙 (AGENTS.md 기반)

#### 상태 관리: Zustand + React Query

**❌ 금지**:
```typescript
// ❌ useEffect + useState로 API 호출 금지
const [data, setData] = useState();
useEffect(() => {
  fetch('/api').then(res => setData(res));
}, []);
```

**✅ 권장**:
```typescript
// ✅ React Query 사용
const { data, isLoading, error } = useGetCommuteQuery(userId);
```

**규칙**:
- **서버 상태**: React Query만 사용
- **UI 상태**: Zustand만 사용 (인증 토큰, 앱 설정 등)

#### 스타일링: Styled-components + Theme

**❌ 금지**:
```typescript
// ❌ 매직 넘버 사용 금지
<Text style={{ color: '#FFF', fontSize: 16 }}>
```

**✅ 권장**:
```typescript
// ✅ 테마 사용
<StyledText color={theme.colors.primary} fontSize={theme.fontSizes.md}>
```

### 5.3 주요 화면 및 API 연동

| 화면 | API 엔드포인트 | 설명 |
|------|----------------|------|
| **출근 브리핑** | `GET /briefings/commute` | Logic 1.1/1.2 |
| **설정 화면** | `POST /briefings/commute-settings` | 출퇴근 설정 저장 |
| **ETA 화면** | `GET /context/mode-switch` | Logic 2.1 (자동 전환) |
| **대안 경로 배너** | `POST /context/routes/alternative` | Logic 2.2 (Gate 검증) |
| **환승 안내** | `GET /briefings/transfer-reminder` | Logic 2.4 |
| **지연 배너** | `POST /context/exceptions/delays` | Logic 3.1 |
| **택시 제안** | `POST /context/taxi/suggest` | Logic 3.2 |
| **안전 지도** | `GET /risk-manage/risk-zones` | 위험 지역 표시 |

---

## 6. API 문서 및 계약 (docs/)

### 6.1 OpenAPI 스펙 (docs/openapi/v1.yaml)

**역할**: API 설계도 (Single Source of Truth)

**구조**:
```yaml
openapi: 3.0.0
info:
  title: DailyMotion API
  version: 1.0.0
paths:
  /api/v1/briefings/commute:
    get:
      summary: 출근 브리핑 조회
      parameters: [...]
      responses: [...]
  # ... 기타 엔드포인트
```

**중요**:
- 모든 API 변경은 **이 파일을 먼저 수정**
- 백엔드/프론트엔드는 이 스펙을 기준으로 개발
- 자동 문서 생성: `http://localhost:8000/docs`

### 6.2 API 계약서 (api-contracts.md)

**역할**: 프론트엔드 개발자를 위한 API 사용 가이드

**내용**:
- 각 엔드포인트의 요청/응답 예시
- 필드 설명
- 에러 코드
- Envelope 패턴 (`{"data": {...}}` 또는 `{"error": {...}}`)

### 6.3 프론트엔드 통합 가이드 (frontend_integration.md)

**역할**: 화면별 API 호출 방법

**내용**:
- 출발 전 화면 → `GET /briefings/commute`
- 이동 중 대안 경로 → `POST /context/routes/alternative`
- 돌발 상황 배너 → `POST /context/exceptions/delays`
- React Query 사용 예시

---

## 7. 데이터 및 설정 파일

### 7.1 data/ 디렉토리

```
data/
└── average_duration_stats.csv   # 구간별 평균 소요시간 통계
```

**average_duration_stats.csv**:
- 서울교통공사 열차시간표 API 기반
- `segment_id`, `hour`, `day_of_week`, `avg_duration`, `sample_count` 등
- Logic 3.1 (지연 감지)에서 사용

### 7.2 server/data/ 디렉토리

```
server/data/
├── import_average_duration_from_csv.py   # CSV → DB 임포트 스크립트
├── build_seoul_subway_timetable.py       # 시간표 수집 스크립트
└── (기타 ETL 스크립트)
```

### 7.3 환경 설정 (.env)

**server/.env** 예시:
```env
# 애플리케이션
DEBUG=False
APP_NAME=데일리모션 API
APP_VERSION=1.0.0

# 데이터베이스
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=dailymotion

# NHN Cloud
NHN_CLOUD_ACCESS_KEY=your-key
NHN_CLOUD_SECRET_KEY=your-secret

# ODSAY API
ODSAY_API_KEY=your-odsay-key

# 서울시 API
SEOUL_SUBWAY_API_KEY=your-subway-key
SEOUL_BUS_API_KEY=your-bus-key

# 인증
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:8081"]
```

---

## 8. 개발 워크플로우

### 8.1 백엔드 개발

#### 1) 환경 설정

```bash
cd server

# 가상환경 생성
python -m venv venv_server

# 가상환경 활성화
source venv_server/bin/activate  # Mac/Linux
# 또는
venv_server\Scripts\activate  # Windows

# 의존성 설치
pip install -r requirements.txt
```

#### 2) 데이터베이스 설정

```bash
# PostgreSQL 설치 (Mac)
brew install postgresql

# PostgreSQL 시작
brew services start postgresql

# 데이터베이스 생성
createdb dailymotion

# PostGIS 확장 설치
psql dailymotion -c "CREATE EXTENSION postgis;"

# 마이그레이션 적용
alembic upgrade head
```

#### 3) 서버 실행

```bash
# 개발 모드 (자동 리로드)
uvicorn app.main:app --reload

# 프로덕션 모드
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 4) API 문서 확인

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

#### 5) 테스트 실행

```bash
# 전체 테스트
pytest

# 특정 모듈
pytest server/app/modules/path_optimize/tests/

# 커버리지
pytest --cov=app --cov-report=html
```

### 8.2 프론트엔드 개발

#### 1) 환경 설정

```bash
cd client

# 의존성 설치
npm install
```

#### 2) 개발 서버 실행

```bash
# Metro 번들러 시작
npm start

# Android 실행
npm run android

# iOS 실행
npm run ios
```

#### 3) API 클라이언트 생성 (선택)

```bash
# OpenAPI 스펙으로부터 TypeScript 클라이언트 생성
npx openapi-typescript-codegen --input ../docs/openapi/v1.yaml --output ./src/services/generated
```

### 8.3 새 기능 추가 워크플로우

#### Design-First 프로세스

```
1. OpenAPI 스펙 정의 (docs/openapi/v1.yaml)
   ↓
2. 테스트 작성 (TDD)
   ↓
3. 백엔드 구현
   - service.py (비즈니스 로직)
   - router.py (HTTP 처리)
   ↓
4. 프론트엔드 구현
   - hooks/queries/ (React Query)
   - screens/ (UI)
   ↓
5. E2E 테스트
   ↓
6. 문서 업데이트
```

#### 예시: 새 Logic 추가

**1) OpenAPI 스펙 정의**:
```yaml
# docs/openapi/v1.yaml
/api/v1/new-feature:
  get:
    summary: 새 기능
    parameters: [...]
    responses:
      200:
        content:
          application/json:
            schema:
              type: object
              properties:
                data: [...]
```

**2) 테스트 작성**:
```python
# server/app/modules/path_optimize/tests/test_new_feature.py
def test_new_feature():
    result = service.new_feature_method()
    assert result["action"] == "EXPECTED_ACTION"
```

**3) 백엔드 구현**:
```python
# server/app/modules/path_optimize/service.py
class PathOptimizeService:
    def new_feature_method(self, ...):
        # 비즈니스 로직
        return {...}

# server/app/api/v1/path_optimize_router.py
@router.get("/new-feature")
def new_feature_endpoint(...):
    result = service.new_feature_method(...)
    return Envelope(data=result)
```

**4) 프론트엔드 구현**:
```typescript
// client/src/hooks/queries/useNewFeatureQuery.ts
export const useNewFeatureQuery = (params) => {
  return useQuery(['newFeature', params], () =>
    api.get('/api/v1/new-feature', { params })
  );
};

// client/src/screens/NewFeature/index.tsx
const { data, isLoading } = useNewFeatureQuery(params);
```

---

## 9. 핵심 비즈니스 로직 요약

### 9.1 출근 모드 (COMMUTE)

**목표**: 지각 방지

| Logic | 이름 | 트리거 | 주요 기능 |
|-------|------|--------|----------|
| 1.1 | 능동적 출발 알림 | 알림 시작 시각 | Door-to-Door 계산, "지금 출발" 알림 |
| 1.2 | 마지노선 경고 | 목표 시간 임박 | "마지막 교통수단" 긴급 알림 |
| 3.2 | 택시 제안 | 지각 확정 | "택시 타면 정시 도착" 제안 |

### 9.2 퇴근 모드 (RETREAT)

**목표**: 사용자 니즈 충족 (빠르게 vs 편안하게)

| Logic | 이름 | 트리거 | 주요 기능 |
|-------|------|--------|----------|
| 4.1 | 퇴근 목표 선택 | 퇴근 시작 | A(빠르게)/B(착석)/C(평소) 선택 |
| 4.2 | 목표별 경로 제공 | 목표 선택 후 | 선택에 맞는 경로 추천 |
| 1.2 | 막차 알림 | 막차 30분 전 | "선택 경로의 막차 임박" 알림 |

### 9.3 공통 (COMMUTE & RETREAT)

| Logic | 이름 | 트리거 | 주요 기능 |
|-------|------|--------|----------|
| 2.1 | Context Awareness | GPS 변화 | WAITING/WALKING/ON_TRIP 감지, 화면 자동 전환 |
| 2.2 | 고신뢰 대안 경로 | 환승 지점 근처 | 3가지 Gate 검증 (이득/확실성/경험) |
| 2.3 | 착석/환승 최적화 | 탑승 전/환승 전 | 최적 칸 추천 |
| 2.4 | 환승 리마인더 | 환승역 500m 이내 | "다음 역 환승" + 실시간 ETA |
| 3.1 | 지연 감지 | 실시간 vs 평균 비교 | "평소보다 X분 지연" 알림 |
| 4.3 | 스마트 폴링 | GPS/시간 기반 | HIGH(10초)/MEDIUM(30초)/LOW(5분) |

### 9.4 3가지 Gate (Logic 2.2)

**모든 Gate를 통과해야만 대안 경로 제안**

| Gate | 조건 | 목적 |
|------|------|------|
| **Gate 1** | 출근: 7분+ 절약, 퇴근: 10분+ 절약 | 명확한 이득 |
| **Gate 2** | 환승 여유 ≥ 3분 | 환승 확실성 |
| **Gate 3** | 혼잡도 < 80% | 경험 품질 |

---

## 10. FAQ

### Q1. 새 모듈을 추가하려면?

**A**:
1. `server/app/modules/new_module/` 폴더 생성
2. `service.py` 파일에 비즈니스 로직 작성
3. `models/` 폴더에 DB 모델 및 스키마 정의
4. `server/app/api/v1/new_module_router.py` 라우터 작성
5. `server/app/main.py`에 라우터 등록
6. 테스트 작성 (`tests/`)

### Q2. DB 테이블을 추가하려면?

**A**:
1. `server/app/db/models/` 에 SQLAlchemy 모델 작성
2. `alembic revision --autogenerate -m "add new table"` 실행
3. 생성된 마이그레이션 파일 검토
4. `alembic upgrade head` 실행

### Q3. 프론트엔드에서 새 API를 호출하려면?

**A**:
1. `client/src/hooks/queries/` 에 React Query 훅 작성
   ```typescript
   export const useNewApiQuery = (params) => {
     return useQuery(['newApi', params], () =>
       api.get('/api/v1/new-api', { params })
     );
   };
  ```

---

## 11. 테스트·품질 근거

- OpenAPI SSOT: `docs/openapi/v1.yaml`
- 경로 최적화 로직: `server/app/modules/path_optimize/service.py`
- 계약/E2E 테스트: `server/app/modules/path_optimize/tests/test_e2e_commute_flow.py`
- 임계값·Gate 설명: `server/docs/path_optimize/LOGIC_GUIDE.md`
2. 화면에서 훅 사용
   ```typescript
   const { data, isLoading } = useNewApiQuery(params);
   ```

### Q4. ODSAY API 키를 어떻게 설정하나요?

**A**:
1. ODSAY Lab (https://lab.odsay.com/) 에서 API 키 발급
2. `server/.env` 파일에 추가:
   ```env
   ODSAY_API_KEY=your-odsay-api-key
   ```
3. `server/app/core/config.py` 에서 자동 로드

### Q5. 테스트가 실패하면?

**A**:
1. 에러 메시지 확인
2. `pytest -v` 로 상세 로그 확인
3. 데이터베이스 상태 확인 (`alembic current`)
4. 환경 변수 확인 (`.env`)
5. 의존성 버전 확인 (`pip list`)

### Q6. 프로덕션 배포는 어떻게 하나요?

**A**:
1. `server/k8s/` 디렉토리의 Kubernetes 매니페스트 사용
2. Docker 이미지 빌드:
   ```bash
   docker build -t dailymotion-api:latest .
   ```
3. NHN Cloud NKS에 배포:
   ```bash
   kubectl apply -f k8s/
   ```

### Q7. 실시간 API 연동이 실패하면?

**A**:
- **ODSAY**: Fallback으로 기본값 사용
- **서울시 지하철/버스**: 통계 데이터 → ODSAY 순으로 Fallback
- **혼잡도**: 평균 혼잡도 사용

시스템은 **안전한 Fallback** 구조로 설계되어 있어, 외부 API 실패 시에도 기본 기능은 동작합니다.

### Q8. 문서를 수정하려면?

**A**:
- **API 스펙**: `docs/openapi/v1.yaml` 수정 후 백엔드/프론트엔드 동기화
- **모듈 문서**: 각 모듈의 `README.md` 또는 `DESIGN.md` 수정
- **전체 가이드**: 이 문서 (`docs/dailymotion.md`) 수정

---

## 🎯 다음 단계

### 신규 개발자라면:
1. ✅ **claude.md** 읽기 (프로젝트 헌법)
2. ✅ **AGENTS.md** 읽기 (상세 규약)
3. ✅ **이 문서** 읽기 (전체 구조 파악)
4. ✅ 로컬 환경 설정 (server + client)
5. ✅ `GET /briefings/commute` API 호출해보기
6. ✅ Logic 1.1 테스트 실행해보기

### 기능 개발자라면:
1. ✅ `docs/openapi/v1.yaml` 확인 (API 스펙)
2. ✅ `server/docs/path_optimize/LOGIC_GUIDE.md` 읽기 (비즈니스 로직)
3. ✅ `server/app/modules/path_optimize/service.py` 코드 리뷰
4. ✅ `TASKS_DAILYMOTION_ROADMAP.md` 확인 (작업 목록)
5. ✅ TDD 방식으로 기능 개발

---

**마지막 업데이트**: 2025-11-21
**작성자**: DailyMotion Team
**버전**: v3.0
**문의**: backend@dailymotion.com~~
