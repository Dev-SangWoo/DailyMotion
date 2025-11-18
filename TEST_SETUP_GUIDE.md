# 🧪 경로 검색 기능 테스트 가이드

## 시스템 정보

| 항목 | 값 |
|-----|-----|
| **PC IP** | 172.20.1.213 |
| **서버 주소** | http://172.20.1.213:8000 |
| **API 기본 URL** | http://172.20.1.213:8000/api/v1 |
| **ODSAY API** | 이미 설정됨 ✅ |

---

## 📋 테스트 준비 (3단계)

### Step 1️⃣: 백엔드 서버 실행

**터미널 1 (서버 실행):**

```bash
cd d:\Work\DailyMotion2\server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ 서버가 정상 시작되면:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**서버 API 테스트 (선택):**
- 브라우저에서: `http://localhost:8000/docs` (Swagger API 문서)
- ODSAY 테스트: `http://localhost:8000/api/v1/briefings/odsay/test/station?station_name=강남역`

---

### Step 2️⃣: 프론트엔드 준비

**환경변수 확인 (client/.env):**
```
REACT_APP_API_BASE_URL=http://172.20.1.213:8000/api/v1  ✅ 설정됨
REACT_APP_USE_MOCK_API=false                             ✅ 실제 API 사용
EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY=...                     ✅ 설정됨
```

**터미널 2 (프론트엔드 시작):**

```bash
cd d:\Work\DailyMotion2\client
npm start
```

✅ Expo가 시작되면:
```
│ To run the app with live reloading, choose an option:
│
│ ▶ a  Android
│ ▶ i  iOS
│ ▶ w  Web
│ ▶ c  Choose a simulator
```

---

### Step 3️⃣: EXPO GO 앱에서 실행

**휴대폰 설정:**

1. **네트워크 확인**
   - 휴대폰이 PC와 동일한 WiFi에 연결되어 있는지 확인
   - 필수! (같은 로컬 네트워크 필요)

2. **EXPO GO 앱 실행**
   - Google Play / App Store에서 "Expo Go" 설치
   - 앱 실행

3. **QR 코드 스캔**
   - PC 터미널 2에 표시된 QR 코드 스캔
   - 또는 "Scan QR Code" 버튼으로 수동 스캔

4. **앱 로드 대기**
   - "Building JavaScript bundle" 진행 중...
   - 약 1-2분 소요

---

## 🎯 테스트 시나리오

### ✨ 시나리오 1: 경로 검색 기본 동작

1. **온보딩 화면 입장**
   - 앱 시작 후 "새로운 여정" 또는 "회사에 몇 시까지 도착해야 하나요?" 화면

2. **여정 선택**
   - 여정 카드 (예: "집 → 회사") 클릭
   - 로딩 인디케이터 표시됨 ⏳

3. **경로 데이터 수신**
   - 3~5개 경로 카드 표시:
     - 🚌 버스 + 지하철 | 45분 | 환승 1회
     - 🚇 지하철 | 50분 | 환승 0회
     - 🚕 택시 | 30분 | 환승 0회

4. **경로 선택**
   - 원하는 경로 카드 클릭
   - 체크 표시 표시됨 ✓

---

### ⚠️ 시나리오 2: 에러 처리

**서버 다운 상황:**
1. 서버 터미널에서 Ctrl+C 누르기 (서버 중지)
2. 경로 검색 시도
3. ❌ "경로를 불러올 수 없습니다" 메시지 표시

**복구:**
- 서버 다시 시작: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- 여정 다시 선택

---

### 💾 시나리오 3: 캐싱 테스트

1. **여정 A 선택**
   - API 호출 (로딩 표시)
   - 경로 데이터 표시

2. **다른 여정 B 선택**
   - API 호출 (로딩 표시)
   - 경로 데이터 표시

3. **여정 A 다시 선택**
   - ✅ **로딩 없이 즉시 표시** (캐시 사용)
   - 콘솔 로그 확인 가능

---

## 🔍 디버깅 팁

### 콘솔 로그 확인

**Expo Go 앱에서:**
```
Ctrl+M (Android) 또는 Cmd+M (iOS)
→ "Show Logs" 선택
```

**PC 터미널:**
```
[Route Search] Found 3 routes           ← 경로 로드 성공
[Route Search] Route search failed: ... ← 경로 로드 실패
```

### 네트워크 테스트

**API 응답 확인:**
```bash
# PC 터미널에서
curl "http://localhost:8000/api/v1/briefings/commute?userId=user_001"
```

**응답 예시:**
```json
{
  "data": {
    "alertType": "GO_NOW",
    "routesData": {
      "paths": [
        {
          "pathId": "path_0",
          "totalTime": 2700,
          "totalDistance": 9494,
          "transferCount": 1,
          "segments": [...]
        }
      ]
    }
  }
}
```

---

## 📊 모드 전환 가이드

### Mock 데이터로 테스트 (서버 없이)

**client/.env 수정:**
```
REACT_APP_USE_MOCK_API=true  # ← 변경
```

**메뜨:**
- 서버 없이 즉시 mock 경로 데이터 반환
- API 호출 없음
- 디버깅용으로 유용

### 실제 API로 테스트

**client/.env 수정:**
```
REACT_APP_USE_MOCK_API=false  # ← 변경
```

**필요:**
- 백엔드 서버 실행 필수
- PC IP가 올바르게 설정되어야 함

---

## 🆘 자주 발생하는 문제

### 문제 1: "Cannot connect to API"
```
해결:
1. 서버 실행 여부 확인: 터미널 1에서 "Uvicorn running on" 확인
2. PC IP 확인: ipconfig 에서 172.20.1.213 확인
3. 휴대폰 네트워크: PC와 같은 WiFi 연결 확인
4. 방화벽: Windows Defender 방화벽에서 포트 8000 허용
```

### 문제 2: "EXPO GO에서 블랙스크린"
```
해결:
1. Expo 종료 후 재실행: Ctrl+C → npm start
2. EXPO GO 앱 강제 종료 후 재실행
3. QR 코드 다시 스캔
```

### 문제 3: "경로 데이터가 안 나옴"
```
확인:
1. 서버 로그: "좌표 기반 경로 검색 성공" 메시지 확인
2. ODSAY API:
   curl "http://localhost:8000/api/v1/briefings/odsay/test/route?start_station=강남역&end_station=을지로입구역"
3. Mock 데이터로 테스트 먼저 진행
```

### 문제 4: "로딩이 계속됨"
```
해결:
1. 휴대폰 인터넷 연결 확인
2. PC 방화벽 설정 확인
3. 서버 로그 확인 (에러 메시지 있는지)
4. 네트워크 느림 → 시간 대기
```

---

## 📈 성공 체크리스트

- [ ] 백엔드 서버 실행 (`http://172.20.1.213:8000`)
- [ ] 프론트엔드 Expo 실행
- [ ] EXPO GO 앱에서 QR 코드 스캔
- [ ] 온보딩 화면 로드 완료
- [ ] 여정 선택 시 로딩 표시 (⏳)
- [ ] 경로 데이터 표시 (3~5개 경로)
- [ ] 경로 선택 가능 (✓ 체크)
- [ ] 캐싱 확인 (다시 선택 시 즉시 표시)

---

## 🚀 다음 단계

테스트가 완료되면:

1. **실제 데이터 검증**
   - ODSAY 경로 응답이 정확한지 확인
   - 소요 시간, 환승 정보 등 검증

2. **성능 최적화**
   - API 응답 속도 측정
   - 이미지 로딩 최적화
   - 캐싱 전략 개선

3. **에러 처리 개선**
   - 재시도 로직 추가
   - 네트워크 타임아웃 처리
   - 사용자 피드백 개선

---

## 📞 참고 자료

- **API 명세**: `client/src/services/ROUTE_SEARCH_README.md`
- **서버 로그**: 터미널 1 (실시간 디버깅)
- **앱 로그**: EXPO GO 앱의 "Show Logs"
- **소스 코드**:
  - 프론트엔드: `client/src/services/routeSearchService.ts`
  - 화면: `client/src/screens/Onboarding/screens/GoalTimeScreen.tsx`
  - 백엔드: `server/app/api/v1/path_optimize_router.py`

---

**작성**: 2025-11-18
**상태**: 🟢 Ready for Testing
**PC IP**: 172.20.1.213
