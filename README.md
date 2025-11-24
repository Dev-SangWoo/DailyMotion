# 데일리모션 (DailyMotion)

> 스마트한 출퇴근 경로 최적화 및 안전 정보 제공 모바일 애플리케이션

데일리모션은 사용자의 일상적인 출퇴근 경로를 분석하고, 실시간 교통 정보와 재난 알림을 통합하여 최적의 경로를 제안하는 지능형 모바일 애플리케이션입니다.

## 📋 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [시작하기](#시작하기)
- [개발 가이드](#개발-가이드)
- [문서](#문서)
- [기여하기](#기여하기)

## ✨ 주요 기능

### 🎯 경로 최적화
- **지각 방지 모드**: 출근 시간에 맞춘 최적 경로 추천
- **경험 충족 모드**: 퇴근 시 편안한 경로 추천
- **문 앞(Door-to-Door) 기준**: 출발지/도착지 도보 시간 포함 정확한 소요 시간 계산
- **실시간 경로 추적**: GPS 기반 실시간 위치 추적 및 경로 안내

### 🛡️ 안전 정보
- **재난 문자 통합**: 지역별 재난 문자 실시간 수신 및 표시
- **위험 제보**: 사용자 신고 기반 위험 지역 마커 표시
- **SafetyGuard 화면**: 지도 기반 안전 정보 시각화
- **경로 구간별 재난 정보**: 선택한 경로의 구간별 재난 정보 제공

### 📊 지능형 대시보드
- **데일리 브리핑**: 출퇴근 전 필요한 모든 정보를 한눈에
- **날씨 정보**: 실시간 날씨 및 출퇴근 날씨 예보
- **대안 경로 제안**: 교통 상황에 따른 대안 경로 자동 제안
- **지연 알림**: 경로 지연 시 즉시 알림

### 🚀 사용자 경험
- **온보딩 플로우**: 직관적인 초기 설정 가이드
- **목표 도착 시간 설정**: 원하는 도착 시간에 맞춘 경로 추천
- **자주 가는 장소 관리**: 집, 회사 등 자주 가는 장소 등록 및 관리

## 🛠️ 기술 스택

### 프론트엔드 (React Native)
- **프레임워크**: React Native (Expo)
- **상태 관리**: Zustand
- **데이터 페칭**: React Query (TanStack Query)
- **스타일링**: Styled-components
- **내비게이션**: React Navigation
- **지도**: Google Maps API, Kakao Map API
- **테스트**: Jest, React Native Testing Library

### 백엔드 (FastAPI)
- **프레임워크**: FastAPI (Python 3.13+)
- **아키텍처**: 모듈형 모놀리식 (Modular Monolithic)
- **데이터베이스**: PostgreSQL + PostGIS
- **ORM**: SQLAlchemy
- **API 문서**: OpenAPI (Swagger)
- **테스트**: Pytest

### 인프라
- **클라우드**: NHN Cloud
- **컨테이너**: Docker
- **오케스트레이션**: Kubernetes (NKS)
- **스토리지**: NHN Cloud Object Storage

## 📁 프로젝트 구조

```
데일리모션_프로젝트/
├── 📜 AGENTS.md              # 프로젝트 헌법 (모든 규칙의 중심)
├── 📜 README.md              # 프로젝트 개요 및 시작 가이드 (이 파일)
│
├── 🏗️ client/               # 프론트엔드 (React Native)
│   ├── src/
│   │   ├── screens/         # 화면 컴포넌트
│   │   ├── components/      # 재사용 가능한 UI 컴포넌트
│   │   ├── hooks/           # 커스텀 훅 (React Query)
│   │   ├── stores/          # 전역 상태 관리 (Zustand)
│   │   ├── services/        # API 클라이언트 및 서비스
│   │   ├── navigators/      # 네비게이션 설정
│   │   └── styles/          # 스타일 테마
│   ├── package.json
│   └── README.md            # 클라이언트 상세 가이드
│
├── 🌳 server/                # 백엔드 (FastAPI)
│   ├── app/
│   │   ├── api/             # API 라우터 (OpenAPI)
│   │   ├── modules/         # 비즈니스 로직 모듈
│   │   │   ├── ai_pattern/  # AI 패턴 학습
│   │   │   ├── path_optimize/ # 경로 최적화
│   │   │   └── risk_manage/  # 위험 관리
│   │   ├── db/              # 데이터베이스 모델
│   │   ├── core/             # 설정 및 인증
│   │   └── main.py           # FastAPI 앱 진입점
│   ├── requirements.txt
│   └── README.md            # 서버 상세 가이드
│
└── 🤝 docs/                  # 문서화
    ├── MODULES.md            # 모듈 설계서
    ├── openapi/
    │   ├── v1.yaml           # OpenAPI 스펙
    │   └── generated/        # 자동 생성된 코드
    └── KAKAO_MAP_API_GUIDE.md
```

## 🚀 시작하기

### 사전 요구사항

- **Node.js**: 18.x 이상
- **Python**: 3.13 이상
- **PostgreSQL**: 14 이상 (PostGIS 확장 필요)
- **Expo CLI**: `npm install -g expo-cli`
- **Git**: 최신 버전

### 1. 저장소 클론

```bash
git clone <repository-url>
cd DailyMotion2
```

### 2. 프론트엔드 설정

```bash
cd client

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 필요한 API 키 설정

# 개발 서버 실행
npm start

# Android 실행
npm run android

# iOS 실행 (macOS만)
npm run ios
```

**필수 환경 변수**:
- `EXPO_PUBLIC_API_URL`: 백엔드 API URL
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps API 키
- `EXPO_PUBLIC_KAKAO_MAP_API_KEY`: Kakao Map API 키

### 3. 백엔드 설정

```bash
cd server

# 가상 환경 생성 (권장)
python -m venv venv_server
source venv_server/bin/activate  # Windows: venv_server\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
# .env 파일 생성 및 설정 (예시는 server/README.md 참조)

# 데이터베이스 설정
# PostgreSQL에서 PostGIS 확장 활성화
psql -U postgres -d dailymotion -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# 서버 실행
uvicorn app.main:app --reload
```

서버는 `http://localhost:8000`에서 실행되며, API 문서는 `http://localhost:8000/docs`에서 확인할 수 있습니다.

**필수 환경 변수**:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `NHN_CLOUD_ACCESS_KEY`: NHN Cloud 액세스 키
- `NHN_CLOUD_SECRET_KEY`: NHN Cloud 시크릿 키
- `SECRET_KEY`: JWT 토큰 서명용 시크릿 키

## 📝 개발 가이드

### 코딩 규칙

이 프로젝트는 **AGENTS.md**에 정의된 헌법을 따릅니다. 코드를 작성하기 전 반드시 읽어보세요.

**핵심 원칙**:
1. **설계도 우선 (Design-First)**: API 변경 전 OpenAPI 스펙 먼저 작성
2. **모듈형 모놀리식**: 백엔드는 모듈 단위로 완전히 분리
3. **TDD**: 테스트 주도 개발
4. **의미론적 네이밍**: 코드는 스스로 설명해야 함

### 프론트엔드 개발

#### 새로운 화면 추가
1. `client/src/screens/`에 새 폴더 생성
2. `navigators/RootNavigator.tsx`에 스크린 등록
3. `navigators/types.ts`에 타입 정의

#### API 호출
1. `hooks/queries/`에 커스텀 훅 생성
2. React Query의 `useQuery` 사용
3. 화면에서 커스텀 훅 호출

**예시**:
```typescript
// hooks/queries/useGetWeatherQuery.ts
export const useGetWeatherQuery = () => {
  return useQuery({
    queryKey: ['weather'],
    queryFn: () => apiClient.get('/v1/weather'),
  });
};

// screens/DailyBriefing/DailyBriefingScreen.tsx
const { data, isLoading } = useGetWeatherQuery();
```

#### 스타일링
- `styles/theme.ts`의 테마 사용 필수
- Styled-components 사용
- 매직 넘버 금지

### 백엔드 개발

#### 새로운 API 엔드포인트 추가
1. `docs/openapi/v1.yaml`에 스펙 작성
2. `app/api/v1/`에 라우터 생성
3. `app/modules/`에 비즈니스 로직 구현
4. 라우터에서 모듈 서비스 호출

#### 새로운 모듈 추가
1. `app/modules/`에 새 폴더 생성
2. `service.py`에 비즈니스 로직 구현
3. 필요시 `app/api/v1/`에 라우터 생성

### 테스트

#### 프론트엔드 테스트
```bash
cd client
npm test
```

#### 백엔드 테스트
```bash
cd server
pytest
```

## 📚 문서

### 핵심 문서
- **[AGENTS.md](./AGENTS.md)**: 프로젝트 헌법 및 모든 규칙
- **[client/README.md](./client/README.md)**: 프론트엔드 상세 가이드
- **[server/README.md](./server/README.md)**: 백엔드 상세 가이드
- **[docs/openapi/v1.yaml](./docs/openapi/v1.yaml)**: OpenAPI 스펙

### 추가 문서
- **[docs/MODULES.md](./docs/MODULES.md)**: 모듈 설계서
- **[docs/KAKAO_MAP_API_GUIDE.md](./docs/KAKAO_MAP_API_GUIDE.md)**: Kakao Map API 가이드
- **[CTAGuide.md](./CTAGuide.md)**: CTA 카드 가이드

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

**커밋 메시지 규칙**:
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `refactor`: 리팩토링
- `docs`: 문서 수정
- `test`: 테스트 추가/수정
- `chore`: 빌드 설정, 패키지 관리 등

## 📄 라이선스

이 프로젝트는 비공개 프로젝트입니다.

## 👥 팀

데일리모션 개발팀

---

**중요**: 이 프로젝트의 모든 개발자는 [AGENTS.md](./AGENTS.md)에 정의된 헌법을 준수해야 합니다. 코드를 작성하기 전 반드시 읽어보세요.
