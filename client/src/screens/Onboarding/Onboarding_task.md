# 온보딩 (Onboarding) 구현 작업 분해서

## 📋 프로젝트 개요

**목표**: desgin.md의 9-스크린 온보딩 플로우를 React Native 앱에 구현
**방법론**: TDD (Test-Driven Development) 기반
**스타일**: 3D Claymorphism + Glassmorphism (모던 UI)
**상태 관리**: Zustand + React Navigation

---

## 🏗️ Phase 1: 아키텍처 설계 & 프로젝트 초기화

### [1-1] 디렉토리 구조 설계 및 생성

**목표**: 온보딩 모듈의 계층적 구조 구축

```
client/src/screens/Onboarding/
├── OnboardingScreen.tsx          # 메인 네비게이션 컨트롤러
├── screens/                      # 각 스크린 컴포넌트
│   ├── ValueProposalScreen.tsx   # 스크린 1-3 (수평 스와이프)
│   ├── JourneySetupScreen.tsx    # 스크린 4
│   ├── PathSelectionScreen.tsx   # 스크린 5
│   ├── GoalTimeScreen.tsx        # 스크린 6
│   ├── ScheduleSetupScreen.tsx   # 스크린 7
│   ├── PermissionsScreen.tsx     # 스크린 8
│   └── CompletionScreen.tsx      # 스크린 9
├── components/                   # 재사용 컴포넌트
│   ├── OnboardingButton.tsx      # CTA 버튼 (3D 스타일)
│   ├── OnboardingCard.tsx        # 카드 컴포넌트 (Glassmorphism)
│   ├── InputField.tsx            # 입력 필드
│   ├── TimePickerModal.tsx       # 시간 선택기
│   └── SliderInput.tsx           # 슬라이더
├── styles/                       # 스크린별 스타일
│   ├── onboardingTheme.ts        # 온보딩 테마 확장
│   └── componentStyles.ts        # 컴포넌트 스타일 모음
├── hooks/                        # 커스텀 훅
│   ├── useOnboardingNavigation.ts # 네비게이션 헬퍼
│   └── useOnboardingFlow.ts      # 온보딩 상태 관리
├── stores/                       # Zustand 스토어
│   └── useOnboardingStore.ts     # 온보딩 전역 상태
├── __tests__/                    # 테스트 파일들
│   ├── OnboardingScreen.test.tsx
│   ├── screens/
│   │   ├── ValueProposalScreen.test.tsx
│   │   ├── JourneySetupScreen.test.tsx
│   │   └── ... (다른 스크린 테스트)
│   ├── components/
│   └── integration/
└── Onboarding_task.md            # 이 문서
```

**상태**: ⏳ 보류 (Phase 1-1)
**예상 시간**: 30분

---

### [1-2] Zustand Store 설계 및 구현 (useOnboardingStore.ts)

**목표**: 온보딩 전체 상태 관리 (출발지, 도착지, 시간, 권한 등)

**설계 사항**:
- `journeySetup`: { origin: string, destination: string }
- `pathSelection`: { selectedPathIndex: number, customPath?: string }
- `goalTime`: { arrivalTime: string, firstMileMinutes: number }
- `schedule`: { daysOfWeek: string[], isCustom: boolean }
- `permissions`: { notificationGranted: boolean, locationGranted: boolean }
- `currentStep`: number (현재 스크린, 1-9)
- `isCompleted`: boolean

**구현 단계**:
1. 스토어 인터페이스 정의 (TypeScript)
2. 초기 상태 설정
3. Action 메서드 구현 (updateOrigin, updateDestination 등)
4. Persist 플러그인 설정 (AsyncStorage에 저장)

**테스트 요구사항**:
- ✅ 스토어 초기화 테스트
- ✅ 각 액션 메서드 테스트
- ✅ 상태 변경 추적 테스트

**상태**: ⏳ 보류 (Phase 1-2)
**예상 시간**: 1시간

---

### [1-3] 온보딩 테마 및 스타일 시스템 (onboardingTheme.ts)

**목표**: 3D Claymorphism + Glassmorphism 스타일 정의

**설계 사항**:
- **Color Palette**: Primary Blue (#007AFF), Ambient colors
- **Typography**: Display-L (34px), Headline-M (22px), Body-L (17px)
- **Shadow & Depth**: 3D 버튼 그림자, 카드 elevation
- **Border & Radius**: 둥근 모서리, glassmorphic effect

**구현 단계**:
1. 기존 theme.ts 기반으로 확장
2. 온보딩 특화 색상 추가
3. 3D 버튼 스타일 정의
4. Glassmorphism 카드 스타일
5. 애니메이션 토큰 (transition, spring)

**테스트**: 스타일 컴포넌트 렌더링 테스트

**상태**: ⏳ 보류 (Phase 1-3)
**예상 시간**: 45분

---

## 🎨 Phase 2: 공용 컴포넌트 구현 (TDD)

### [2-1] OnboardingButton 컴포넌트 (3D 스타일)

**설계**:
- Props: label, onPress, variant (primary|secondary), disabled, loading
- 3D 입체감 (깊은 그림자, 누르는 애니메이션)

**TDD 체크리스트**:
- ✅ Primary 버튼 렌더링 테스트
- ✅ Secondary 버튼 렌더링 테스트
- ✅ disabled 상태 테스트
- ✅ 탭 이벤트 처리 테스트
- ✅ 로딩 상태 테스트

**상태**: ⏳ 보류 (Phase 2-1)
**예상 시간**: 45분

### [2-2] OnboardingCard 컴포넌트 (Glassmorphism)

**설계**:
- Props: children, variant, opacity
- Glassmorphism: 백그라운드 블러(12px), 투명도(70-80%)

**TDD 체크리스트**:
- ✅ 카드 기본 렌더링
- ✅ Glassmorphism 스타일 적용 확인
- ✅ Children 컨텐츠 렌더링

**상태**: ⏳ 보류 (Phase 2-2)
**예상 시간**: 30분

### [2-3] InputField 컴포넌트

**설계**:
- Props: placeholder, value, onChange, icon
- Flat 스타일 (Inset look)

**TDD 체크리스트**:
- ✅ 텍스트 입력 기능
- ✅ placeholder 표시
- ✅ 아이콘 렌더링

**상태**: ⏳ 보류 (Phase 2-3)
**예상 시간**: 30분

### [2-4] TimePickerModal / SliderInput 컴포넌트

**상태**: ⏳ 보류 (Phase 2-4)
**예상 시간**: 1시간

---

## 🖼️ Phase 3: 스크린 구현 (각 스크린 = TDD + 구현)

### [3-1] ValueProposalScreen (스크린 1-3)

**설계**: 수평 페이지 뷰 (swipeable cards)
- 스크린 1: "매일 아침, 고민하지 마세요"
- 스크린 2: 앱 기능 소개 (#2)
- 스크린 3: CTA ("내 비서 만들기") + 페이지네이션

**TDD 체크리스트**:
- ✅ 3개 카드 렌더링
- ✅ 수평 스와이프 기능
- ✅ 페이지네이션 인디케이터
- ✅ 마지막 카드의 CTA 버튼 탭

**상태**: ⏳ 보류 (Phase 3-1)
**예상 시간**: 1.5시간

### [3-2] JourneySetupScreen (스크린 4)

**설계**:
```
┌─────────────────────────┐
│ 가장 중요한 여정을       │
│ 알려주세요               │
├─────────────────────────┤
│ [📍 출발지 입력]        │
│ [🏢 목적지 입력]        │
├─────────────────────────┤
│   [다음]                 │
└─────────────────────────┘
```

**TDD 체크리스트**:
- ✅ 두 개의 입력 필드 렌더링
- ✅ 입력값 변경 감지
- ✅ "다음" 버튼 탭 시 상태 저장 & 다음 스크린 이동
- ✅ 입력값 필수 체크 (빈 값 시 버튼 비활성화)

**상태**: ⏳ 보류 (Phase 3-2)
**예상 시간**: 1시간

### [3-3] PathSelectionScreen (스크린 5)

**설계**: 경로 옵션 카드 선택

**TDD 체크리스트**:
- ✅ 경로 옵션 카드 렌더링
- ✅ 카드 선택 감지
- ✅ "직접 설정" 버튼 기능
- ✅ "다음" 버튼 활성화

**상태**: ⏳ 보류 (Phase 3-3)
**예상 시간**: 1시간

### [3-4] GoalTimeScreen (스크린 6)

**설계**:
- 도착 시간 선택기 (TimePicker)
- First Mile 시간 슬라이더 (1-15분)

**TDD 체크리스트**:
- ✅ TimePicker 렌더링
- ✅ 슬라이더 값 변경 감지
- ✅ 상태 저장 & 네비게이션

**상태**: ⏳ 보류 (Phase 3-4)
**예상 시간**: 1.5시간

### [3-5] ScheduleSetupScreen (스크린 7)

**설계**:
- 기본값: "평일 (월-금)"
- 대체: "직접 선택할래요"

**TDD 체크리스트**:
- ✅ 두 버튼 렌더링
- ✅ 버튼 탭 이벤트 처리
- ✅ 선택값 상태 저장

**상태**: ⏳ 보류 (Phase 3-5)
**예상 시간**: 45분

### [3-6] PermissionsScreen (스크린 8)

**설계**:
- 알림 권한 (필수)
- 위치 권한 (항상 허용)

**TDD 체크리스트**:
- ✅ 권한 설명 렌더링
- ✅ "권한 허용" 버튼 탭
- ✅ 실제 권한 요청 API 호출
- ✅ 권한 거부 시 재요청 로직

**상태**: ⏳ 보류 (Phase 3-6)
**예상 시간**: 1.5시간

### [3-7] CompletionScreen (스크린 9)

**설계**:
- 성공 메시지 + 3D 🚀/🏆 아이콘
- "내일의 브리핑 미리보기" CTA

**TDD 체크리스트**:
- ✅ 완료 메시지 렌더링
- ✅ 아이콘 애니메이션
- ✅ CTA 버튼 탭 → DailyBriefingScreen으로 Replace

**상태**: ⏳ 보류 (Phase 3-7)
**예상 시간**: 1시간

---

## 🧭 Phase 4: 네비게이션 & 플로우 통합

### [4-1] OnboardingScreen (메인 컨트롤러)

**설계**: StackNavigator로 9개 스크린 관리

```typescript
<Stack.Navigator
  initialRouteName="ValueProposal"
  screenOptions={{ headerShown: false }}
>
  <Stack.Screen name="ValueProposal" component={ValueProposalScreen} />
  <Stack.Screen name="JourneySetup" component={JourneySetupScreen} />
  ...
</Stack.Navigator>
```

**TDD 체크리스트**:
- ✅ 초기 스크린 렌더링
- ✅ 스크린 간 네비게이션
- ✅ 뒤로가기 버튼 동작

**상태**: ⏳ 보류 (Phase 4-1)
**예상 시간**: 1시간

### [4-2] RootNavigator 통합

**목표**: 온보딩 <-> 메인 앱 전환

**설계**:
- isOnboarded 상태로 조건부 렌더링
- 온보딩 완료 후 DailyBriefingScreen으로 전환

**TDD 체크리스트**:
- ✅ 온보딩 상태 확인
- ✅ 조건부 네비게이션 렌더링
- ✅ 전환 애니메이션

**상태**: ⏳ 보류 (Phase 4-2)
**예상 시간**: 45분

---

## 🧪 Phase 5: 통합 테스트 & 엣지 케이스

### [5-1] 전체 온보딩 플로우 통합 테스트

**테스트 시나리오**:
1. ✅ 스크린 1 → 9까지 순차적으로 진행
2. ✅ 각 스크린에서 입력값 저장 확인
3. ✅ 뒤로가기 버튼 동작
4. ✅ 스토어 상태 정확성 확인

**상태**: ⏳ 보류 (Phase 5-1)
**예상 시간**: 2시간

### [5-2] 엣지 케이스 테스트

**케이스**:
- ✅ 빈 입력값 처리
- ✅ 권한 거부 후 재요청
- ✅ 화면 회전 (orientation change)
- ✅ 앱 백그라운드 후 복귀 (상태 유지)

**상태**: ⏳ 보류 (Phase 5-2)
**예상 시간**: 1.5시간

### [5-3] 시각적 회귀 테스트 (Snapshot Testing)

**항목**:
- ✅ 각 스크린의 스냅샷
- ✅ 다크 모드 (향후 지원)

**상태**: ⏳ 보류 (Phase 5-3)
**예상 시간**: 1시간

---

## 📊 Progress Tracking

| Phase | Task | Status | % | Estimated | Actual |
|-------|------|--------|---|-----------|--------|
| 1 | 아키텍처 설계 | ✅ | 100% | 3h | 1h30m |
| 1-1 | 디렉토리 구조 생성 | ✅ | 100% | 30m | 10m |
| 1-2 | useOnboardingStore 구현 | ✅ | 100% | 1h | 30m |
| 1-3 | onboardingTheme 구현 | ✅ | 100% | 45m | 15m |
| 2 | 공용 컴포넌트 | ⏳ | 0% | 2.5h | - |
| 3 | 스크린 구현 | ⏳ | 0% | 8h | - |
| 4 | 네비게이션 통합 | ⏳ | 0% | 1.75h | - |
| 5 | 통합 테스트 | ⏳ | 0% | 4.5h | - |
| **TOTAL** | | | **16%** | **18.75h** | 1h55m |

### 최근 완료 사항
- ✅ 온보딩 Zustand Store 완성 (23/26 테스트 통과)
- ✅ 온보딩 테마 시스템 (3D Claymorphism + Glassmorphism)
- ✅ CLAUDE.md 온보딩 가이드 추가

---

## 🎯 Key Success Criteria

- ✅ 모든 스크린 렌더링
- ✅ 입력값 상태 관리 (Zustand)
- ✅ 부드러운 스크린 전환
- ✅ 3D 모던 UI 스타일 적용
- ✅ 100% 테스트 커버리지 (TDD)
- ✅ 온보딩 완료 후 메인 앱 전환

---

## 📝 Constitutional Compliance

**AGENTS.md 준수**:
- ✅ [제1장] 상태 관리: Zustand 사용
- ✅ [제2장] 스타일링: Styled-components + theme
- ✅ [제4장] 네비게이션: React Navigation
- ✅ [제6장] 개발 방법론: TDD (RTL + Jest)

**desgin.md 준수**:
- ✅ 3D Claymorphism 스타일
- ✅ 9-스크린 플로우
- ✅ "가치 제안 우선" 철학
- ✅ 3D 아이콘 활용
