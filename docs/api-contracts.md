# DailyMotion v1 API Contracts

이 문서는 프론트엔드와 백엔드가 **고정 스펙으로 합의**하는 API 계약서입니다.  
모든 응답은 헌법 규약에 따라 기본적으로 `{"data": {...}}` 또는 `{"error": {...}}` 형태를 따릅니다.

Base URL: `https://api.dailymotion.example.com/api/v1`

---

## 출근 브리핑 – GET /api/v1/briefings/commute

### 설명
- 아침에 사용자가 앱을 열었을 때, **“지금 나가야 하는지(GO_NOW / LAST_CHANCE / NO_ACTION)”**를 판단해 주는 출근 브리핑 API입니다.

### Request

**HTTP Method**
- `GET`

**URL**
- `/api/v1/briefings/commute`

**Query Parameters**
- `userId` (string, optional, default: `"user_001"`)

### Response

**성공 (200) 예시**

```json
{
  "data": {
    "alertType": "GO_NOW",
    "message": "8:50 도착을 위해, 지금 집에서 출발하셔서 5분 후 도착하는 [7호선]을 타세요. (현재 열차 혼잡도: 보통 (55%))",
    "totalDurationMinutes": 42,
    "recommendedTransport": {
      "type": "SUBWAY",
      "name": "7호선",
      "lineNumber": "7호선",
      "destination": "상행",
      "departureInMinutes": 3,
      "transitTimeMinutes": 30,
      "isRealtime": true,
      "congestionLevel": "MEDIUM",
      "congestionValue": 55.0
    }
  }
}
```

**필드 설명**

- `data.alertType`: `"GO_NOW" | "LAST_CHANCE | "NO_ACTION"`
  - GO_NOW: 지금 나가면 여유 있게 도착
  - LAST_CHANCE: 지각 위험, 마지막 기회
  - NO_ACTION: 이미 늦었거나 별도 안내 없음
- `data.message`: 카드에 그대로 노출 가능한 한국어 안내 문구.
- `data.totalDurationMinutes`: 집 → 회사까지 Door-to-Door 예상 총 소요시간(분).
- `data.recommendedTransport`:
  - `type`: `"BUS" | "SUBWAY" | "WALK" | "TAXI"`
  - `name`: `"7호선"`, `"146번"` 등 노선/라인 이름.
  - `departureInMinutes`: **집 기준으로 몇 분 뒤에 출발하면 되는지**.
  - `transitTimeMinutes`: 대중교통 구간에서의 예상 이동 시간(분).
  - `isRealtime`: 실시간 ETA 기반 여부.
  - `congestionLevel`: `"LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH"`.
  - `congestionValue`: 혼잡도 값(%, 0–100).

**에러 (404) 예시**

```json
{
  "error": {
    "code": "E404",
    "message": "User user_999 not found"
  }
}
```

---

## 출퇴근 설정 저장 – POST /api/v1/briefings/commute-settings

### 설명
- 출근 브리핑에 필요한 **집/회사 주소와 목표 도착 시간, First/Last Mile 시간**을 저장하는 API입니다.

### Request

**HTTP Method**
- `POST`

**URL**
- `/api/v1/briefings/commute-settings`

**Query Parameters**

- `userId` (string, required)
- `homeAddress` (string, required)
- `workAddress` (string, required)
- `targetArrivalHour` (integer, required, 0–23)
- `targetArrivalMinute` (integer, required, 0–59)
- `firstMileDuration` (integer, optional, default 5)
- `lastMileDuration` (integer, optional, default 7)

### Response

**성공 (200) 예시**

```json
{
  "data": {
    "action": "SETTINGS_SAVED",
    "userId": "user_001",
    "message": "출퇴근 설정이 저장되었습니다.",
    "settings": {
      "homeAddress": "서울 강남구 역삼동 123",
      "workAddress": "서울 중구 을지로 456",
      "targetArrivalTime": "09:00",
      "firstMileDefaultDuration": 5,
      "lastMileDefaultDuration": 7
    }
  }
}
```

---

## 출퇴근 설정 조회 – GET /api/v1/briefings/commute-settings

### 설명
- 저장된 출퇴근 설정(집/회사 주소, 목표 도착 시간 등)을 조회하는 API입니다.

### Request

**HTTP Method**
- `GET`

**URL**
- `/api/v1/briefings/commute-settings`

**Query Parameters**
- `userId` (string, required)

### Response

**성공 (200) 예시**

```json
{
  "data": {
    "userId": "user_001",
    "homeAddress": "서울 강남구 역삼동 123",
    "workAddress": "서울 중구 을지로 456",
    "targetArrivalTime": "09:00",
    "firstMileDefaultDuration": 5,
    "lastMileDefaultDuration": 7
  }
}
```

---

## 자동 모드 전환 – GET /api/v1/context/mode-switch

### 설명
- GPS 기반으로 사용자가 **WAITING / WALKING / ON_TRIP** 상태인지 판정하고, 필요 시 화면 전환(예: ETA 화면) 액션을 알려주는 API입니다.

### Request

**HTTP Method**
- `GET`

**URL**
- `/api/v1/context/mode-switch`

**Query Parameters**

- `userId` (string, optional, default `"user_001"`)
- `currentLatitude` (number, required)
- `currentLongitude` (number, required)
- `currentAccuracy` (number, optional)
- `mode` (string, optional, `"COMMUTE" | "RETREAT"`, default `"COMMUTE"`)

### Response

**성공 (200) 예시 (간략형)**

```json
{
  "data": {
    "action": "AUTO_SWITCH_TO_ETA",
    "state": "ON_TRIP",
    "estimatedMinutes": 18,
    "switchMessage": "탑승 감지! 직장 도착까지 약 18분 남았습니다."
  }
}
```

- `data.action`: `"AUTO_SWITCH_TO_ETA" | "NO_ACTION"` 등.
- `data.state`: `"WAITING" | "WALKING" | "ON_TRIP" | "UNKNOWN"`.
- `data.estimatedMinutes`: 회사까지 남은 예상 시간(분).

---

## 대안 경로 제안 – POST /api/v1/context/routes/alternative

### 설명
- 현재 경로 대비 **시간 이득 / 환승 여유 / 혼잡도(Gate 1/2/3)**를 모두 검증한 뒤, **조건을 모두 만족할 때만** 대안 경로를 제안하는 API입니다.

### Request

**HTTP Method**
- `POST`

**URL**
- `/api/v1/context/routes/alternative`

**Body 예시**

```json
{
  "currentRouteTime": 35,
  "alternativeRouteTime": 27,
  "mode": "COMMUTE",
  "currentBusArrivalMinutes": 3,
  "currentBusDurationMinutes": 2,
  "transferBusArrivalMinutes": 8,
  "transferBusCongestion": 60,
  "transferLocation": "가산디지털단지",
  "transferLine": "7호선 급행",
  "congestionLevel": null
}
```

### Response

**성공 (200) – 제안 O (모든 Gate 통과)**

```json
{
  "data": {
    "suggestAlternativeRoute": true,
    "message": "더 빠른 경로 발견! (8분 단축) / 다음 '가산디지털단지' [7호선 급행] 환승하세요. (단, 현재 혼잡도 '보통')",
    "timeBenefit": 8,
    "transferLocation": "가산디지털단지",
    "transferLine": "7호선 급행",
    "transferCongestion": 45,
    "transferTime": 4,
    "serverRealtimeTransferMinutes": 9
  }
}
```

**성공 (200) – 제안 X (Gate 일부 실패)**

```json
{
  "data": {
    "suggestAlternativeRoute": false,
    "timeBenefit": 3,
    "failedGates": {
      "gate_1": true,
      "gate_2": false,
      "gate_3": false
    },
    "reasons": [
      "Gate 1 실패: 시간 단축이 3분으로 7분 미만"
    ]
  }
}
```

**주요 필드 설명**

- `suggestAlternativeRoute`: `true`일 때만 UI에서 대안 경로 버튼/배너 표시.
- `timeBenefit`: 현재 경로 대비 단축되는 시간(분).
- `transferTime`: 현재 수단에서 내려 다음 수단을 탈 때까지 여유 시간(분).
- `failedGates`: 어떤 Gate가 실패했는지 플래그.
- `reasons[]`: 실패 이유를 한국어로 설명하는 메시지.

---

## 환승 ETA 포함 경로 조회 – POST /api/v1/context/routes/with-transfer-eta

### 설명
- 출발역/도착역 이름만 알고 있을 때, ODSAY 경로 + **첫 지하철↔지하철 환승 지점의 실시간 ETA**를 함께 조회하는 API입니다.

### Request

**HTTP Method**
- `POST`

**URL**
- `/api/v1/context/routes/with-transfer-eta`

**Body 예시**

```json
{
  "startStationName": "온수역",
  "endStationName": "서울역"
}
```

### Response

```json
{
  "data": {
    "hasTransfer": true,
    "stationName": "가산디지털단지",
    "subwayLine": "7호선",
    "direction": "상행",
    "arrivalMinutes": 5,
    "arrivalSeconds": 300,
    "message": "5분 후 (부천종합운동장)",
    "trainStatus": "IN_OPERATION"
  }
}
```

---

## 환승 리마인더 – GET /api/v1/briefings/transfer-reminder

### 설명
- 사용자가 이동 중일 때, 환승역 반경(예: 500m) 안에 들어오면 **환승 알림 + 다음 열차 ETA**를 알려주는 API입니다.

### Request

**HTTP Method**
- `GET`

**URL**
- `/api/v1/briefings/transfer-reminder`

**Query Parameters**

- `userId` (string, optional)
- `currentLatitude` (number, required)
- `currentLongitude` (number, required)
- `radiusMeters` (number, optional, default `500`)

### Response

**예시**

```json
{
  "data": {
    "action": "TRANSFER_REMINDER",
    "stationName": "온수",
    "line": "7호선",
    "arrivalMinutes": 3,
    "isRealtime": true,
    "message": "3분 후 도착하는 7호선 열차로 환승하세요."
  }
}
```

- `action`: `"TRANSFER_REMINDER" | "NO_ACTION"`.

---

## 지연 감지 – POST /api/v1/context/exceptions/delays

### 설명
- AverageDurationDB에 저장된 **평균 소요시간 vs 실시간 ETA**를 비교해, 지연된 구간과 가장 심각한 구간을 찾아주는 API입니다.

### Request

**HTTP Method**
- `POST`

**URL**
- `/api/v1/context/exceptions/delays`

**Body 예시**

```json
{
  "segments": [
    {
      "segmentId": "subway_7_남구로-온수",
      "segmentName": "남구로 → 온수",
      "fromStation": "남구로",
      "toStation": "온수"
    }
  ],
  "currentHour": 8,
  "currentDayOfWeek": 2
}
```

### Response

**지연 감지(EXCEPTION_DETECTED) 예시**

```json
{
  "data": {
    "action": "EXCEPTION_DETECTED",
    "totalSegments": 1,
    "delayedCount": 1,
    "delayedSegments": [
      {
        "segmentId": "subway_7_남구로-온수",
        "segmentName": "남구로 → 온수",
        "isDelayed": true,
        "delayMinutes": 8,
        "type": "DELAY_WARNING",
        "message": "⚠️지연 감지! [남구로] 부근이 평소보다 8분 이상 늦어지고 있습니다.",
        "priority": "HIGH",
        "dataSource": "STATISTICAL",
        "confidence": 0.9
      }
    ],
    "mostCritical": {
      "segmentId": "subway_7_남구로-온수",
      "segmentName": "남구로 → 온수",
      "delayMinutes": 8,
      "priority": "HIGH",
      "message": "⚠️지연 감지! [남구로] 부근이 평소보다 8분 이상 늦어지고 있습니다."
    },
    "hasCritical": false
  }
}
```

- `data.action`: `"EXCEPTION_DETECTED" | "NO_ACTION"`.
- `delayedSegments[]`: 개별 구간 단위 지연 정보.
- `mostCritical`: 가장 심각한 구간(없으면 `null`).

---

## 택시 제안 – POST /api/v1/context/taxi/suggest

### 설명
- 출근/퇴근 모드에서 **지각 확정 / 막차 놓침** 상황일 때, 택시를 제안할지 여부와 메시지를 반환합니다.

### Request

**HTTP Method**
- `POST`

**URL**
- `/api/v1/context/taxi/suggest`

**Body 예시 (출근 모드, 지각 확정 케이스)**

```json
{
  "mode": "COMMUTE",
  "currentTime": "2025-11-19T08:20:00",
  "targetArrivalTime": "2025-11-19T09:00:00",
  "transitArrivalTime": "2025-11-19T09:05:00",
  "taxiArrivalTime": "2025-11-19T08:40:00"
}
```

### Response

```json
{
  "data": {
    "action": "TAXI_SUGGESTED",
    "type": "TAXI_COMMUTE_LATENESS_CONFIRMED",
    "message": "🚨지각 확정! 대중교통 이용 시 09:05 도착 예상. 지금 [택시] 탑승 시 08:40 도착 가능합니다.",
    "priority": "CRITICAL",
    "targetArrivalTime": "09:00",
    "transitArrivalTime": "09:05",
    "taxiArrivalTime": "08:40",
    "delayMinutes": 5,
    "timeBenefit": 25,
    "ctaButton": {
      "text": "택시 호출하기",
      "action": "CALL_TAXI",
      "deeplink": "kakaomap://taxi?lat=37.4979&lng=127.0276"
    }
  }
}
```

- `data.action`: `"TAXI_SUGGESTED" | "NO_ACTION"`.
- `data.type`:
  - `"TAXI_COMMUTE_LATENESS_CONFIRMED"` (출근 모드)
  - `"TAXI_RETREAT_LAST_BUS_MISSED"` (퇴근 모드).

---

## 스마트 폴링 – GET /api/v1/context/polling/frequency

### 설명
- 사용자 속도/위치/환승 거리 등을 보고, **폴링 빈도(HIGH/MEDIUM/LOW)**와 다음 체크까지의 간격을 반환합니다.

### Request

**HTTP Method**
- `GET`

**URL**
- `/api/v1/context/polling/frequency`

**Query Parameters**

- `userLatitude` (number, required)
- `userLongitude` (number, required)
- `userSpeed` (number, required, km/h)
- `transitMode` (string, required, `"SUBWAY" | "BUS" | "TRAIN" | "WALKING" | "WAITING"`)
- `distanceToTransfer` (number, optional)
- `inCongestionZone` (boolean, optional)
- `minutesUntilAlert` (integer, optional)

### Response

```json
{
  "data": {
    "frequency": "HIGH",
    "intervalSeconds": 15,
    "reason": "환승 지점 300m 이내 + 막차 알림 10분 이내"
  }
}
```

---

## 안전/위험 지도 – GET /api/v1/risk-manage/risk-zones

### 설명
- 지도 화면에서 **위험 지역(침수, 사고 등)**을 표시하기 위한 API입니다.

### Request

**HTTP Method**
- `GET`

**URL**
- `/api/v1/risk-manage/risk-zones`

**Query Parameters (선택)**
- `minLat`, `maxLat`, `minLng`, `maxLng` – 조회할 지도의 경계 박스.

### Response

```json
{
  "data": [
    {
      "id": 123,
      "riskType": "flooding",
      "center": { "lat": 37.4928, "lng": 126.8239 },
      "radiusMeters": 200,
      "level": "HIGH"
    }
  ]
}
```

---

## 시민 리포트 생성 – POST /api/v1/risk-manage/report

### 설명
- 사용자가 침수/사고 등 **위험 상황을 신고**할 수 있는 API입니다.  
  (프론트에서 SafetyGuard 화면의 “제보하기” 버튼에 연결할 수 있습니다.)

### Request

**HTTP Method**
- `POST`

**URL**
- `/api/v1/risk-manage/report`

**Body 예시**

```json
{
  "location": {
    "lat": 37.4928,
    "lng": 126.8239
  },
  "riskType": "flooding",
  "description": "지하차도에 물이 차오르고 있습니다.",
  "reporterId": 42
}
```

### Response

```json
{
  "data": {
    "reportId": 101,
    "status": "created",
    "location": {
      "lat": 37.4928,
      "lng": 126.8239
    }
  }
}
```

