# Path Optimize Module API Documentation

> **Version**: v3.0
> **Module**: `app.modules.path_optimize`
> **Service**: `PathOptimizeService`
> **Last Updated**: 2025-01-15

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Public Methods](#public-methods)
   - [1. get_commute_briefing()](#1-get_commute_briefing)
   - [2. get_retreat_mode_last_bus_alert()](#2-get_retreat_mode_last_bus_alert)
   - [3. get_auto_mode_switch_action()](#3-get_auto_mode_switch_action)
   - [4. get_alternative_route_suggestion()](#4-get_alternative_route_suggestion)
   - [5. get_seating_optimization()](#5-get_seating_optimization)
   - [6. get_exception_alert()](#6-get_exception_alert)
   - [7. get_taxi_suggestion()](#7-get_taxi_suggestion)
   - [8. get_retreat_mode_goal_selection()](#8-get_retreat_mode_goal_selection)
   - [9. save_retreat_mode_choice()](#9-save_retreat_mode_choice)
   - [10. get_routes_by_retreat_goal()](#10-get_routes_by_retreat_goal)
   - [11. get_smart_polling_frequency()](#11-get_smart_polling_frequency)
   - [12. get_polling_status()](#12-get_polling_status)
3. [Error Codes](#error-codes)
4. [Data Models](#data-models)

---

## Overview

`PathOptimizeService`는 DailyMotion 프로젝트의 핵심 경로 최적화 로직을 담당합니다.

### 주요 기능

- **Logic 1.1**: 능동적 출발 알림 (GO_NOW, LAST_CHANCE)
- **Logic 1.2**: 마지노선 경고 및 퇴근 모드 막차 알림
- **Logic 2.1**: Context Awareness 기반 자동 모드 전환
- **Logic 2.2**: 고신뢰 대안 경로 제안 (3가지 Gate 검증)
- **Logic 2.3**: 탑승/환승 최적화 가이드
- **Logic 3.1**: 지연 감지 및 돌발상황 알림
- **Logic 3.2**: 택시 제안 (최후의 수단)
- **Logic 4.1-4.2**: 퇴근 목표 선택 (A/B/C)
- **Logic 4.3**: 스마트 폴링 빈도 최적화

### Architecture

```
PathOptimizeService
├── Dependencies (DI)
│   ├── OdsayAPIClientInterface (대중교통 API)
│   ├── ContextDetectorInterface (GPS 기반 상태 감지)
│   ├── GateValidatorInterface (대안 경로 검증)
│   ├── SeatingOptimizerInterface (착석 최적화)
│   ├── DelayDetectorInterface (지연 감지)
│   └── TaxiSuggesterInterface (택시 제안)
└── Public Methods (12개)
```

---

## Public Methods

### 1. get_commute_briefing()

**출근 브리핑 조회** - Logic 1.1 & 1.2 구현

#### Signature

```python
def get_commute_briefing(
    self,
    commute_settings: Dict[str, Any],
    current_time: datetime,
    routes_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `commute_settings` | `Dict[str, Any]` | Yes | 사용자 출퇴근 설정 |
| `commute_settings.homeAddress` | `str` | Yes | 집 주소 |
| `commute_settings.workAddress` | `str` | Yes | 회사 주소 |
| `commute_settings.targetArrivalTime` | `time` | Yes | 목표 도착 시간 |
| `commute_settings.firstMileDefaultDuration` | `int` | No | First Mile 도보 시간 (분, 기본값: 5) |
| `commute_settings.lastMileDefaultDuration` | `int` | No | Last Mile 도보 시간 (분, 기본값: 7) |
| `current_time` | `datetime` | Yes | 현재 시간 |
| `routes_data` | `Dict[str, Any]` | No | ODSAY API 응답 데이터 |

#### Returns

**Success (2xx):**

```json
{
  "data": {
    "alertType": "GO_NOW" | "LAST_CHANCE" | "NO_ACTION",
    "message": "8:50 도착을 위해, 지금 집에서 출발하셔서 5분 뒤 오는 [123번 버스]를 타세요.",
    "recommendedTransport": {
      "type": "BUS" | "SUBWAY" | "WALK" | "TAXI",
      "name": "123번",
      "departureInMinutes": 5,
      "lineNumber": "123",
      "destination": "강남역"
    }
  }
}
```

**Error (4xx):**

```json
{
  "error": {
    "code": "E001",
    "message": "targetArrivalTime is required"
  }
}
```

#### Logic Flow

1. **입력 검증**: `targetArrivalTime` 필수 체크
2. **시간 계산**: 목표 도착 시간까지 남은 시간
3. **Door-to-Door 계산**: First Mile + Transit + Last Mile
4. **알림 판단**:
   - `minutes_until_arrival >= first_mile + 10` → `GO_NOW`
   - `0 <= minutes_until_arrival < first_mile + 10` → `LAST_CHANCE`
   - `minutes_until_arrival < 0` → `NO_ACTION` (이미 늦음)

#### Error Codes

- `E001`: Missing required field (`targetArrivalTime`)
- `E002`: Invalid type (must be `time` object)

#### Example

```python
from app.modules.path_optimize.service import PathOptimizeService
from datetime import datetime, time

service = PathOptimizeService()

result = service.get_commute_briefing(
    commute_settings={
        "homeAddress": "서울 강남구 역삼동",
        "workAddress": "서울 중구 을지로",
        "targetArrivalTime": time(8, 50),
        "firstMileDefaultDuration": 5,
        "lastMileDefaultDuration": 7
    },
    current_time=datetime(2025, 1, 15, 8, 30, 0)
)

print(result)
# {
#   "data": {
#     "alertType": "GO_NOW",
#     "message": "8:50 도착을 위해...",
#     "recommendedTransport": {...}
#   }
# }
```

---

### 2. get_retreat_mode_last_bus_alert()

**퇴근 모드 막차 알림** - Logic 1.2 퇴근 모드 구현

#### Signature

```python
def get_retreat_mode_last_bus_alert(
    self,
    retreat_settings: Dict[str, Any],
    current_time: datetime
) -> Dict[str, Any]
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `retreat_settings` | `Dict[str, Any]` | Yes | 퇴근 설정 |
| `retreat_settings.selectedRoute` | `str` | Yes | 선택한 경로 (A/B/C) |
| `retreat_settings.homeAddress` | `str` | Yes | 집 주소 |
| `retreat_settings.workAddress` | `str` | Yes | 회사 주소 |
| `current_time` | `datetime` | Yes | 현재 시간 |

#### Returns

```json
{
  "data": {
    "alertType": "LAST_CHANCE",
    "message": "선택하신 [B. 편안하게(착석)]의 막차가 30분 뒤입니다.",
    "recommendedTransport": {
      "type": "BUS",
      "name": "456번",
      "departureInMinutes": 30
    }
  }
}
```

#### Logic Flow

1. 사용자가 선택한 경로 (A/B/C) 확인
2. 해당 경로의 막차 시간 조회
3. 막차까지 남은 시간 계산
4. 알림 메시지 생성

---

### 3. get_auto_mode_switch_action()

**자동 모드 전환** - Logic 2.1 Context Awareness 구현

#### Signature

```python
def get_auto_mode_switch_action(
    self,
    user_context: Dict[str, Any]
) -> Dict[str, Any]
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_context` | `Dict[str, Any]` | Yes | 사용자 컨텍스트 정보 |
| `user_context.currentGPS` | `Dict` | Yes | 현재 GPS 위치 |
| `user_context.currentGPS.latitude` | `float` | Yes | 현재 위도 |
| `user_context.currentGPS.longitude` | `float` | Yes | 현재 경도 |
| `user_context.commute_settings` | `Dict` | Yes | 출퇴근 설정 |
| `user_context.mode` | `str` | Yes | 현재 모드 (COMMUTE/RETREAT) |

#### Returns

**탑승 감지 시:**

```json
{
  "data": {
    "action": "AUTO_SWITCH_TO_ETA",
    "destinationArrivalTime": "08:45:00",
    "estimatedMinutes": 15,
    "currentLocation": {
      "latitude": 37.4979,
      "longitude": 127.0276
    },
    "destination": {
      "address": "서울 중구 을지로",
      "latitude": 37.5662,
      "longitude": 126.9778
    }
  }
}
```

**대기 중:**

```json
{
  "data": {
    "detectedState": "WAITING",
    "message": "집 근처에서 대기 중입니다."
  }
}
```

#### Logic Flow

1. GPS 위치 기반 사용자 상태 감지 (ContextDetector 사용)
2. 상태별 처리:
   - `WAITING`: 대기 중
   - `WALKING`: 도보 이동 중
   - `ON_TRIP`: 탑승 중 → 화면 전환 트리거
3. 탑승 감지 시 목적지까지 ETA 계산

---

### 4. get_alternative_route_suggestion()

**대안 경로 제안** - Logic 2.2 고신뢰 대안 경로 구현

#### Signature

```python
def get_alternative_route_suggestion(
    self,
    current_route_time: int,
    alternative_route_time: int,
    mode: SystemMode,
    current_bus_arrival_minutes: int,
    alternative_bus_arrival_minutes: int,
    alternative_congestion_rate: int
) -> Dict[str, Any]
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `current_route_time` | `int` | Yes | 현재 경로 소요 시간 (분) |
| `alternative_route_time` | `int` | Yes | 대안 경로 소요 시간 (분) |
| `mode` | `SystemMode` | Yes | 시스템 모드 (COMMUTE/RETREAT) |
| `current_bus_arrival_minutes` | `int` | Yes | 현재 버스 도착까지 시간 (분) |
| `alternative_bus_arrival_minutes` | `int` | Yes | 대안 버스 도착까지 시간 (분) |
| `alternative_congestion_rate` | `int` | Yes | 대안 경로 혼잡도 (%) |

#### Returns

**Gate 통과 시:**

```json
{
  "data": {
    "shouldSuggest": true,
    "suggestion": "대안 경로로 10분 빠르게 도착할 수 있습니다.",
    "alternativeRoute": {
      "timeSaved": 10,
      "transferCertainty": true,
      "congestionRate": 60
    },
    "gateResults": {
      "gate1": "PASS",
      "gate2": "PASS",
      "gate3": "PASS"
    }
  }
}
```

**Gate 실패 시:**

```json
{
  "data": {
    "shouldSuggest": false,
    "reason": "Gate 1 failed: Insufficient time benefit (3 minutes < 7 minutes threshold)",
    "gateResults": {
      "gate1": "FAIL",
      "gate2": "NOT_EVALUATED",
      "gate3": "NOT_EVALUATED"
    }
  }
}
```

#### Logic Flow - 3가지 Gate 검증

**Gate 1: Clear Benefit (명확한 이득)**
- 출근 모드: 7분 이상 절약
- 퇴근 모드: 10분 이상 절약

**Gate 2: Transfer Certainty (환승 확실성)**
- 대안 경로 환승 여유 시간 ≥ 3분

**Gate 3: Experience Quality (경험 품질)**
- 혼잡도 < 80% (착석 가능)

**STRICTLY FORBIDDEN**: 하나라도 Gate 실패 시 제안 금지

---

### 5. get_seating_optimization()

**착석 최적화 가이드** - Logic 2.3 구현

#### Signature

```python
def get_seating_optimization(
    self,
    route_info: Dict[str, Any],
    user_preferences: Dict[str, Any]
) -> Dict[str, Any]
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `route_info` | `Dict[str, Any]` | Yes | 경로 정보 |
| `route_info.stationName` | `str` | Yes | 역/정류장 이름 |
| `route_info.lineNumber` | `str` | Yes | 노선 번호 |
| `route_info.direction` | `str` | Yes | 방향 |
| `user_preferences` | `Dict[str, Any]` | Yes | 사용자 선호도 |
| `user_preferences.seatingPriority` | `bool` | Yes | 착석 우선 여부 |

#### Returns

```json
{
  "data": {
    "boardingGuide": {
      "recommendedCar": 3,
      "recommendedDoor": "2번 출입문",
      "waitingPosition": "계단 옆",
      "reason": "다음 역 하차객이 많아 착석 확률이 높습니다."
    },
    "alternativeOptions": [
      {
        "car": 5,
        "reason": "환승 시 이동 거리가 짧습니다."
      }
    ]
  }
}
```

---

### 6. get_exception_alert()

**돌발상황 알림** - Logic 3.1 지연 감지 구현

#### Signature

```python
def get_exception_alert(
    self,
    route_id: str,
    current_location: Dict[str, float],
    expected_arrival_time: datetime
) -> Dict[str, Any]
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `route_id` | `str` | Yes | 경로 ID |
| `current_location` | `Dict[str, float]` | Yes | 현재 위치 (lat, lon) |
| `expected_arrival_time` | `datetime` | Yes | 예상 도착 시간 |

#### Returns

**지연 감지 시:**

```json
{
  "data": {
    "alertType": "DELAY_DETECTED",
    "delayMinutes": 15,
    "reason": "도로 공사로 인한 지연",
    "alternativeOptions": [
      {
        "routeId": "route_alt_1",
        "estimatedTime": 25,
        "description": "지하철 2호선 이용"
      }
    ]
  }
}
```

---

### 7. get_taxi_suggestion()

**택시 제안** - Logic 3.2 최후의 수단 구현

#### Signature

```python
def get_taxi_suggestion(
    self,
    mode: SystemMode,
    current_time: datetime,
    target_arrival_time: datetime,
    transit_arrival_time: datetime
) -> Dict[str, Any]
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | `SystemMode` | Yes | 시스템 모드 (COMMUTE/RETREAT) |
| `current_time` | `datetime` | Yes | 현재 시간 |
| `target_arrival_time` | `datetime` | Yes | 목표 도착 시간 |
| `transit_arrival_time` | `datetime` | Yes | 대중교통 도착 시간 |

#### Returns

**택시 필요 시:**

```json
{
  "data": {
    "taxiRequired": true,
    "reason": "대중교통으로는 10분 지각 예상",
    "estimatedCost": 15000,
    "estimatedTime": 20,
    "message": "지금 택시를 타면 정시 도착 가능합니다."
  }
}
```

**택시 불필요 시:**

```json
{
  "data": {
    "taxiRequired": false,
    "message": "대중교통으로 충분히 도착 가능합니다."
  }
}
```

#### Logic Flow

1. 대중교통 도착 시간 vs 목표 시간 비교
2. 지각 예상 시간 계산
3. 출근 모드에서만 택시 제안 (퇴근은 제안 안 함)
4. 예상 비용 및 시간 계산

---

### 8. get_retreat_mode_goal_selection()

**퇴근 목표 선택 화면** - Logic 4.1 구현

#### Signature

```python
def get_retreat_mode_goal_selection(
    self,
    current_location: Dict[str, float]
) -> Dict[str, Any]
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `current_location` | `Dict[str, float]` | Yes | 현재 위치 (lat, lon) |

#### Returns

```json
{
  "data": {
    "options": [
      {
        "id": "A",
        "label": "가장 빠르게",
        "estimatedTime": 25,
        "description": "최단 시간 경로"
      },
      {
        "id": "B",
        "label": "편안하게 (착석)",
        "estimatedTime": 35,
        "description": "착석 확률 높은 경로"
      },
      {
        "id": "C",
        "label": "평소 경로",
        "estimatedTime": 30,
        "description": "자주 이용하는 경로"
      }
    ],
    "message": "오늘의 퇴근 목표를 선택하세요."
  }
}
```

---

### 9. save_retreat_mode_choice()

**퇴근 선택 저장** - Logic 4.2 구현

#### Signature

```python
def save_retreat_mode_choice(
    self,
    user_id: str,
    choice: str,
    timestamp: datetime
) -> Dict[str, Any]
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | `str` | Yes | 사용자 ID |
| `choice` | `str` | Yes | 선택 (A/B/C) |
| `timestamp` | `datetime` | Yes | 선택 시간 |

#### Returns

```json
{
  "data": {
    "saved": true,
    "choice": "B",
    "message": "선택이 저장되었습니다."
  }
}
```

---

### 10. get_routes_by_retreat_goal()

**퇴근 목표별 경로 조회** - Logic 4.2 구현

#### Signature

```python
def get_routes_by_retreat_goal(
    self,
    goal: str,
    current_location: Dict[str, float],
    destination: Dict[str, float]
) -> Dict[str, Any]
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `goal` | `str` | Yes | 퇴근 목표 (A/B/C) |
| `current_location` | `Dict[str, float]` | Yes | 현재 위치 |
| `destination` | `Dict[str, float]` | Yes | 목적지 |

#### Returns

```json
{
  "data": {
    "routes": [
      {
        "id": "route_1",
        "totalTime": 35,
        "transfers": 1,
        "seatingProbability": 85,
        "steps": [...]
      }
    ]
  }
}
```

---

### 11. get_smart_polling_frequency()

**스마트 폴링 빈도** - Logic 4.3 구현

#### Signature

```python
def get_smart_polling_frequency(
    self,
    user_latitude: float,
    user_longitude: float,
    user_speed: float,
    transit_mode: str,
    distance_to_transfer: float,
    in_congestion_zone: bool,
    minutes_until_alert: int
) -> Dict[str, Any]
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_latitude` | `float` | Yes | 사용자 위도 |
| `user_longitude` | `float` | Yes | 사용자 경도 |
| `user_speed` | `float` | Yes | 이동 속도 (m/s) |
| `transit_mode` | `str` | Yes | 교통 모드 (WAITING/WALKING/ON_TRIP) |
| `distance_to_transfer` | `float` | Yes | 환승 지점까지 거리 (m) |
| `in_congestion_zone` | `bool` | Yes | 혼잡 지역 여부 |
| `minutes_until_alert` | `int` | Yes | 알림까지 남은 시간 (분) |

#### Returns

```json
{
  "data": {
    "frequency": "HIGH",
    "intervalSeconds": 10,
    "reason": "환승 지점 근처 (200m) - 높은 빈도 필요"
  }
}
```

#### Logic Flow

**HIGH frequency (10초):**
- 환승 지점 300m 이내
- 알림 5분 전
- 혼잡 지역 내

**MEDIUM frequency (30초):**
- 도보 이동 중
- 알림 10분 전

**LOW frequency (300초 = 5분):**
- 정지 상태
- 알림 60분 이상 남음

---

### 12. get_polling_status()

**폴링 상태 조회** - Logic 4.3 구현

#### Signature

```python
def get_polling_status(
    self,
    last_poll_time: datetime,
    current_frequency: str
) -> Dict[str, Any]
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `last_poll_time` | `datetime` | Yes | 마지막 폴링 시간 |
| `current_frequency` | `str` | Yes | 현재 빈도 (HIGH/MEDIUM/LOW) |

#### Returns

```json
{
  "data": {
    "shouldPoll": true,
    "nextPollTime": "2025-01-15T08:35:10Z",
    "reason": "HIGH frequency (10초 경과)"
  }
}
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `E001` | Missing required field | 필수 필드 누락 |
| `E002` | Invalid type | 타입 불일치 |
| `E003` | Invalid value | 값 유효성 검증 실패 |
| `E004` | External API error | 외부 API 호출 실패 |
| `E005` | Database error | 데이터베이스 오류 |
| `E006` | Unauthorized | 인증 실패 |
| `E007` | Not found | 리소스 없음 |

---

## Data Models

### CommuteSettings

```python
{
    "homeAddress": str,           # 집 주소
    "workAddress": str,           # 회사 주소
    "targetArrivalTime": time,    # 목표 도착 시간
    "firstMileDefaultDuration": int,  # First Mile (분, 기본 5)
    "lastMileDefaultDuration": int,   # Last Mile (분, 기본 7)
    "homeLatitude": float,        # 집 위도 (선택)
    "homeLongitude": float,       # 집 경도 (선택)
    "workLatitude": float,        # 회사 위도 (선택)
    "workLongitude": float        # 회사 경도 (선택)
}
```

### SystemMode (Enum)

- `COMMUTE`: 출근 모드 (지각 방지)
- `RETREAT`: 퇴근 모드 (경험 충족)
- `NEUTRAL`: 중립 모드 (대기)

### AlertType (Enum)

- `GO_NOW`: 지금 출발하세요
- `LAST_CHANCE`: 마지노선 경고
- `NO_ACTION`: 조치 필요 없음
- `TAXI_REQUIRED`: 택시 필요
- `USER_CHOICE_REQUIRED`: 사용자 선택 필요 (퇴근 모드)

### TransportType (Enum)

- `BUS`: 버스
- `SUBWAY`: 지하철
- `WALK`: 도보
- `TAXI`: 택시
- `UNKNOWN`: 알 수 없음

### RetreatChoice (Enum)

- `A`: 가장 빠르게
- `B`: 편안하게 (착석)
- `C`: 평소 경로

---

## Response Format (OpenAPI 준수)

### Success Response

모든 2xx 응답은 `{"data": ...}` 형태로 래핑됩니다.

```json
{
  "data": {
    // payload
  }
}
```

### Error Response

모든 4xx, 5xx 응답은 `{"error": ...}` 형태로 래핑됩니다.

```json
{
  "error": {
    "code": "E001",
    "message": "Error description"
  }
}
```

---

## Dependencies (Service Layer Interface)

`PathOptimizeService`는 다음 인터페이스들을 의존성 주입(DI)으로 받습니다:

1. **OdsayAPIClientInterface**: 대중교통 경로 조회
2. **ContextDetectorInterface**: GPS 기반 사용자 상태 감지
3. **GateValidatorInterface**: 대안 경로 3가지 Gate 검증
4. **SeatingOptimizerInterface**: 착석 최적화 가이드
5. **DelayDetectorInterface**: 지연 감지 엔진
6. **TaxiSuggesterInterface**: 택시 제안 엔진

모든 인터페이스는 `abc.ABC`를 상속받은 추상 클래스입니다.

---

## Testing

모든 public 메서드는 TDD(Test-Driven Development) 방식으로 개발되었습니다.

- **총 테스트**: 229개
- **통과율**: 100% (229/229 PASSED)
- **커버리지**: Logic 1.1 ~ 4.3 전체

테스트 실행:

```bash
pytest app/modules/path_optimize/tests/ -v
```

---

## References

- **OpenAPI Spec**: `docs/openapi/v1.yaml`
- **Logic Guide**: `docs/path_optimize/LOGIC_GUIDE.md`
- **AGENTS.md**: 상호 규약 (Module Communication)
- **v3.0 명세서**: DailyMotion 프로젝트 요구사항

---

**Author**: DailyMotion Backend Team
**Contact**: backend@dailymotion.com
**License**: Proprietary
