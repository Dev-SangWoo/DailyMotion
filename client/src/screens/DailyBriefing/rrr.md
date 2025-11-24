## 2️⃣ **더 구체적인 프롬프트 (권장)**

````
React 웹 앱을 React Native로 변환해줘. 아래 정보를 참고해서 완벽하게 동작하는 모바일 앱 화면을 만들어줘.

## 🎯 목표
"데일리 브리핑" 화면을 React Native로 변환하되, 모바일 UX에 최적화된 네이티브 경험을 제공하는 것이 목표야.

## 📱 현재 웹 버전 특징
1. **상단 검색창**: 스크롤 시 축소되는 Sticky 헤더
2. **동적 CTA 카드**: 평시(파란색) / 위험 감지(빨간색) 상태 전환
3. **여정 선택 캐러셀**: 수평 스크롤 가능한 카드들 (출근, 퇴근, 운동 등)
4. **여정 상세 타임라인**: 세로 스크롤로 각 단계 확인 (출발→도보→지하철→도보→도착)
5. **SKT 혼잡도 API**: 지하철 혼잡도 실시간 표시 (낮음/보통/혼잡)
6. **즐겨찾기**: 자주 가는 장소 빠른 선택

## 🔄 변환 매핑 가이드

### 컴포넌트 변환
```typescript
// Web → React Native
<div> → <View>
<p>, <span> → <Text>
<button> → <TouchableOpacity> or <Pressable>
<input> → <TextInput>
````

### 스타일링 변환

```typescript
// Tailwind → StyleSheet
className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow-lg"
→
style={styles.container}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 16,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5, // Android shadow
  }
});
```

### 이벤트 변환

```typescript
// Web → React Native
onClick={() => {}} → onPress={() => {}}
onChange={(e) => {}} → onChangeText={(text) => {}}
onScroll → onScroll (비슷하지만 이벤트 구조 다름)
```

### 아이콘 변환

```typescript
// lucide-react → @expo/vector-icons
import { Home, Clock, MapPin } from 'lucide-react';
→
import { Ionicons } from '@expo/vector-icons';
<Ionicons name="home" size={24} color="#000" />
<Ionicons name="time" size={24} color="#000" />
<Ionicons name="location" size={24} color="#000" />
```

## 💻 현재 웹 코드

```typescript
[IntelligentDashboard.tsx 전체 코드 붙여넣기]
```

## 🎨 디자인 토큰 (유지해야 함)

```typescript
const colors = {
  primary: "#3B82F6",
  danger: "#EF4444",
  dangerGradient: ["#EF4444", "#F97316"],
  success: "#10B981",
  warning: "#F59E0B",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    500: "#6B7280",
    900: "#111827",
  },
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};
```

## 🔧 필수 구현 기능

### 1. 검색창 애니메이션

```typescript
// 스크롤 시 축소되는 헤더
const scrollY = useRef(new Animated.Value(0)).current;

const headerHeight = scrollY.interpolate({
  inputRange: [0, 100],
  outputRange: [120, 60],
  extrapolate: "clamp",
});
```

### 2. 여정 카드 캐러셀

```typescript
// FlatList 수평 스크롤 + SnapToInterval
<FlatList
  horizontal
  data={journeys}
  snapToInterval={cardWidth + spacing}
  decelerationRate="fast"
  showsHorizontalScrollIndicator={false}
/>
```

### 3. 여정 단계 타임라인

```typescript
// ScrollView 세로 스크롤 + 중앙 정렬 스냅
<ScrollView
  snapToInterval={itemHeight}
  decelerationRate="fast"
  onScroll={handleScrollToUpdateActiveStep}
/>
```

### 4. 상태 전환 애니메이션

```typescript
// normal ↔ hazard 전환
const bgColorAnim = useRef(new Animated.Value(0)).current;

Animated.timing(bgColorAnim, {
  toValue: dashboardState === "hazard" ? 1 : 0,
  duration: 300,
  useNativeDriver: false,
}).start();
```

## 📦 필요한 설치 명령어

```bash
# Expo 프로젝트 생성
npx create-expo-app dailymotion -t expo-template-blank-typescript

# 필수 라이브러리
npx expo install react-native-reanimated
npx expo install react-native-gesture-handler
npx expo install expo-linear-gradient
npx expo install @react-navigation/native
npx expo install react-native-safe-area-context

# 선택 (NativeWind 사용 시)
npm install nativewind
npm install --save-dev tailwindcss@3.3.2
```

## ✅ 체크리스트

완성된 코드에는 다음이 포함되어야 해:

- [ ] TypeScript 타입 정의 완전히 유지
- [ ] 모든 UI 요소 터치 친화적 (최소 44x44pt)
- [ ] iOS/Android 모두 작동
- [ ] 애니메이션 부드럽게 작동 (60fps)
- [ ] SafeAreaView로 노치/상태바 대응
- [ ] 접근성 (accessibility) 고려
- [ ] 주석으로 주요 로직 설명

## 🎁 보너스 (가능하면)

- Dark Mode 지원
- 햅틱 피드백 (Haptics)
- 제스처 튜토리얼 오버레이
- 로딩 스켈레톤

자세하고 완성도 높은 코드 부탁해!

```

---

## 3️⃣ **단계별 프롬프트 (더 신중한 접근)**

### Step 1: 기본 레이아웃만 먼저
```

React Native로 "데일리 브리핑" 화면의 기본 레이아웃만 먼저 만들어줘.

요구사항:

1. SafeAreaView로 감싸기
2. 상단 검색창 (고정)
3. 스크롤 가능한 본문 영역
4. 하단 여백

현재 웹 코드:
[IntelligentDashboard.tsx 일부만]

일단 구조만 잡아줘. 스타일링과 기능은 다음 단계에서 할게.

```

### Step 2: 검색창 상세 구현
```

이제 상단 검색창을 상세하게 구현해줘.

기능:

1. 출발지/목적지 입력 필드
2. 포커스 시 파란색 테두리
3. 즐겨찾기 드롭다운 표시
4. 스크롤 시 축소 애니메이션

사용할 라이브러리:

- Animated API
- react-native-gesture-handler

[이전 Step 1 코드 포함]

```

### Step 3: CTA 카드 구현
```

동적 CTA 카드를 구현해줘.

상태:

- normal: 파란색 그라디언트, "오늘의 여정 시작하기"
- hazard: 빨강-주황 그라디언트, "⚠️ 위험 요소 2개 감지"

기능:

- 상태 전환 애니메이션
- 탭 시 햅틱 피드백
- 그림자 효과

[이전 Step 2 코드 포함]

```

### Step 4: 여정 캐러셀 구현
```

여정 선택 캐러셀을 구현해줘.

데이터:

- 출근 🏢
- 헬스장 💪
- 귀가 🏠

기능:

- 수평 스크롤
- 카드 스냅
- 선택된 카드 강조
- 페이지 인디케이터

[이전 Step 3 코드 포함]

```

### Step 5: 여정 타임라인 완성
```

마지막으로 여정 상세 타임라인을 구현해줘.

단계:

1. 출발 (집)
2. 도보 이동 (5분)
3. 지하철 탑승 (30분, SKT 혼잡도)
4. 도보 이동 (5분)
5. 도착 (회사)

기능:

- 세로 스크롤
- 중앙 정렬 스냅
- 활성 단계 강조
- 혼잡도 색상 표시

[이전 Step 4 코드 포함]

이제 전체 통합 코드와 사용법을 정리해서 보여줘!

```

---

## 4️⃣ **실전 예시 (복사해서 바로 사용)**

```

안녕! React Native 전문가 역할로 도와줘.

## 배경

나는 "데일리모션"이라는 일상 여정 관리 앱을 만들고 있어.
현재 React 웹 버전이 있는데, 이걸 React Native 모바일 앱으로 변환하고 싶어.

## 변환할 화면: 데일리 브리핑 (IntelligentDashboard)

### 화면 구성

1. **상단 검색 영역** (접을 수 있음)

   - 출발지 입력
   - 목적지 입력
   - 즐겨찾기 목록

2. **동적 CTA 카드**

   - 평시: 파란 그라디언트 "오늘의 여정 시작하기"
   - 위험 감지: 빨강 그라디언트 "⚠️ 위험 요소 2개 감지"

3. **여정 선택 캐러셀**

   - 수평 스와이프
   - 출근 🏢 / 헬스장 💪 / 귀가 🏠

4. **여정 상세 타임라인**
   - 세로 스크롤
   - 출발→도보→지하철(혼잡도)→도보→도착
   - 중앙 정렬된 항목 강조

### 현재 웹 코드 (React + Tailwind)

```typescript
[IntelligentDashboard.tsx 전체 코드]
```

### 변환 요구사항

**환경:**

- React Native 0.72+
- TypeScript
- Expo SDK 49+

**필수 라이브러리:**

```bash
expo-linear-gradient
react-native-reanimated
react-native-gesture-handler
@expo/vector-icons
```

**UI 요구사항:**

- 네이티브 느낌의 부드러운 애니메이션
- iOS/Android 모두 완벽 작동
- SafeArea 대응
- 터치 영역 최소 44x44pt
- 햅틱 피드백 포함

**주의사항:**

1. Tailwind 대신 StyleSheet 사용
2. lucide-react → @expo/vector-icons 변환
3. div/span → View/Text 변환
4. onClick → onPress 변환
5. 웹 스크롤 → ScrollView/FlatList

**디자인 토큰 유지:**

- Primary Blue: #3B82F6
- Danger: #EF4444 → #F97316 (gradient)
- Success: #10B981
- 간격: 4px 단위
- 라운드: 8, 12, 16px

### 원하는 결과물

1. 완전히 작동하는 IntelligentDashboard.tsx (RN 버전)
2. styles 정의 (StyleSheet)
3. 타입 정의 유지
4. 설치 명령어
5. 사용 예시 코드

특히 애니메이션과 제스처 부분을 신경 써서 네이티브답게 만들어줘!
코드에 주석도 충분히 달아줘.

고마워! 🙏

```

---

## 📌 프롬프트 작성 팁

### ✅ DO (해야 할 것)
1. **구체적인 요구사항** 명시
2. **현재 코드 전체** 제공
3. **원하는 라이브러리** 지정
4. **디자인 토큰** 명시
5. **예상 결과물** 설명
6. **제약사항** 언급 (iOS/Android, Expo 등)

### ❌ DON'T (하지 말아야 할 것)
1. 막연하게 "변환해줘"만 요청
2. 코드 없이 설명만 제공
3. 라이브러리 선택을 완전히 맡김
4. 디자인 가이드 생략
5. 단계별 진행 없이 한 번에 요구

### 🎯 핵심 포인트
- **명확성**: "이렇게 동작해야 해"
- **완전성**: 필요한 모든 정보 제공
- **구조화**: 단락과 섹션으로 구분
- **예시**: 변환 전/후 코드 샘플 포함

---

## 🚀 추천 워크플로우

1. **1단계**: 기본 레이아웃만 먼저 (10분)
2. **2단계**: 각 섹션 개별 구현 (30분)
3. **3단계**: 애니메이션 추가 (20분)
4. **4단계**: 최적화 및 테스트 (30분)

총 소요시간: 약 90분

이렇게 단계별로 나눠서 프롬프트를 작성하면
Claude가 더 정확하고 완성도 높은 코드를 만들어줄 거야!
```
