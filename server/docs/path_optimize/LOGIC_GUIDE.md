# Path Optimize Logic Guide

> **Version**: v3.0
> **Module**: `app.modules.path_optimize`
> **Purpose**: 경로 최적화 로직 상세 설명서
> **Last Updated**: 2025-01-15

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Logic 1.1: 능동적 출발 알림](#logic-11-능동적-출발-알림)
3. [Logic 1.2: 마지노선 경고](#logic-12-마지노선-경고)
4. [Logic 2.1: Context Awareness](#logic-21-context-awareness)
5. [Logic 2.2: 고신뢰 대안 경로](#logic-22-고신뢰-대안-경로)
6. [Logic 2.3: 탑승/환승 최적화](#logic-23-탑승환승-최적화)
7. [Logic 3.1: 지연 감지](#logic-31-지연-감지)
8. [Logic 3.2: 택시 제안](#logic-32-택시-제안)
9. [Logic 4.1-4.2: 퇴근 목표 선택](#logic-41-42-퇴근-목표-선택)
10. [Logic 4.3: 스마트 폴링](#logic-43-스마트-폴링)

---

## Overview

DailyMotion의 경로 최적화 모듈은 **9가지 핵심 Logic**으로 구성되어 있습니다. 각 Logic은 사용자의 출퇴근 경험을 최적화하기 위한 특정 문제를 해결합니다.

### Logic 분류

**출근 모드 (COMMUTE)**
- Logic 1.1: 능동적 출발 알림
- Logic 1.2: 마지노선 경고
- Logic 3.2: 택시 제안 (최후의 수단)

**퇴근 모드 (RETREAT)**
- Logic 1.2: 막차 알림
- Logic 4.1-4.2: 퇴근 목표 선택 (A/B/C)

**공통 (COMMUTE & RETREAT)**
- Logic 2.1: Context Awareness (자동 모드 전환)
- Logic 2.2: 고신뢰 대안 경로 (3가지 Gate 검증)
- Logic 2.3: 탑승/환승 최적화
- Logic 3.1: 지연 감지
- Logic 4.3: 스마트 폴링 빈도 최적화

### Frontend 계약 검증 현황 (테스트 기준: `test_e2e_commute_flow.py`)

- Logic 1.1 / 1.2: 부분 검증 (alertType/필드 스키마 E2E 확인, 시간 경계/메시지 포맷/실제 DOOR-TO-DOOR 로직 미검증)
- Logic 2.1: 부분 검증 (응답 스키마 E2E 확인, 상태 전환/거리·속도 경계 미검증)
- Logic 2.2: 부분 검증 (COMMUTE/RETREAT 스키마 E2E 확인, Gate별 임계/실제 계산·사유 구조 미검증)
- Logic 2.3: 부분 검증 (응답 스키마 E2E 확인, 혼잡도·환승 동작/ETA 임계 미검증)
- Logic 3.1: 부분 검증 (응답 스키마 E2E 확인, 5분 임계/다구간 지연 계산·실시간 부재 처리가 실제 로직과 일치하는지 미검증)
- Logic 3.2: 부분 검증 (COMMUTE/RETREAT 스키마 E2E 확인, 지각 판단·요금/ETA 계산 로직 미검증)
- Logic 4.x: 미검증 (퇴근 목표/스마트 폴링 테스트 없음)

---

## Logic 1.1: 능동적 출발 알림

### 목표

사용자가 **정시에 도착**할 수 있도록 **지금 출발하라**고 능동적으로 알림

### 핵심 원리

출근 모드에서 목표 도착 시간까지 **여유 시간이 충분할 때** (15분 이상) `GO_NOW` 알림을 발송합니다.

### 작동 방식

#### 1. Door-to-Door 계산

```
총 소요 시간 = First Mile + Transit Time + Last Mile
```

- **First Mile**: 집 문 앞 → 버스/지하철 탑승지 (기본 5분)
- **Transit Time**: 대중교통 이동 시간 (ODSAY API)
- **Last Mile**: 하차 지점 → 회사 문 앞 (기본 7분)

#### 2. 알림 기준

```python
minutes_until_arrival = (target_arrival_time - current_time).total_seconds() / 60
first_mile = commute_settings.get("firstMileDefaultDuration", 5)

if minutes_until_arrival >= first_mile + 10:
    return "GO_NOW"  # 여유 있음 (15분 이상)
```

#### 3. 메시지 포맷

```
"8:50 도착을 위해, 지금 집에서 출발하셔서 5분 뒤 오는 [123번 버스]를 타세요."
```

### 예시 시나리오

**상황:**
- 목표 도착 시간: 08:50:00
- 현재 시간: 08:30:00
- First Mile: 5분
- Transit Time: 20분
- Last Mile: 7분

**계산:**
```
minutes_until_arrival = 20분
first_mile + 10 = 15분
20 >= 15 → GO_NOW
```

**결과:**
```json
{
  "data": {
    "alertType": "GO_NOW",
    "message": "8:50 도착을 위해, 지금 집에서 출발하셔서...",
    "recommendedTransport": {
      "type": "BUS",
      "name": "123번",
      "departureInMinutes": 5
    }
  }
}
```

---

## Logic 1.2: 마지노선 경고

### 목표

**마지막 기회**를 놓치지 않도록 긴박한 알림 제공

### 핵심 원리

목표 도착 시간까지 **여유가 없을 때** (0~15분) `LAST_CHANCE` 경고를 발송합니다.

### 작동 방식

#### 1. 알림 기준

```python
if 0 <= minutes_until_arrival < first_mile + 10:
    return "LAST_CHANCE"  # 긴박함 (0~15분)
elif minutes_until_arrival < 0:
    return "NO_ACTION"  # 이미 늦음
```

#### 2. 메시지 포맷

```
"⚠️지각 주의! 8:50 도착을 위한 마지막 버스[456번]가 8분 뒤 도착합니다."
```

### 퇴근 모드 - 막차 알림

퇴근 모드에서는 **사용자가 선택한 경로의 막차**를 알립니다.

#### 작동 방식

1. 사용자가 선택한 경로 (A/B/C) 확인
2. 해당 경로의 막차 시간 조회
3. 막차까지 남은 시간 계산
4. 30분 이내면 알림 발송

#### 예시

**상황:**
- 선택한 경로: B (편안하게 착석)
- 막차 시간: 23:30
- 현재 시간: 23:00

**결과:**
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

---

## Logic 2.1: Context Awareness

### 목표

GPS 기반으로 사용자 상태를 자동 감지하여 **화면을 자동 전환**

### 핵심 원리

사용자의 GPS 위치와 이동 속도를 분석하여 상태를 감지합니다:
- **WAITING**: 집/회사 근처에서 정지 (이동 없음)
- **WALKING**: 도보 이동 중 (First Mile 진행 중)
- **ON_TRIP**: 탑승 중 (버스/지하철 이용 중)

### 작동 방식

#### 1. 상태 감지 알고리즘

```python
# 1. 거리 계산
distance_from_home = haversine(current_gps, home_location)
distance_from_work = haversine(current_gps, work_location)

# 2. 속도 분석
if user_speed < 0.5:  # m/s
    state = "WAITING"
elif 0.5 <= user_speed < 2.0:
    state = "WALKING"
else:  # user_speed >= 2.0
    state = "ON_TRIP"  # 버스/지하철 속도

# 3. 위치 검증
if distance_from_home < 100:  # 100m 이내
    state = "WAITING"  # 집 근처
elif distance_from_work < 100:
    state = "WAITING"  # 회사 근처
```

#### 2. 화면 전환 트리거

**탑승 감지 시 (ON_TRIP):**
```json
{
  "data": {
    "action": "AUTO_SWITCH_TO_ETA",
    "screenSwitchNeeded": true,
    "switchMessage": "탑승 감지! 직장 도착까지 약 15분 남았습니다.",
    "destinationArrivalTime": "08:45:00",
    "estimatedMinutes": 15
  }
}
```

### 예시 시나리오

**상황:**
- 현재 위치: (37.5000, 127.0300)
- 집 위치: (37.4979, 127.0276)
- 회사 위치: (37.5665, 126.9780)
- 이동 속도: 5.0 m/s (버스/지하철 속도)

**결과:**
- 상태: `ON_TRIP` (탑승 중)
- 액션: `AUTO_SWITCH_TO_ETA` (ETA 화면으로 자동 전환)
- 메시지: "탑승 감지! 직장 도착까지 약 15분 남았습니다."

---

## Logic 2.2: 고신뢰 대안 경로

### 목표

**명확한 이득이 있는 대안 경로만** 제안하여 사용자의 신뢰를 확보

### 핵심 원리: 3가지 Gate 검증

대안 경로는 **모든 Gate를 통과해야만** 제안됩니다. **하나라도 실패하면 STRICTLY FORBIDDEN** (절대 제안 금지)

---

### Gate 1: Clear Benefit (명확한 이득)

**목표**: 대안 경로가 **충분히 빠른지** 검증

#### 기준

**출근 모드 (COMMUTE):**
- 7분 이상 절약

**퇴근 모드 (RETREAT):**
- 10분 이상 절약

#### 검증 로직

```python
time_saved = current_route_time - alternative_route_time

if mode == SystemMode.COMMUTE:
    threshold = 7  # 출근: 7분
elif mode == SystemMode.RETREAT:
    threshold = 10  # 퇴근: 10분

if time_saved >= threshold:
    gate1 = "PASS"
else:
    gate1 = "FAIL"
    return {
        "shouldSuggest": False,
        "reason": f"Gate 1 failed: Insufficient time benefit ({time_saved} min < {threshold} min)"
    }
```

#### 예시

**실패 케이스:**
- 현재 경로: 30분
- 대안 경로: 27분
- 절약 시간: 3분
- 임계값: 7분 (출근 모드)
- **결과**: Gate 1 FAIL → 제안 안 함

**통과 케이스:**
- 현재 경로: 35분
- 대안 경로: 25분
- 절약 시간: 10분
- 임계값: 7분 (출근 모드)
- **결과**: Gate 1 PASS → 다음 Gate 검증

---

### Gate 2: Transfer Certainty (환승 확실성)

**목표**: 대안 경로의 **환승이 확실한지** 검증

#### 기준

환승 여유 시간 ≥ 3분

#### 검증 로직

```python
transfer_buffer = alternative_bus_arrival_minutes - current_bus_arrival_minutes

if transfer_buffer >= 3:
    gate2 = "PASS"
else:
    gate2 = "FAIL"
    return {
        "shouldSuggest": False,
        "reason": f"Gate 2 failed: Insufficient transfer buffer ({transfer_buffer} min < 3 min)"
    }
```

#### 예시

**실패 케이스:**
- 현재 버스 도착: 10분 후
- 대안 버스 도착: 12분 후
- 환승 여유: 2분
- 임계값: 3분
- **결과**: Gate 2 FAIL → 제안 안 함

**통과 케이스:**
- 현재 버스 도착: 10분 후
- 대안 버스 도착: 5분 후
- 환승 여유: 5분
- 임계값: 3분
- **결과**: Gate 2 PASS → 다음 Gate 검증

---

### Gate 3: Experience Quality (경험 품질)

**목표**: 대안 경로의 **탑승 경험이 양호한지** 검증

#### 기준

혼잡도 < 80% (착석 가능)

#### 검증 로직

```python
if alternative_congestion_rate < 80:
    gate3 = "PASS"
else:
    gate3 = "FAIL"
    return {
        "shouldSuggest": False,
        "reason": f"Gate 3 failed: High congestion ({alternative_congestion_rate}% >= 80%)"
    }
```

#### 예시

**실패 케이스:**
- 대안 경로 혼잡도: 85%
- 임계값: 80%
- **결과**: Gate 3 FAIL → 제안 안 함

**통과 케이스:**
- 대안 경로 혼잡도: 60%
- 임계값: 80%
- **결과**: Gate 3 PASS → **모든 Gate 통과, 제안!**

---

### 종합 예시

**시나리오: 모든 Gate 통과**

```
현재 경로: 35분 소요
대안 경로: 25분 소요
모드: COMMUTE

Gate 1: 10분 절약 >= 7분 → PASS
Gate 2: 환승 여유 5분 >= 3분 → PASS
Gate 3: 혼잡도 60% < 80% → PASS

→ 제안!
```

**결과:**
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

**시나리오: Gate 1 실패**

```
현재 경로: 30분 소요
대안 경로: 27분 소요
모드: COMMUTE

Gate 1: 3분 절약 < 7분 → FAIL

→ 제안 안 함 (Gate 2, 3 검증 생략)
```

**결과:**
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

---

## Logic 2.3: 탑승/환승 최적화

### 목표

**착석 확률을 높이고** 환승 시 **이동 거리를 최소화**하는 탑승 가이드 제공

### 핵심 원리

1. **착석 최적화**: 다음 역 하차객이 많은 칸 추천
2. **환승 최적화**: 환승 통로와 가까운 칸 추천

### 작동 방식

#### 1. 착석 우선 모드

```python
if user_preferences.get("seatingPriority") == True:
    # 착석 확률이 가장 높은 칸 추천
    recommended_car = analyze_next_station_exits(route_info)
    reason = "다음 역 하차객이 많아 착석 확률이 높습니다."
```

#### 2. 환승 우선 모드

```python
else:
    # 환승 통로와 가까운 칸 추천
    recommended_car = find_transfer_optimal_car(route_info)
    reason = "환승 시 이동 거리가 짧습니다."
```

### 예시 시나리오

**상황:**
- 노선: 지하철 2호선 (강남역 → 을지로입구역)
- 사용자 선호: 착석 우선
- 다음 역 (을지로입구역) 하차 통계: 3번 칸 많음

**결과:**
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

## Logic 3.1: 지연 감지

### 목표

**돌발 상황으로 인한 지연**을 조기에 감지하여 대안 제시

### 핵심 원리

1. **실시간 GPS 추적**: 예상 경로와 실제 경로 비교
2. **지연 임계값**: 5분 이상 지연 시 알림
3. **대안 경로 자동 탐색**: 지연 감지 즉시 대안 제시

### 작동 방식

#### 1. 지연 감지

```python
expected_time = calculate_expected_arrival(route_id, current_location)
actual_time = datetime.now()
delay_minutes = (expected_time - actual_time).total_seconds() / 60

if delay_minutes >= 5:
    trigger_delay_alert()
```

#### 2. 대안 경로 탐색

지연 감지 시 즉시 대안 경로를 탐색하여 제시합니다.

### 예시 시나리오

**상황:**
- 예상 도착 시간: 08:45
- 실제 현재 시간: 08:30
- 현재 위치 기반 도착 예상: 09:00
- 지연: 15분

**결과:**
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
        "description": "지하철 2호선 이용",
        "timeSaved": 5
      }
    ]
  }
}
```

---

## Logic 3.2: 택시 제안

### 목표

대중교통으로 **지각이 확정된 경우** 택시를 최후의 수단으로 제안

### 핵심 원리

1. **출근 모드 전용**: 퇴근 모드에서는 택시 제안 안 함
2. **지각 확정 조건**: 대중교통 도착 시간 > 목표 도착 시간
3. **비용/시간 제시**: 예상 비용과 소요 시간 함께 제공

### 작동 방식

#### 1. 지각 여부 판단

```python
if mode != SystemMode.COMMUTE:
    return {"taxiRequired": False}  # 퇴근 모드는 택시 제안 안 함

lateness_minutes = (transit_arrival_time - target_arrival_time).total_seconds() / 60

if lateness_minutes > 0:
    # 지각 확정 → 택시 제안
    return suggest_taxi()
```

#### 2. 택시 정보 계산

```python
taxi_time = calculate_taxi_time(current_location, destination)
taxi_cost = estimate_taxi_cost(distance)

if current_time + taxi_time <= target_arrival_time:
    return {
        "taxiRequired": True,
        "reason": f"대중교통으로는 {lateness_minutes}분 지각 예상",
        "estimatedCost": taxi_cost,
        "estimatedTime": taxi_time,
        "message": "지금 택시를 타면 정시 도착 가능합니다."
    }
```

### 예시 시나리오

**상황:**
- 목표 도착 시간: 09:00
- 대중교통 도착 시간: 09:10 (10분 늦음)
- 현재 시간: 08:55
- 택시 소요 시간: 20분
- 택시 예상 비용: 15,000원

**결과:**
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

**퇴근 모드 - 택시 제안 안 함:**
```json
{
  "data": {
    "taxiRequired": false,
    "message": "대중교통으로 충분히 도착 가능합니다."
  }
}
```

---

## Logic 4.1-4.2: 퇴근 목표 선택

### 목표

사용자가 퇴근 목표를 선택하여 **개인화된 경로 추천**

### 핵심 원리

3가지 퇴근 목표 중 하나를 선택:
- **A (FASTEST)**: 가장 빠르게
- **B (COMFORTABLE)**: 편안하게 (착석)
- **C (USUAL)**: 평소 경로

### 작동 방식

#### 1. 퇴근 목표 선택 화면

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

#### 2. 선택 저장

사용자 선택을 저장하여 이후 경로 추천에 활용합니다.

```python
save_retreat_mode_choice(
    user_id="user_001",
    choice="B",  # 편안하게 (착석)
    timestamp=datetime.now()
)
```

#### 3. 목표별 경로 조회

선택한 목표에 맞는 경로를 제공합니다.

**A (가장 빠르게):**
- 최단 시간 경로
- 환승 많아도 상관없음

**B (편안하게):**
- 착석 확률 높은 경로
- 환승 최소화
- 시간보다 편안함 우선

**C (평소 경로):**
- 사용자가 자주 이용하는 경로
- AI 학습 데이터 기반

---

## Logic 4.3: 스마트 폴링

### 목표

상황에 따라 **폴링 빈도를 동적으로 조절**하여 배터리 절약 + 실시간성 확보

### 핵심 원리

사용자 상태에 따라 폴링 빈도를 3단계로 조절:
- **HIGH**: 10초 (환승 지점 근처, 알림 5분 전)
- **MEDIUM**: 30초 (도보 이동 중, 알림 10분 전)
- **LOW**: 300초 (정지 상태, 알림 60분 이상 남음)

### 작동 방식

#### 1. 빈도 결정 알고리즘

```python
def determine_frequency():
    # HIGH: 환승 지점 300m 이내
    if distance_to_transfer < 300:
        return "HIGH", 10

    # HIGH: 알림 5분 전
    if minutes_until_alert <= 5:
        return "HIGH", 10

    # HIGH: 혼잡 지역 내
    if in_congestion_zone:
        return "HIGH", 10

    # MEDIUM: 도보 이동 중
    if transit_mode == "WALKING":
        return "MEDIUM", 30

    # MEDIUM: 알림 10분 전
    if minutes_until_alert <= 10:
        return "MEDIUM", 30

    # LOW: 정지 상태
    if user_speed < 0.5:
        return "LOW", 300

    # LOW: 알림 60분 이상 남음
    if minutes_until_alert > 60:
        return "LOW", 300

    # 기본값
    return "MEDIUM", 30
```

#### 2. 폴링 여부 판단

```python
def should_poll(last_poll_time, current_frequency):
    elapsed_seconds = (datetime.now() - last_poll_time).total_seconds()

    if current_frequency == "HIGH" and elapsed_seconds >= 10:
        return True
    elif current_frequency == "MEDIUM" and elapsed_seconds >= 30:
        return True
    elif current_frequency == "LOW" and elapsed_seconds >= 300:
        return True

    return False
```

### 예시 시나리오

**시나리오 1: 집에서 대기 중**
- 위치: 집
- 속도: 0 m/s (정지)
- 알림까지: 60분
- **결과**: LOW frequency (300초 = 5분마다 폴링)

**시나리오 2: 버스 정류장으로 걷는 중**
- 위치: 집에서 200m
- 속도: 1.2 m/s (도보)
- 알림까지: 10분
- **결과**: MEDIUM frequency (30초마다 폴링)

**시나리오 3: 환승 지점 근처**
- 위치: 환승역에서 200m
- 속도: 5.0 m/s (지하철)
- 알림까지: 5분
- **결과**: HIGH frequency (10초마다 폴링)

### 배터리 절약 효과

**기존 (고정 30초):**
- 60분 동안 폴링: 120회
- 배터리 소모: 100%

**스마트 폴링:**
- 정지 상태 (50분, LOW): 10회
- 도보 (5분, MEDIUM): 10회
- 환승 근처 (5분, HIGH): 30회
- **총 폴링: 50회 (58% 절약)**

---

## Summary

### Logic별 핵심 포인트

| Logic | 핵심 원리 | 성공 기준 |
|-------|----------|----------|
| 1.1 | Door-to-Door 계산 | 여유 15분 이상 → GO_NOW |
| 1.2 | 마지노선 경고 | 여유 0~15분 → LAST_CHANCE |
| 2.1 | GPS 기반 상태 감지 | 탑승 감지 → 화면 전환 |
| 2.2 | 3가지 Gate 검증 | 모든 Gate 통과 → 제안 |
| 2.3 | 착석/환승 최적화 | 최적 칸 추천 |
| 3.1 | 지연 조기 감지 | 5분 이상 지연 → 대안 제시 |
| 3.2 | 택시 최후 수단 | 지각 확정 → 택시 제안 (출근 전용) |
| 4.1-4.2 | 퇴근 목표 선택 | A/B/C 선택 → 맞춤 경로 |
| 4.3 | 적응형 폴링 | 상황별 빈도 조절 (10/30/300초) |

### 설계 철학

1. **사용자 신뢰 우선**: 불확실한 제안보다 신뢰할 수 있는 정보
2. **명확한 이득**: 대안은 명확한 이득이 있을 때만 제안
3. **배터리 효율**: 스마트 폴링으로 배터리 절약
4. **개인화**: 사용자 선호와 패턴 학습

---

**Author**: DailyMotion Backend Team
**Contact**: backend@dailymotion.com
**License**: Proprietary
