# 경로 검색 서비스 (Route Search Service)

## 개요

온보딩 `GoalTimeScreen`에서 실제 ODSAY 경로 데이터를 조회하는 서비스입니다.

## 아키텍처

```
GoalTimeScreen
    ↓ (여정 선택)
fetchRoutesForJourney()
    ↓ (API 호출)
searchRoutes(userId)
    ↓
apiClient.get('/briefings/commute')
    ↓
백엔드 API: GET /api/v1/briefings/commute
    ↓ (ODSAY 경로 검색)
ODSAY API
    ↓ (경로 데이터 반환)
transformOdsayPaths()
    ↓ (UI 형식으로 변환)
RecommendedRoute[]
```

## 주요 기능

### 1. searchRoutes(userId)
백엔드 API를 호출하여 ODSAY 경로 데이터를 조회합니다.

**파라미터:**
- `userId` (string, 기본값: 'user_001'): 사용자 ID

**반환:**
- `Promise<RecommendedRoute[]>`: 추천 경로 배열

**응답 구조:**
```typescript
interface RecommendedRoute {
  id: string;           // 경로 ID (e.g., 'route_0')
  mode: string;         // 교통수단 (e.g., '버스 + 지하철')
  duration: string;     // 소요 시간 (e.g., '45분')
  transfers: number;    // 환승 횟수
  icon: string;         // 이모지 아이콘 (e.g., '🚌')
}
```

**예시:**
```typescript
const routes = await searchRoutes('user_001');
// [
//   {
//     id: 'route_0',
//     mode: '버스 + 지하철',
//     duration: '45분',
//     transfers: 1,
//     icon: '🚌'
//   },
//   ...
// ]
```

### 2. transformOdsayPaths(paths)
ODSAY 응답을 UI용 형식으로 변환합니다.

**입력:**
```typescript
interface OdsayPath {
  pathId: string;
  totalTime: number;      // 초 단위
  totalDistance: number;
  transferCount: number;
  segments: RouteSegment[];
}
```

**출력:**
UI에 표시할 수 있는 `RecommendedRoute[]`

## GoalTimeScreen 통합

### 사용 방법

1. **여정 선택 시 자동으로 경로 로드**
   ```typescript
   const handleSelectJourney = useCallback(
     (journeyId: string) => {
       setSelectedJourneyId(journeyId);
       fetchRoutesForJourney(journeyId);  // ← 자동으로 API 호출
     },
     [selectedJourneyId, fetchRoutesForJourney]
   );
   ```

2. **로딩/에러 상태 처리**
   ```typescript
   // 로딩 중
   {routeLoadingState === 'loading' && (
     <ActivityIndicator size="large" color={theme.colors.primary} />
   )}

   // 에러 발생
   {routeLoadingState === 'error' && (
     <ErrorMessage>{routeError}</ErrorMessage>
   )}

   // 성공
   {routeLoadingState === 'success' && selectedRoutesList && (
     selectedRoutesList.map((route) => <RouteCard key={route.id} {...route} />)
   )}
   ```

3. **캐싱**
   - 동일한 여정의 경로 데이터는 캐시되어 중복 호출을 방지합니다.
   - 캐시는 컴포넌트 메모리에 저장됩니다 (AsyncStorage X)

## 교통수단 매핑

ODSAY trafficType → 한글 레이블 + 이모지:

| trafficType | 레이블  | 아이콘 |
|-------------|--------|-------|
| 1           | 지하철  | 🚇    |
| 2           | 버스    | 🚌    |
| 3           | 택시    | 🚕    |
| 4           | 자동차  | 🚗    |
| 5           | 기차    | 🚂    |

**예시:**
- `[1, 2]` → "지하철 + 버스" + 🚇
- `[2]` → "버스" + 🚌
- `[1, 2, 3]` → "지하철 + 버스 + 택시" + 🚇

## 소요 시간 포맷

분 단위 시간을 사용자 친화적인 문자열로 변환:

| 입력 (분) | 출력         |
|---------|-------------|
| 15      | "15분"      |
| 45      | "45분"      |
| 60      | "1시간"     |
| 75      | "1시간 15분" |
| 120     | "2시간"     |

## 에러 처리

### 백엔드 에러
```typescript
try {
  const routes = await searchRoutes('user_001');
  // 성공
} catch (error) {
  // error.message: "경로를 찾을 수 없습니다" 등
  console.error('경로 검색 실패:', error);
}
```

### 응답 없음
백엔드에서 경로 데이터가 없으면:
- 빈 배열 `[]` 반환
- UI에 "검색된 경로가 없습니다" 메시지 표시

## 테스트 시나리오

### 1. 정상 작동
1. GoalTimeScreen에서 여정 선택
2. API 호출 (로딩 표시)
3. ODSAY 경로 데이터 수신
4. UI에 3~5개 경로 표시
5. 사용자가 경로 선택

### 2. 에러 시나리오
1. 백엔드 API 다운
2. ODSAY API 시간 초과
3. 경로 데이터 없음
4. 네트워크 오류
→ 에러 메시지 표시, 사용자는 다시 시도 가능

### 3. 캐싱 테스트
1. 여정 A 선택 → 경로 로드
2. 여정 B 선택 → 경로 로드
3. 여정 A 다시 선택 → 캐시된 데이터 즉시 표시 (API 호출 X)

## 환경 변수

**프론트엔드 (.env)**
```
REACT_APP_API_BASE_URL=http://localhost:8000/api/v1
REACT_APP_USE_MOCK_API=false  # 실제 API 사용
```

**백엔드 (.env)**
```
ODSAY_API_KEY=<your_odsay_api_key>
```

## 개발 가이드

### Mock 데이터 사용 (개발)
```bash
# .env 설정
REACT_APP_USE_MOCK_API=true
```
→ `apiClient` 인터셉터가 자동으로 mock 데이터 반환

### 실제 API 사용 (테스트)
```bash
# .env 설정
REACT_APP_USE_MOCK_API=false

# 백엔드 실행
cd server && uvicorn app.main:app --reload --port 8000
```

## 향후 개선 사항

1. **React Query 활용** (CLAUDE.md 권장)
   ```typescript
   const { data: routes, isLoading, error } = useRouteSearch(journeyId);
   ```

2. **실시간 경로 업데이트**
   - 사용자 위치 기반 재검색
   - 혼잡도 실시간 반영

3. **경로 세부 정보**
   - 버스/지하철 노선 번호
   - 환승역 명칭
   - 실시간 도착 정보

4. **사용자 선호도**
   - 자주 사용하는 경로 우선 표시
   - 선호 교통수단 필터링

---

**마지막 업데이트:** 2025-11-18
**상태:** Phase 2 완료 (경로 검색 기본 기능 구현)
