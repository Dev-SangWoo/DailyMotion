# 🚇 DailyMotion

<div align="center">

### 실시간 교통 상황과 사용자 맥락을 바탕으로 ‘다음 행동’을 판단하는 출퇴근 의사결정 플랫폼

단순히 경로를 보여주는 데서 끝나지 않고, **지금 출발해야 하는지 · 어떤 대안을 선택해야 하는지 · 지연 시 무엇을 해야 하는지**까지 판단하는 모바일 모빌리티 서비스를 목표로 합니다.

![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

</div>

---

## Overview

DailyMotion은 사용자의 반복적인 출퇴근 상황을 더 능동적으로 지원하기 위해 만든 **실시간 경로 최적화 및 안전 정보 모바일 애플리케이션**입니다.

일반적인 지도 앱이 ‘가능한 경로’를 제공한다면, DailyMotion은 다음 질문에 답하는 것을 목표로 합니다.

- 목표 도착 시간에 맞추려면 **지금 출발해야 하는가?**
- 현재 경로에 문제가 생겼을 때 **대안 경로를 추천할 만큼 충분한 이득이 있는가?**
- 사용자는 현재 **대기 중인지, 걷는 중인지, 탑승 중인지** 어떻게 판단할 것인가?
- 출퇴근 상황과 퇴근 상황은 동일한 최적화 기준을 써야 하는가?
- 날씨, 재난, 대중교통 지연처럼 자주 바뀌는 정보는 **얼마나 자주 갱신해야 하는가?**

이 프로젝트는 React Native 클라이언트와 FastAPI 서버를 함께 구성하고, 대중교통·위치·날씨·재난 데이터를 서비스 로직으로 결합합니다.

---

## 핵심 기능

### 1. 출근 시간 기반 능동적 출발 판단

Door-to-Door 이동 시간을 고려해 목표 도착 시각과 현재 시각 사이의 여유를 계산하고, 사용자가 지금 출발해야 하는지 판단합니다.

```text
Total Travel Time
= First Mile
+ Public Transit
+ Last Mile
```

- `GO_NOW`: 충분한 여유가 있을 때 출발 유도
- `LAST_CHANCE`: 마지막으로 가능한 교통수단을 놓치지 않도록 경고
- `NO_ACTION`: 이미 목표 도착 시간을 만족하기 어려운 상태 등

핵심은 단순 ETA 출력이 아니라 **ETA를 사용자 행동으로 변환**한다는 점입니다.

### 2. GPS 기반 Context Awareness

현재 위치와 이동 속도를 기반으로 사용자의 이동 상태를 추정합니다.

```mermaid
stateDiagram-v2
    [*] --> WAITING
    WAITING --> WALKING: 위치 이동 / 도보 속도
    WALKING --> ON_TRIP: 탑승 속도 감지
    ON_TRIP --> WALKING: 하차 감지
    WALKING --> WAITING: 목적지 근처 도착
```

- `WAITING`: 집/회사 근처 또는 정지 상태
- `WALKING`: First Mile / Last Mile 이동
- `ON_TRIP`: 버스·지하철 탑승 상태

상태 변화는 실시간 ETA 화면 전환이나 알림의 입력으로 사용됩니다.

### 3. 검증된 대안 경로만 제안

사용자에게 대안을 너무 자주 보여주면 추천 자체에 대한 신뢰가 떨어질 수 있습니다. DailyMotion의 경로 최적화 로직은 대안 경로가 실제로 의미 있는지 검증한 뒤 노출하도록 설계되어 있습니다.

```mermaid
flowchart LR
    A[현재 경로 문제 감지] --> B[대안 경로 탐색]
    B --> C{Gate Validation}
    C -->|통과| D[Alternative Route]
    C -->|실패| E[현재 경로 유지]
    D --> F[사용자에게 제안]
```

경로 변경은 ‘다른 경로가 존재한다’는 이유만으로 제안하지 않고, 시간·신뢰성·사용자 상황 등을 고려한 검증 단계를 거치는 방향으로 구현되어 있습니다.

### 4. 출근 / 퇴근 목적 분리

같은 사용자라도 출근과 퇴근의 목표는 다를 수 있습니다.

- **Commute Mode**: 지각 방지, 목표 도착 시각, 빠른 경로 중심
- **Retreat Mode**: 편안함, 좌석 가능성, 막차와 같은 선택 기준 반영

즉 하나의 ‘최단 시간’ 점수로 모든 이동을 평가하지 않고 **사용자 목적에 따라 판단 기준을 분리**했습니다.

### 5. 실시간 이동 추적과 지연 대응

클라이언트의 위치 추적과 서버의 교통 판단 로직을 연결해 이동 중 상태를 갱신합니다.

- Expo Location / Task Manager 기반 위치 데이터
- 실시간 경로 추적 서비스
- 지연 감지
- 도착 예정 시간 업데이트
- 대안 경로 / 택시 제안 로직
- 상황에 따라 polling 주기를 조절하는 Smart Polling

### 6. Daily Briefing & Safety

출발 전 확인해야 하는 정보를 한 화면에 모읍니다.

- 현재/예보 날씨
- 선택 경로 및 대안 경로
- 실시간 이동 상태
- 재난 문자
- 안전 정보
- 위험 지역 및 제보 정보

---

## Decision Flow

```mermaid
flowchart TB
    U[User Settings] --> P[Path Optimize API]
    GPS[GPS / Current State] --> P
    TRANSIT[ODSAY / Transit Data] --> P
    SAFETY[Risk / Disaster Data] --> P
    HISTORY[Journey / Optimization History] --> P

    P --> CONTEXT[Context Detector]
    P --> DELAY[Delay Detector]
    P --> ROUTE[Route Selector]
    P --> GATE[Alternative Route Gate]
    P --> TAXI[Taxi Suggester]

    CONTEXT --> RESULT[Decision Result]
    DELAY --> RESULT
    ROUTE --> RESULT
    GATE --> RESULT
    TAXI --> RESULT

    RESULT --> APP[React Native App]
    APP --> NOTI[Notification / Screen Transition]
```

---

## System Architecture

```mermaid
flowchart TB
    subgraph Client[React Native · Expo]
        SCREEN[Daily Briefing / Navigation / SafetyGuard]
        QUERY[TanStack Query]
        STORE[Zustand]
        LOCATION[Location Tracking]
        MAP[Google Maps / Kakao Map]
    end

    subgraph Server[FastAPI]
        ROUTER[API Routers]
        PATH[Path Optimize Module]
        RISK[Risk Manage Module]
        AI[AI Pattern Module]
        SERVICES[Context / Delay / Gate / Polling Services]
    end

    subgraph Data[Data Layer]
        PG[(PostgreSQL + PostGIS)]
        REDIS[(Redis optional)]
        CSV[Transit / Congestion Data]
    end

    subgraph External[External APIs]
        ODSAY[ODSAY]
        WEATHER[Weather]
        DISASTER[Disaster / Safety Data]
        MAPAPI[Map APIs]
    end

    SCREEN --> QUERY
    SCREEN --> STORE
    LOCATION --> SCREEN
    MAP --> MAPAPI
    QUERY --> ROUTER
    ROUTER --> PATH
    ROUTER --> RISK
    ROUTER --> AI
    PATH --> SERVICES
    PATH --> PG
    SERVICES --> ODSAY
    SERVICES --> CSV
    RISK --> DISASTER
    ROUTER --> REDIS
    SCREEN --> WEATHER
```

---

## Engineering Highlights

### 경로 검색이 아니라 의사결정 로직을 중심에 둠

DailyMotion의 핵심은 ‘A에서 B로 가는 방법’을 새로 만드는 것이 아닙니다. 외부 교통 API가 제공하는 후보 경로 위에 **출발 판단, 지연 대응, 대안 경로 검증, 탑승 상태 판단** 같은 제품 로직을 쌓는 구조입니다.

### 서버 로직을 도메인 단위로 분리

FastAPI 서버는 `path_optimize`, `risk_manage`, `ai_pattern` 모듈과 공통 서비스를 나눠 구성합니다. API 라우터와 비즈니스 로직, DB 모델을 분리해 이동 판단 규칙이 커져도 관리할 수 있도록 구성했습니다.

### 실시간 기능의 비용을 고려한 Smart Polling

실시간 데이터는 자주 가져올수록 정확해 보이지만 API 호출 비용, 배터리, 네트워크 사용량도 증가합니다. 프로젝트에는 상황에 따라 데이터 갱신 빈도를 조정하는 polling scheduler 로직과 관련 테스트가 포함되어 있습니다.

### 경로 최적화 로직을 테스트 가능한 단위로 분해

백엔드에는 출발 판단, 퇴근 모드, Context Awareness, Gate Validation, Seating Optimization, Delay Detection, Taxi Suggestion, Smart Polling 등의 테스트가 분리되어 있습니다.

프론트엔드 역시 Daily Briefing, 온보딩, 공통 카드·스토어 등 핵심 UI 흐름에 Jest와 React Native Testing Library 기반 테스트를 포함합니다.

### API 계약과 구현 문서를 함께 관리

`docs/openapi/v1.yaml`에 API 스펙을 관리하고, 경로 최적화 모듈에는 별도의 Logic Guide / API 문서 / 설계 문서를 두고 있습니다. 복잡한 비즈니스 규칙을 코드에만 남기지 않으려는 구조입니다.

---

## Tech Stack

| Area | Technology | Usage |
| --- | --- | --- |
| Mobile | React Native 0.81.5, React 19 | iOS / Android 앱 |
| Runtime | Expo SDK 54 | 모바일 개발 환경 |
| Server State | TanStack Query 5 | API 상태 / 캐싱 |
| Client State | Zustand 5 | 앱 및 이동 상태 |
| Navigation | React Navigation 7 | Stack / Bottom Tab |
| Map | react-native-maps, Kakao WebView/API | 지도 및 장소 탐색 |
| Location | Expo Location, Task Manager | 실시간 위치 추적 |
| Notification | Expo Notifications | 출발·지연 등 사용자 액션 유도 |
| Backend | FastAPI | REST API / 비즈니스 로직 |
| Validation | Pydantic 2 | 요청·응답 모델 |
| ORM | SQLAlchemy 2 | DB 접근 |
| Database | PostgreSQL + PostGIS | 사용자·경로·공간 데이터 |
| Migration | Alembic | DB schema migration |
| Transit | ODSAY API | 대중교통 경로 정보 |
| Testing | Jest, RNTL, Pytest | 클라이언트·서버 테스트 |
| Infra | Docker, Docker Compose | 로컬 API / DB 환경 |
| Deployment Assets | Kubernetes manifests | 배포 구성 |

---

## Backend Logic

경로 최적화 모듈은 다음과 같은 사용자 문제를 각각 독립적인 로직으로 다룹니다.

| Logic | Problem |
| --- | --- |
| Active Departure | 언제 출발해야 하는가 |
| Last Chance | 마지막으로 가능한 이동 수단을 놓치고 있는가 |
| Context Awareness | 사용자가 현재 어떤 이동 상태인가 |
| Alternative Route Gate | 대안을 실제로 추천할 가치가 있는가 |
| Boarding / Transfer | 탑승과 환승 경험을 어떻게 개선할 것인가 |
| Delay Detection | 계획 대비 이동이 늦어지고 있는가 |
| Taxi Suggestion | 대중교통만으로 목표를 만족하기 어려운가 |
| Retreat Goal | 퇴근 시 어떤 기준의 경로가 적합한가 |
| Smart Polling | 현재 상황에서 데이터를 얼마나 자주 갱신해야 하는가 |

상세 내용은 [`server/docs/path_optimize/LOGIC_GUIDE.md`](./server/docs/path_optimize/LOGIC_GUIDE.md)를 참고하세요.

---

## Project Structure

```text
DailyMotion/
├── client/
│   ├── src/
│   │   ├── screens/
│   │   │   ├── DailyBriefing/
│   │   │   ├── Home/
│   │   │   ├── Onboarding/
│   │   │   ├── SafetyGuard/
│   │   │   ├── RiskReport/
│   │   │   └── MyPage/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── stores/
│   │   └── navigators/
│   └── package.json
│
├── server/
│   ├── app/
│   │   ├── api/v1/
│   │   ├── modules/
│   │   │   ├── path_optimize/
│   │   │   ├── risk_manage/
│   │   │   └── ai_pattern/
│   │   ├── services/
│   │   ├── db/
│   │   └── core/
│   ├── alembic/
│   ├── data/
│   ├── docs/
│   ├── k8s/
│   └── docker-compose.yml
│
└── docs/
    ├── MODULES.md
    ├── KAKAO_MAP_API_GUIDE.md
    └── openapi/v1.yaml
```

> `client2/`는 별도의 Expo 초기/실험 구조가 남아 있으며, 현재 프로젝트 설명은 기능 구현이 집중된 `client/`를 기준으로 합니다.

---

## Testing

### Client

```bash
cd client
npm install
npm test
```

테스트 대상에는 다음과 같은 흐름이 포함됩니다.

- Daily Briefing 컴포넌트
- Onboarding 화면 / Store / Integration Flow
- Commute Settings
- Network Store
- API Service

### Server

```bash
cd server
pip install -r requirements.txt
pytest
```

경로 최적화 테스트는 단순 endpoint smoke test뿐 아니라 비즈니스 로직 단위 테스트와 integration / E2E 시나리오를 포함합니다.

---

## Getting Started

### Requirements

- Node.js 18+
- npm
- Python 3.x
- Docker / Docker Compose 권장
- Android Studio 또는 Xcode
- ODSAY API Key
- Google / Kakao Map API Key

### 1. Clone

```bash
git clone https://github.com/Dev-SangWoo/DailyMotion.git
cd DailyMotion
```

### 2. Backend — Docker Compose 권장

```bash
cd server
cp .env.example .env

docker compose up --build
```

기본 구성은 다음 서비스를 실행합니다.

- PostgreSQL + PostGIS: `5432`
- FastAPI: `8000`
- Redis: `6379` (optional usage)

FastAPI 문서:

```text
http://localhost:8000/docs
```

주요 서버 환경 변수:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dailymotion
ODSAY_API_KEY=
SECRET_KEY=
```

Docker를 사용하지 않는 경우:

```bash
cd server
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### 3. Mobile

```bash
cd client
npm install
cp .env.example .env
npm start
```

주요 클라이언트 환경 변수:

```env
REACT_APP_API_BASE_URL=http://<PC_IP>:8000/api/v1
REACT_APP_API_SERVER=http://<PC_IP>:8000
EXPO_PUBLIC_KAKAO_REST_API_KEY=
EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY=
```

> 실제 Android/iOS 디바이스에서 로컬 FastAPI 서버에 연결할 때는 `localhost` 대신 개발 PC의 LAN IP를 사용합니다.

---

## Documentation

- [`AGENTS.md`](./AGENTS.md) — 프로젝트 개발 원칙
- [`docs/openapi/v1.yaml`](./docs/openapi/v1.yaml) — API specification
- [`docs/MODULES.md`](./docs/MODULES.md) — 모듈 구조
- [`server/docs/path_optimize/LOGIC_GUIDE.md`](./server/docs/path_optimize/LOGIC_GUIDE.md) — 경로 최적화 로직
- [`server/docs/path_optimize/API.md`](./server/docs/path_optimize/API.md) — Path Optimize API
- [`server/app/modules/path_optimize/DESIGN.md`](./server/app/modules/path_optimize/DESIGN.md) — 모듈 설계
- [`client/MOCK_API_GUIDE.md`](./client/MOCK_API_GUIDE.md) — 클라이언트 Mock API 환경

---

## 현재 단계와 확장 방향

DailyMotion은 실시간 위치·대중교통·안전 데이터를 조합해 **행동 가능한 정보(Actionable Information)**를 만드는 데 초점을 둔 프로젝트입니다. 운영 수준으로 확장할 경우 다음 영역을 보강할 수 있습니다.

- 실시간 위치 추적의 foreground / background 정책과 배터리 사용량 정량 측정
- 대중교통 API 장애에 대한 fallback / circuit breaker 강화
- Smart Polling 주기의 실제 API 비용 및 정확도 지표화
- 경로 추천 Gate 기준을 실제 사용자 로그 기반으로 튜닝
- 대규모 spatial query를 위한 PostGIS index / query plan 최적화
- CI에서 client / backend 테스트 및 OpenAPI contract 검증 자동화
- Redis cache 적용 범위와 invalidation 전략 구체화

---

## License

This repository is maintained as a project portfolio and development repository.
