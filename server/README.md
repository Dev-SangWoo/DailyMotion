# 데일리모션 백엔드 (FastAPI)

데일리모션 프로젝트의 FastAPI 백엔드 서버입니다. **모듈형 모놀리식 아키텍처**를 따릅니다.

## 📁 디렉토리 구조

```
server/
├── app/                  # 1. FastAPI 애플리케이션 루트
│   ├── api/              # 2. '국경' (OpenAPI 라우터)
│   │   ├── v1/
│   │   │   ├── ai_pattern_router.py
│   │   │   ├── path_optimize_router.py
│   │   │   ├── risk_manage_router.py
│   │   │   ├── user_router.py
│   │   │   └── __init__.py
│   │   └── __init__.py
│   │
│   ├── core/             # 3. '헌법' 시행 (설정, 인증)
│   │   ├── config.py     # (NHN Cloud 키 등 환경변수)
│   │   ├── security.py   # (인증/인가 로직)
│   │   └── __init__.py
│   │
│   ├── db/               # 4. '주춧돌' (PostgreSQL/PostGIS)
│   │   ├── database.py   # (DB 세션 관리)
│   │   └── models/       # (DB 테이블 모델, 예: User, Journey)
│   │       ├── __init__.py
│   │       ├── user.py
│   │       ├── journey.py
│   │       └── report.py
│   │
│   ├── modules/          # 5. '가상 MSA' (핵심 비즈니스 로직)
│   │   ├── ai_pattern/   # (AI 패턴 학습 모듈)
│   │   │   ├── __init__.py
│   │   │   └── service.py
│   │   ├── path_optimize/  # (경로 최적화 모듈)
│   │   │   ├── __init__.py
│   │   │   └── service.py
│   │   ├── risk_manage/  # (위험 관리 & 시민 리포트 모듈)
│   │   │   ├── __init__.py
│   │   │   └── service.py
│   │   └── __init__.py
│   │
│   ├── main.py           # (FastAPI 앱 실행)
│   └── __init__.py
│
├── requirements.txt      # (FastAPI, PostGIS 등)
└── README.md
```

## 📜 뼈대와 헌법 (설명)

### modules/ (헌법 2장 [제1조]: 모듈형 모놀리식)

여기가 '데일리모션'의 '지속가능성'을 좌우할 핵심입니다.

'AI 패턴', '경로 최적화', '위험 관리'가 **'가상의 MSA'**처럼 `service.py` 파일 안에 격리됩니다.

나중에 앱이 커져서 'AI 패턴' 모듈만 분리(MSA)하고 싶다면, 이 `modules/ai_pattern/` 폴더만 떼어내면 됩니다. '튼튼한 숲'을 위한 '미래 대비형' 설계입니다.

### api/ (헌법 3장 [제1조]: OpenAPI)

프론트엔드(`client/`)와 만나는 유일한 '국경'입니다.

`modules/`에 있는 '비즈니스 로직(service)'을 가져와서 'HTTP API'로 노출시키는 역할만 합니다.

FastAPI가 이 파일들을 읽어 `docs/openapi/v1.yaml` '설계도'와 `/docs` 문서를 자동으로 생성합니다.

### db/ (헌법 2장 [제3장]: PostgreSQL/PostGIS)

`db/models/` 폴더에 `LineString`(경로), `Point`(위치) 등 PostGIS 타입이 정의된 테이블 모델(SQLAlchemy)이 위치합니다.

### core/ (헌법 시행)

- **config.py**: 환경 변수 관리 (NHN Cloud 키, 데이터베이스 설정 등)
- **security.py**: 인증/인가 로직 (JWT 토큰, 비밀번호 해싱)

## 🚀 시작하기

### 1. 환경 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# 애플리케이션 설정
DEBUG=False
APP_NAME=데일리모션 API
APP_VERSION=1.0.0

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=dailymotion
# 또는 전체 URL 사용
# DATABASE_URL=postgresql://user:password@localhost:5432/dailymotion

# NHN Cloud 설정
NHN_CLOUD_ACCESS_KEY=your-access-key
NHN_CLOUD_SECRET_KEY=your-secret-key
NHN_CLOUD_REGION=kr1

# 인증 설정
SECRET_KEY=your-secret-key-here-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS 설정
CORS_ORIGINS=["http://localhost:3000","http://localhost:8081"]
```
### 2. 의존성 설치

```bash
pip install -r requirements.txt
```

### 3. 데이터베이스 설정

PostgreSQL에 PostGIS 확장을 설치해야 합니다:

```sql
CREATE DATABASE dailymotion;
\c dailymotion
CREATE EXTENSION postgis;
```

### 4. 서버 실행
source venv_server/bin/activate

```bash
# 개발 모드 (자동 리로드)
uvicorn app.main:app --reload

# 프로덕션 모드
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

서버는 `http://localhost:8000`에서 실행되며, API 문서는 `http://localhost:8000/docs`에서 확인할 수 있습니다.

## 📝 개발 가이드

### 1. 새로운 API 엔드포인트 추가하기

1. `api/v1/` 디렉토리에 새 라우터 파일 생성 (예: `new_feature_router.py`)
2. `modules/` 디렉토리에 해당 비즈니스 로직 모듈 생성
3. 라우터에서 모듈의 서비스를 호출
4. `api/v1/__init__.py`에 라우터 등록

### 2. 새로운 모듈 추가하기

1. `modules/` 디렉토리에 새 폴더 생성
2. `service.py` 파일에 비즈니스 로직 구현
3. 필요시 `api/v1/`에 라우터 생성하여 노출

### 3. 데이터베이스 모델 추가하기

1. `db/models/` 디렉토리에 새 모델 파일 생성
2. PostGIS 타입 사용 시 `geoalchemy2`의 `Geometry` 사용
3. `db/models/__init__.py`에 모델 import 추가

### 4. 마이그레이션 실행하기

```bash
# 마이그레이션 생성
alembic revision --autogenerate -m "설명"

# 마이그레이션 적용
alembic upgrade head
```

## 🔗 관련 문서

- [프로젝트 헌법](../AGENTS.md) - 전체 프로젝트 규칙
- [OpenAPI 스펙](../docs/openapi/v1.yaml) - API 설계도
- [클라이언트 README](../client/README.md) - 프론트엔드 가이드

## 🏗️ 아키텍처 원칙

### 모듈형 모놀리식 (Modular Monolithic)

- 각 모듈은 독립적인 비즈니스 로직을 가집니다
- 모듈 간 의존성을 최소화합니다
- 향후 MSA로 전환 시 모듈 단위로 분리 가능합니다

### 관심사의 분리

- **api/**: HTTP 요청/응답 처리만 담당
- **modules/**: 비즈니스 로직만 담당
- **db/**: 데이터베이스 접근만 담당
- **core/**: 공통 설정 및 유틸리티

{
  "homeAddress": "string",
  "workAddress": "string",
  "targetArrivalTime": "19:56:49",
  "firstMileDefaultDuration": 5,
  "lastMileDefaultDuration": 7,
  "preferenceRoutes": [
    "string"
  ],
  "alertStartTime": "07:56:49",
  "homeLatitude":  37.4876327473647,
  "homeLongitude": 126.889648173149,
  "workLatitude": 37.4988400846064,
  "workLongitude": 126.890309191986
}