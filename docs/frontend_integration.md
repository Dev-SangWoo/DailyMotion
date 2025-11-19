# Frontend Integration Guide (DailyMotion v1)

이 문서는 **화면/상황별로 어떤 API를 어떻게 호출하고, 어떤 필드를 UI에 매핑할지**를 정리한 가이드입니다.  
모든 예시는 `client/src/services/api.ts` 등에서 사용하는 React Query/TanStack Query 기반을 가정합니다.

---

## 1. 출발 전 화면 (Morning Briefing)

- 대표 화면: “오늘 출근 언제 나가야 할까?” 카드
- 주요 API:
  - 설정 저장/조회:  
    - `POST /api/v1/briefings/commute-settings`
    - `GET /api/v1/briefings/commute-settings`
  - 출근 브리핑:
    - `GET /api/v1/briefings/commute`

### 1-1. 호출 타이밍

- 앱 최초 진입 시:
  - `GET /api/v1/briefings/commute-settings`로 설정 여부 확인.
  - 설정이 없으면 온보딩/설정 화면으로 유도.
- 설정이 존재하는 경우:
  - `GET /api/v1/briefings/commute`를 호출하여 **오늘 아침 출근 브리핑 카드**를 그립니다.
- 사용자가 “출근 루틴 시작” 같은 버튼을 누를 때도 동일하게 호출해도 됩니다.

### 1-2. Request 구성

```ts
// 설정 저장 예시
await api.post('/api/v1/briefings/commute-settings', undefined, {
  params: {
    userId,
    homeAddress,
    workAddress,
    targetArrivalHour: 9,
    targetArrivalMinute: 0,
    firstMileDuration: 5,
    lastMileDuration: 7,
  },
});

// 출근 브리핑 조회 예시
const res = await api.get('/api/v1/briefings/commute', {
  params: { userId },
});
const briefing = res.data.data;
```

### 1-3. Response → UI 매핑

```ts
const {
  alertType,              // "GO_NOW" | "LAST_CHANCE" | "NO_ACTION"
  message,                // 사용자에게 보여줄 한 줄 메시지
  totalDurationMinutes,   // Door-to-Door 예상 소요시간 (분)
  recommendedTransport,   // { type, name, departureInMinutes, ... }
} = briefing;
```

- `alertType` → 카드 상태/색상
  - `GO_NOW`: 초록색/“지금 나가면 딱 좋아요”
  - `LAST_CHANCE`: 주황/빨강 + “⚠️ 지각 주의”
  - `NO_ACTION`: 회색 + “오늘은 지각 확정…” 등
- `message` → 메인 텍스트를 그대로 사용 (이미 한국어 문장으로 구성됨).
- `totalDurationMinutes` → 카드 하단 서브 텍스트
  - 예: “총 소요시간 약 42분”
- `recommendedTransport`:
  - `type` (`"BUS" | "SUBWAY" | "WALK" | "TAXI"`) → 아이콘 결정
  - `name` (`"7호선"`, `"146번"`) → 라벨
  - `departureInMinutes` → “X분 후 출발” 뱃지
  - `congestionLevel` / `congestionValue` → 라인/칸 혼잡도 아이콘 및 색상

간단 카드 컴포넌트 예시:

```ts
if (alertType === 'GO_NOW') {
  // green card
} else if (alertType === 'LAST_CHANCE') {
  // orange/red card
}

return (
  <Card>
    <Text>{message}</Text>
    {totalDurationMinutes && (
      <SubText>{`총 소요시간 약 ${totalDurationMinutes}분`}</SubText>
    )}
    {recommendedTransport && (
      <Badge>
        {recommendedTransport.name} · {recommendedTransport.departureInMinutes}분 후 출발
      </Badge>
    )}
  </Card>
);
```

---

## 2. 이동 중 – 대안 경로 제안 (Alternative Route)

- 대표 화면: “지금 경로보다 더 빠른 길이 있을까요?” 배너/시트
- 주요 API:
  - `POST /api/v1/context/routes/alternative`
  - (보조) `POST /api/v1/context/routes/with-transfer-eta`
  - (보조) `GET /api/v1/briefings/transfer-reminder`

### 2-1. 호출 타이밍

- 앱이 사용자가 이미 이동 중(ON_TRIP)임을 감지했을 때:
  - GPS/ODSAY 경로 분석 결과, “대안 경로 후보”가 있을 때만 호출.
- 혹은 ETA 화면에서 “더 빠른 길 찾기” 버튼을 눌렀을 때.

### 2-2. Request 구성

```ts
const payload = {
  currentRouteTime: 35,
  alternativeRouteTime: 27,
  mode: 'COMMUTE',
  currentBusArrivalMinutes: 3,
  currentBusDurationMinutes: 2,
  transferBusArrivalMinutes: 8,
  transferBusCongestion: 60,
  transferLocation: '가산디지털단지',
  transferLine: '7호선 급행',
};

const res = await api.post('/api/v1/context/routes/alternative', payload);
const data = res.data.data;
```

### 2-3. Response → UI 매핑

```ts
const {
  suggestAlternativeRoute,
  message,
  timeBenefit,
  transferLocation,
  transferLine,
  transferCongestion,
  transferTime,
  failedGates,
  reasons,
} = data;
```

- `suggestAlternativeRoute === true` 일 때만:
  - 상단 배너나 버튼을 노출.
  - `message`는 그대로 CTA 카드/배너 문구에 사용 가능.
  - `timeBenefit` → “최대 X분 단축” 등 강조 텍스트.
  - `transferTime` → 환승 여유가 충분한지 표시 (예: “환승 여유 4분”).
- `suggestAlternativeRoute === false` 인 경우:
  - `failedGates`와 `reasons[]`를 기반으로 UX를 세분화 가능:
    - Gate 1 실패: “시간 이득이 크지 않아 기존 경로 유지”
    - Gate 2 실패: “환승 여유 부족 (내리자마자 떠나는 버스 방지)”
    - Gate 3 실패: “혼잡도 심각 → 경험 저하로 추천 보류”

간단 배너 예시:

```ts
if (!data.suggestAlternativeRoute) return null;

return (
  <Banner>
    <Text>{data.message}</Text>
    <SubText>{`최대 ${data.timeBenefit}분 단축 · 환승 여유 ${data.transferTime}분`}</SubText>
  </Banner>
);
```

### 2-4. 환승 ETA / 리마인더와의 연계

- 환승 ETA:
  - `POST /api/v1/context/routes/with-transfer-eta`
  - 출발역/도착역 문자열만으로 환승 지점 + ETA를 얻고 싶을 때 사용.
- 환승 리마인더:
  - `GET /api/v1/briefings/transfer-reminder`
  - GPS 기반으로 “환승역 반경 300~500m 진입 시” 자동 알림을 띄우는 용도.

```ts
const res = await api.get('/api/v1/briefings/transfer-reminder', {
  params: { userId, currentLatitude, currentLongitude },
});

if (res.data.data.action === 'TRANSFER_REMINDER') {
  showToast(res.data.data.message);
}
```

---

## 3. 돌발 상황 – 지연/재난 배너

- 대표 화면: “경로 상 지연/사고 안내” 배너
- 주요 API:
  - 지연 감지:
    - `POST /api/v1/context/exceptions/delays`
  - 택시 제안:
    - `POST /api/v1/context/taxi/suggest`
  - 안전/위험 지도:
    - `GET /api/v1/risk-manage/risk-zones`

### 3-1. 지연 감지 배너

```ts
const res = await api.post('/api/v1/context/exceptions/delays', {
  segments: [
    {
      segmentId: 'subway_7_남구로-온수',
      segmentName: '남구로 → 온수',
      fromStation: '남구로',
      toStation: '온수',
    },
  ],
  currentHour: currentHour,
  currentDayOfWeek: currentDow,
});

const result = res.data.data;

if (result.action === 'EXCEPTION_DETECTED') {
  const most = result.mostCritical ?? result.delayedSegments[0];
  showDelayBanner(most.message);
}
```

- `data.action === "EXCEPTION_DETECTED"`:
  - 상단 배너 또는 토스트를 띄웁니다.
- `data.mostCritical.message`:
  - 이미 “⚠️지연 감지! [남구로] 부근이 평소보다 8분 이상…” 형태로 구성되어 있어 **그대로 사용** 가능.
- `data.delayedSegments[]`:
  - 리스트 기반으로 “지도 상 특정 구간 강조 표시” 등에서도 사용 가능.

### 3-2. 택시 제안 (지각 확정 / 막차 놓침)

```ts
const res = await api.post('/api/v1/context/taxi/suggest', {
  mode: 'COMMUTE',
  currentTime: now.toISOString(),
  targetArrivalTime: target.toISOString(),
  transitArrivalTime: transitEta.toISOString(),
  taxiArrivalTime: taxiEta.toISOString(),
});

const data = res.data.data;

if (data.action === 'TAXI_SUGGESTED') {
  openBottomSheet({
    title: '택시 제안',
    message: data.message,
    ctaText: data.ctaButton.text,
    onPressCta: () => Linking.openURL(data.ctaButton.deeplink),
  });
}
```

- `data.action == "TAXI_SUGGESTED"`일 때만 택시 관련 UI 노출.
- `data.message`는 그대로 사용 가능 (이모지 포함).
- `data.ctaButton.deeplink`는 Kakao/Naver 택시 호출 딥링크로 연결.

### 3-3. 안전/재난 정보 배너

- 지도 기반 SafetyGuard 화면에서:
  - `GET /api/v1/risk-manage/risk-zones` 호출 후, 폴리곤/원으로 지도에 표시.
- 추후, 실제 재난 문자/공공 API 연동 시:
  - 이 API와 `exceptions/delays` 결과를 조합해 “지연 + 재난”이 겹치는 곳을 강조 표시하는 UX도 가능.

```ts
const res = await api.get('/api/v1/risk-manage/risk-zones', {
  params: { minLat, maxLat, minLng, maxLng },
});

const zones = res.data.data;
zones.forEach(zone => drawRiskCircleOnMap(zone.center, zone.radiusMeters));
```

---

## 4. 요약 – 각 화면별 최소 호출 세트

- **Morning Briefing**
  - 설정 없을 때: `GET /briefings/commute-settings` → 없으면 설정 저장 화면
  - 설정 저장: `POST /briefings/commute-settings`
  - 브리핑: `GET /briefings/commute`
- **이동 중 대안 경로**
  - `GET /context/mode-switch` (상태 감지)
  - `POST /context/routes/alternative` (Gate 1/2/3 검증)
  - (옵션) `POST /context/routes/with-transfer-eta`, `GET /briefings/transfer-reminder`
- **돌발 상황/재난**
  - `POST /context/exceptions/delays`
  - `POST /context/taxi/suggest`
  - `GET /risk-manage/risk-zones`

위 조합만 이해하면, 프론트는 **시나리오.md에 있는 UX 흐름을 거의 그대로 구현**할 수 있습니다.

