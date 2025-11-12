# 데일리모션 클라이언트 (React Native)

데일리모션 프로젝트의 React Native 모바일 애플리케이션입니다.

## 📁 디렉토리 구조

```
client/src/
├── @types/           # 1. 타입 (Type Definitions)
│
├── assets/           # 2. 정적 자원 (Images, Fonts)
│
├── components/       # 3. 재사용 UI (Styled-components)
│   ├── common/       # (예: Button, Header)
│   └── domain/       # (예: JourneyCard, ReportForm)
│
├── hooks/            # 4. 커스텀 훅 (React Query)
│   ├── queries/      # (예: useGetBusArrivalQuery.ts)
│   └── mutations/    # (예: usePostReportMutation.ts)
│
├── navigators/       # 5. 내비게이션 (React Navigation)
│   ├── RootNavigator.tsx
│   └── types.ts      # (스크린 파라미터 타입 정의)
│
├── screens/          # 6. 화면 (Pages)
│   ├── DailyBriefing/
│   │   ├── index.tsx
│   │   └── components/
│   ├── SafetyGuard/
│   └── ...
│
├── services/         # 7. API 클라이언트 (OpenAPI)
│   ├── api.ts        # (axios 인스턴스, 인증 처리)
│   └── generated/    # (OpenAPI로 자동 생성된 코드)
│
├── stores/           # 8. 전역 상태 (Zustand)
│   ├── useAuthStore.ts
│   └── useSettingStore.ts
│
└── styles/           # 9. 스타일 헌법 (Styled-components)
    ├── theme.ts      # (색상, 폰트, 간격 등 '테마')
    └── global.ts     # (글로벌 스타일)
```

## 📜 뼈대와 헌법 (설명)

### components/ + styles/ (헌법 제2장: Styled-components)

- **styles/theme.ts**: '데일리모션'의 모든 색상, 폰트 크기를 정의하는 '스타일 헌법'입니다.
- **components/**: theme.ts를 재료로 만든 '재사용 가능한 UI 부품(버튼, 카드)' 창고입니다.

### hooks/queries/ (헌법 제3장: React Query)

API 호출(데이터 페칭)은 screens/에서 직접 하지 않습니다.

이 폴더에 `useGetBusArrivalQuery`처럼 '커스텀 훅'으로 격리시켜, '지속가능성'과 '재사용성'을 확보합니다.

### navigators/ (헌법 제4장: React Navigation)

앱의 모든 '도로망'과 '교통 규칙'(예: "A 화면은 B로 갈 때 'userId'가 필수")을 중앙에서 관리합니다.

### stores/ (헌법 제1장: Zustand)

'서버 데이터'가 아닌, '진짜' 전역 상태(예: 사용자 인증 토큰, 앱 설정)만 이곳에서 관리합니다.

### services/ (헌법 제3장: 상호 규약)

`docs/openapi/v1.yaml` 설계도로부터 '자동 생성'된 API 호출 함수들이 위치할 곳입니다.

## 🚀 시작하기

### 필수 의존성 설치

```bash
npm install
# 또는
yarn install
```

### 필요한 패키지

프로젝트에서 사용하는 주요 패키지들:

```bash
# 네비게이션
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context

# 상태 관리
npm install zustand

# API 클라이언트
npm install axios

# React Query
npm install @tanstack/react-query

# Styled-components (선택사항)
npm install styled-components
npm install --save-dev @types/styled-components @types/styled-components-react-native
```

### 개발 서버 실행

```bash
# Metro 번들러 시작
npm start

# Android 실행
npm run android

# iOS 실행
npm run ios
```

## 📝 개발 가이드

### 1. 새로운 화면 추가하기

1. `screens/` 디렉토리에 새 폴더 생성
2. `index.tsx` 파일 생성
3. `navigators/RootNavigator.tsx`에 스크린 추가
4. `navigators/types.ts`에 타입 정의 추가

### 2. API 호출하기

1. `services/generated/`에서 자동 생성된 API 함수 사용
2. `hooks/queries/` 또는 `hooks/mutations/`에 커스텀 훅 생성
3. 화면에서 커스텀 훅 사용

### 3. 컴포넌트 만들기

1. 공통 컴포넌트: `components/common/`
2. 도메인별 컴포넌트: `components/domain/`
3. `styles/theme.ts`의 테마 사용

### 4. 전역 상태 관리

1. `stores/`에 새 스토어 파일 생성
2. Zustand의 `create` 함수 사용
3. 필요한 곳에서 `useStore` 훅 사용

## 🔗 관련 문서

- [프로젝트 헌법](../AGENTS.md) - 전체 프로젝트 규칙
- [OpenAPI 스펙](../docs/openapi/v1.yaml) - API 설계도

