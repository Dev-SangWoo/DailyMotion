# 목업 API 사용 가이드 (Mock API Guide)

## 📖 개요

**목표**: Expo 개발 환경에서 백엔드 API 없이 DailyBriefingScreen UI를 시각적으로 테스트할 수 있습니다.

**설정 완료 항목**:
- ✅ 목업 데이터 정의 (CommuteBriefingResponse)
- ✅ API 인터셉터 구현 (자동으로 목업 데이터 반환)
- ✅ 환경 변수 설정 (.env)
- ✅ 자동 감지 (__DEV__ 플래그)

---

## 🚀 빠른 시작 (Quick Start)

### 1. Expo 개발 서버 시작

```bash
cd client
npm start
```

### 2. iOS 시뮬레이터에서 실행

```bash
# Expo CLI에서 다음 중 하나 선택:
# - 'i' 키: iOS 시뮬레이터
# - 'a' 키: Android 에뮬레이터
# - QR 코드 스캔: 실제 기기
```

### 3. 앱에서 확인

앱이 시작되면 자동으로:
- 목업 데이터를 사용하여 UI 렌더링
- 로딩 상태 표시 (500ms)
- 다양한 alertType 화면 표시

---

## ⚙️ 환경 변수 설정

### 기본 설정 (개발 환경)

파일: `client/.env`

```bash
# Phase 8: 목업 데이터 설정
REACT_APP_USE_MOCK_API=true

# 옵션:
# REACT_APP_USE_MOCK_API=true      → 항상 목업 사용
# REACT_APP_USE_MOCK_API=false     → 항상 실제 API 사용
# (미설정) && __DEV__=true         → 개발 환경에서 자동으로 목업 사용
```

### 설정 변경 방법

1. `.env` 파일을 편집
2. Expo 개발 서버 재시작 (`npm start`)
3. 앱 새로고침 ('r' 키 누르기)

---

## 📋 목업 데이터 시나리오

### 시나리오 1: 정상 출발 (GO_NOW)

```typescript
alertType: 'GO_NOW'
message: '지금 출발하면 정시에 도착할 수 있습니다.'
recommendedTransport: {
  type: 'bus',
  name: '지선버스 123번',
  departureInMinutes: 7
}
```

**UI 상태**:
- 배경색: 🔵 파란색 (정상)
- HeroCard: "지금 출발하세요!"
- OfflineBanner: 표시 안 함

---

### 시나리오 2: 지연 감지 (LAST_CHANCE)

```typescript
alertType: 'LAST_CHANCE'
message: '교통 혼잡이 감지되었습니다. 지금 바로 출발해야 정시에 도착할 수 있습니다.'
recommendedTransport: {
  type: 'bus',
  name: '광역버스 3100',
  departureInMinutes: 3
}
```

**UI 상태**:
- 배경색: 🟠 주황색 (경고)
- HeroCard: "⚠️ 5분 지연!"
- OfflineBanner: 표시 안 함 (네트워크 정상)

---

### 시나리오 3: 아직 출발 필요 없음 (NO_ACTION)

```typescript
alertType: 'NO_ACTION'
message: '아직 여유 있습니다. 20분 후 출발하면 정시 도착이 예상됩니다.'
recommendedTransport: {
  type: 'subway',
  name: '지하철 2호선',
  departureInMinutes: 20
}
```

**UI 상태**:
- 배경색: 🔵 파란색 (정상)
- HeroCard: 평상시 메시지
- OfflineBanner: 표시 안 함

---

## 🔄 앱 상태 전환 테스트

### 앱 모드 자동 전환

앱은 현재 시간을 기반으로 자동으로 모드를 전환합니다.

#### Briefing Mode (비서 모드)

**활성화 시간**:
- 평일 07:30 ~ 09:00 (출근)
- 평일 18:00 ~ 19:30 (퇴근)

**UI 변화**:
- JourneySelector: Collapsed (축소 상태)
- 핵심 정보만 표시

**테스트 방법**:
1. 시스템 시간을 출근 시간(예: 08:00)으로 설정
2. 앱 다시 실행 ('r' 키 또는 앱 재시작)
3. 여정 선택기가 축소되었는지 확인

#### Explore Mode (탐색 모드)

**활성화 시간**:
- 평일 09:01 ~ 17:59
- 주말 (토, 일)

**UI 변화**:
- JourneySelector: Expanded (확장 상태)
- 범용 검색창 기본 열림

**테스트 방법**:
1. 시스템 시간을 일반 시간(예: 14:00)으로 설정
2. 앱 다시 실행
3. 여정 선택기가 확장되었는지 확인

---

## 🧪 테스트 시나리오

### 시나리오 A: 정상 흐름

```
1. 앱 실행 (Expo: npm start)
2. 목업 데이터 자동 로드
3. HeroCard 표시 (alertType에 따른 메시지)
4. Carousel 컴포넌트 렌더링 확인
5. StepCards 렌더링 확인
6. 배경색 변화 확인
```

### 시나리오 B: 다양한 알림 타입 확인

```
1. 앱 실행
2. 앱 새로고침 ('r' 키)
3. 이전과 다른 alertType 로드 (랜덤)
4. 배경색이 변경되었는지 확인
5. HeroCard 메시지가 변경되었는지 확인
```

### 시나리오 C: 모드 자동 전환

```
1. 시간 설정: 08:00 (출근 시간)
2. 앱 실행 → Briefing Mode 확인 (JourneySelector 축소)
3. 시간 설정: 14:00 (일반 시간)
4. 앱 재시작 → Explore Mode 확인 (JourneySelector 확장)
```

### 시나리오 D: 오프라인 배너 (선택)

```
1. Network Request를 의도적으로 실패시키려면:
   - api.ts의 provideMockData에서 에러 throw
   - API 응답 실패 시뮬레이션

2. OfflineBanner 표시 확인
   - "실시간 정보 수신 불가"
   - 마지막 업데이트 시간 표시 (상대 시간)
```

---

## 🔍 디버깅

### 목업 API 작동 확인

Expo 개발 콘솔 로그를 확인하세요:

```
[Mock API] Returning mock data for: /briefings/commute
[Mock API] Response received: { data: { ... } }
```

### 목업 모드 상태 확인

```typescript
import { isUsingMockApi } from './src/services/api';

console.log('Mock API Enabled:', isUsingMockApi());
```

### 환경 변수 확인

```typescript
console.log('REACT_APP_USE_MOCK_API:', process.env.REACT_APP_USE_MOCK_API);
console.log('__DEV__:', __DEV__);
```

---

## 📦 목업 데이터 구조

### CommuteBriefingResponse 타입

```typescript
interface CommuteBriefingResponse {
  data: {
    alertType: 'GO_NOW' | 'LAST_CHANCE' | 'NO_ACTION';
    message: string;
    recommendedTransport: {
      type: string;        // 'bus', 'subway', 'taxi' 등
      name: string;        // '지선버스 123번'
      departureInMinutes: number;  // 7
    };
  };
}
```

### 현재 시나리오 목록

| 시나리오 | alertType | 메시지 |
|---------|-----------|--------|
| normalCommute | GO_NOW | 정상 운행 중입니다. |
| lightCongestion | GO_NOW | 약간의 혼잡이 있으나 정시 도착 가능합니다. |
| heavyCongestion | LAST_CHANCE | 심각한 교통 혼잡이 감지되었습니다. |
| subwayRecommendation | GO_NOW | 지하철 이용이 권장됩니다. |
| alternativeRoute | LAST_CHANCE | 택시 또는 대안 경로 이용을 권장합니다. |
| plentyOfTime | NO_ACTION | 현재 충분한 시간이 있습니다. |

---

## 🎨 컴포넌트별 테스트 체크리스트

### ✅ HeroCard
- [ ] GO_NOW: "🚀 지금 출발하세요!"
- [ ] LAST_CHANCE: "⚠️ 5분 지연!" 또는 "🚨 지각 확정!"
- [ ] NO_ACTION: 일반 메시지 표시

### ✅ WeatherCard
- [ ] 온도, 날씨 아이콘, 강수확률 표시
- [ ] Mock 데이터: 15°C, 비, 70%

### ✅ AlternativePathCard
- [ ] 시간 절약값 표시
- [ ] 탭 가능한지 확인 (향후 모달 연결)

### ✅ Carousel
- [ ] 3개 카드 모두 렌더링
- [ ] 좌우 스크롤 가능

### ✅ StepCards
- [ ] 3개 Step 모두 표시
- [ ] 도보 → 버스 → 도보 순서 확인
- [ ] 혼잡도 표시 (normal, heavy 등)

### ✅ JourneySelector
- [ ] Briefing Mode: 축소 상태 (Collapsed)
- [ ] Explore Mode: 확장 상태 (Expanded)
- [ ] 범용 검색창: 출발지/목적지 입력 가능

### ✅ OfflineBanner
- [ ] isOffline=true일 때 표시
- [ ] isOffline=false일 때 숨김
- [ ] 상대 시간 표시 (방금 전, 1분 전 등)

### ✅ Container (배경색)
- [ ] GO_NOW: 🔵 파란색
- [ ] LAST_CHANCE: 🟠 주황색
- [ ] NO_ACTION: 🔵 파란색

---

## 🔗 관련 파일

- **Mock Data**: `client/src/services/mockData.ts`
- **API Client**: `client/src/services/api.ts`
- **API Tests**: `client/src/services/api.test.ts`
- **Environment**: `client/.env`
- **Task Progress**: `client/src/screens/DailyBriefing/task.md`

---

## ❓ 자주 묻는 질문 (FAQ)

### Q: 목업 데이터를 실제 API로 바꾸려면?

**A**: `.env` 파일에서 수정:

```bash
# 변경 전
REACT_APP_USE_MOCK_API=true

# 변경 후
REACT_APP_USE_MOCK_API=false
```

그 다음 `npm start`로 서버 재시작

### Q: 매번 다른 시나리오를 보고 싶은데?

**A**: 앱을 새로고침하세요:
- 터미널: 'r' 키 입력
- 또는 Cmd+R (macOS) / Ctrl+R (Windows/Linux)

### Q: 오프라인 상태를 테스트하려면?

**A**: 아직 구현되지 않았지만, Phase 8.2에서 추가 예정입니다.
현재는 API 실패를 감지하면 자동으로 오프라인 상태 활성화됩니다.

### Q: 실제 기기에서 테스트하려면?

**A**: Expo 앱 설치 후:

```bash
# Expo 콘솔에서 'w'를 입력하거나
# QR 코드를 스캔하여 실제 기기 연결

# 또는
npx expo start --tunnel
```

---

## 📞 지원

문제 발생 시:

1. **Expo 로그 확인**: 콘솔에 에러 메시지 확인
2. **API 테스트 실행**: `npm test -- api.test.ts`
3. **환경 변수 확인**: `.env` 파일 설정 검증
4. **캐시 삭제**: `npm start -- --clear`

---

**Last Updated**: 2025-11-14 (Phase 8.0)
