# DailyMotion 핵심 로직 & 알고리즘 가이드

> **목적**: 심사위원에게 DailyMotion의 핵심 로직과 알고리즘을 설명할 수 있도록 작성된 기술 문서입니다.  
> **작성일**: 2025-11-21  
> **버전**: v3.0  
> **대상**: 백엔드 개발자, 심사위원

---

## 0. Executive Summary (심사위원용 한눈에 요약)

### 0.1 DailyMotion 한 줄 정의

- **DailyMotion**은 **“출근/퇴근 경로를 AI처럼 최적화해주는 모빌리티 비서”**입니다.  
- 단순 지도 앱이 아니라, **Door-to-Door 전체 여정을 실시간 데이터와 통계 데이터로 최적화**하는 것이 핵심입니다.

### 0.2 핵심 차별점 3가지

1. **Door-to-Door 경로 최적화**  
   - 집 문을 나선 순간부터 회사 문을 들어갈 때까지의  
     **도보(First/Last Mile) + 차량 대기 + 탑승/환승 전체 시간**을 모두 합산해서 계산합니다.

2. **3중 Gate 검증 (Logic 2.2)**  
   - 대안 경로는 무조건 추천하지 않습니다.  
   - **시간 이득 + 환승 확실성 + 혼잡도(탑승 경험)**라는 3개의 Gate를 **모두 통과한 경로만** 사용자에게 보여줍니다.

3. **실시간 + 통계 + 외부 API 결합 (Multi-Source Fallback)**  
   - 서울시 실시간 API, 통계 DB, ODSAY, 기본값까지  
     **최대 4단계 Fallback 구조**로 설계해,  
     **외부 API 장애가 나도 서비스가 무너지지 않도록** 만들었습니다.

> 이 문서는 위 세 가지 차별점을 **기술적으로 증명하는 문서**입니다.  
> (각 Logic과 알고리즘, Fallback 전략, 테스트 전략까지 포함)

### 0.3 발표에서 강조할 핵심 메시지 5줄

발표/질의응답에서 그대로 써도 되는 문장들입니다.

1. **“우리는 출발 시점만 보는 것이 아니라, 집 문을 나선 순간부터 회사 문을 들어갈 때까지의 Door-to-Door 전체 구간을 계산합니다.”**  
2. **“대안 경로는 무조건 추천하지 않습니다. 3개의 Gate를 모두 통과해야만 사용자에게 보여줍니다.”**  
3. **“외부 API가 죽어도, 통계 데이터와 ODSAY, 그리고 기본값으로 Fallback하여 서비스가 무너지지 않게 설계했습니다.”**  
4. **“환승역 근처에 500m 이내로 진입하면, GPS 기반으로 자동으로 환승 알림과 실시간 환승 열차 ETA를 제공합니다.”**  
5. **“폴링 주기를 고정값이 아니라 상황에 따라 10초/30초/5분으로 바꾸어, 배터리와 API 비용을 함께 줄였습니다.”**

---

## 목차 구성

0. [Executive Summary (심사위원용 한눈에 요약)](#0-executive-summary-심사위원용-한눈에-요약)  
1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)  
2. [핵심 알고리즘 설계 원칙](#2-핵심-알고리즘-설계-원칙)  
3. [Logic 1.1: 출발 알림 로직 알고리즘](#3-logic-11-출발-알림-로직-알고리즘)  
4. [Logic 1.2: 마지노선 경고 알고리즘](#4-logic-12-마지노선-경고-알고리즘)  
5. [Logic 2.1: Context Awareness (상황 인지)](#5-logic-21-context-awareness-상황-인지)  
   - [Logic 2.4: 환승 리마인더 & 실시간 환승 열차 안내](#55-logic-24-환승-리마인더--실시간-환승-열차-안내)  
6. [Logic 2.2: 3중 Gate 검증 알고리즘](#6-logic-22-3중-gate-검증-알고리즘)  
7. [Logic 3.1: 지연 감지 알고리즘](#7-logic-31-지연-감지-알고리즘)  
8. [실시간 데이터 통합 전략](#8-실시간-데이터-통합-전략)  
9. [성능 최적화 및 Fallback 전략](#9-성능-최적화-및-fallback-전략)  
10. [테스트 및 검증 전략](#10-테스트-및-검증-전략)  

> 💡 **전체 구현 코드**는 `server/app/modules/path_optimize/service.py` 및 관련 service 파일들에 있으며,  
> 이 문서는 그 중 **핵심 알고리즘 부분만 대표 예시로 발췌**했습니다.  

---

## 1. 시스템 아키텍처 개요

### 1.1 전체 구조

```text
┌──────────────────────────────────────────────────────────┐
│          사용자 (모바일 앱 - React Native)              │
│     GPS + 실시간 위치 전송 | REST API 호출              │
└────────────────────┬─────────────────────────────────────┘
                     │ OpenAPI 3.0 스펙 기반
                     ↓
┌────────────────────┴─────────────────────────────────────┐
│              FastAPI Backend (Python)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PathOptimizeService (핵심 로직 계층)           │  │
│  │  - 2,800+ lines (실제 2,851 lines)            │  │
│  │  - 20개 이상 public methods                     │  │
│  │  - Logic 1.1 ~ 4.3 전체 구현                    │  │
│  └──────────────────────────────────────────────────┘  │
│                     │                                    │
│  ┌──────────────────┼────────────────────────────────┐  │
│  │  외부 API 통합   │  데이터베이스 (PostgreSQL)     │  │
│  │  - ODSAY         │  - 평균 소요시간 테이블 (통계)  │  │
│  │  - 서울시 실시간  │  - 사용자 설정                 │  │
│  │  - NHN Cloud     │  - 여정 기록                   │  │
│  └──────────────────┴────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 1.2 모듈형 모놀리식 아키텍처

- **물리적**으로는 하나의 FastAPI 서버(모놀리식)
- **논리적**으로는 `path_optimize`, `risk_manage`, `ai_pattern` 등 모듈로 분리 (가상 MSA)
- 향후 MSA 전환 시, **모듈 단위로 독립 서비스 분리**가 가능하도록 설계

---

## 2. 핵심 알고리즘 설계 원칙

### 2.1 Design Principles

1. **User-Centric Design**
   - “얼마나 예쁘게 최적화했냐”가 아니라, **사용자가 실제로 몇 분을 아끼는가**에 집중
   - 혼잡도, 환승 리스크, 막차 여부 등 **사용자 경험** 요소를 로직에 포함
   - 외부 API 장애에도 끊기지 않는 **강력한 Fallback** 설계

2. **Data-Driven Decision**
   - **실시간 + 통계 + 외부 API**를 결합
     - 1순위: 실시간 (서울시/버스/지하철)
     - 2순위: 통계 (시간대/요일별 평균 소요시간 DB)
     - 3순위: ODSAY 기본 정보
   - 통계 데이터 사용 시, **샘플 수 기반 신뢰도 검증** 수행

3. **Performance First**
   - 적응형 폴링(폴링 빈도 10초/30초/5분)으로 배터리 및 API 비용 절감
   - 여러 구간 ETA를 **비동기/병렬 요청**으로 조회
   - 모든 외부 API에 **타임아웃 + 예외 처리 + 캐싱** 적용

### 2.2 핵심 상수 정의 (예시)

```python
# Logic 1.1 & 1.2: 출발/경고 알림
COMFORTABLE_BUFFER_MINUTES = 10  # 여유 시간 기본값
DEFAULT_FIRST_MILE_DURATION = 5  # First Mile 도보 시간
DEFAULT_LAST_MILE_DURATION = 7   # Last Mile 도보 시간

# Logic 2.2: 3중 Gate 검증
MIN_TRANSFER_TIME_MINUTES = 3         # Gate 2: 환승 최소 여유
MAX_CONGESTION_THRESHOLD = 0.80       # Gate 3: 혼잡도 임계값
TIME_BENEFIT_THRESHOLD_COMMUTE = 7    # Gate 1: 출근 시간 절약 최소값
SEATING_POSSIBILITY_THRESHOLD = 0.5   # Gate 1: 퇴근 모드 착석 확률 기준
```

> **Magic Number 금지 원칙**  
> 모든 임계값은 상수로 관리하며, 추후 실험/운영 데이터에 따라 쉽게 조정 가능하게 설계했습니다.

---

## 3. Logic 1.1: 출발 알림 로직 알고리즘

### 3.1 개요

- 사용자의 **목표 도착 시간(예: 09:00)** 을 기준으로,  
  지금 집에서 출발해야 하는지 여부를 판단합니다.
- 판단 기준은 **Door-to-Door 전체 시간**입니다.

### 3.2 알고리즘 흐름 (요약)

1. **경로 검색**: ODSAY로 후보 경로(여러 개) 조회  
2. **Door-to-Door 계산**  
   - First Mile 도보  
   - 차량 대기 시간 (실시간/통계/Fallback)  
   - 지하철/버스 탑승 및 환승 시간  
   - Last Mile 도보  
3. **Slack(여유 시간) 계산**  
   - `슬랙 = 목표 도착 시각 - 예상 도착 시각`  
4. **슬랙 기준으로 3단계 판정**
   - `slack < 0` → 이미 늦음 → `NO_ACTION`  
   - `slack ≥ 10분` → `GO_NOW`  
   - `0 ≤ slack < 10분` → `LAST_CHANCE`

### 3.3 핵심 코드 조각 (슬랙 계산 & 판정)

> 전체 구현은 `PathOptimizeService.get_commute_briefing()`에 있습니다.  
> 여기서는 **핵심 알고리즘 부분만 발췌**했습니다.

```python
# (중략) 입력 검증 / 목표 시간(datetime) 변환 / 추천 교통수단 추출

# Door-to-Door = First Mile + 차량 대기 + Transit + Last Mile
expected_arrival = current_time + timedelta(
    minutes=first_mile_duration
    + wait_until_vehicle_minutes
    + effective_transit_time
    + last_mile_duration
)

# 슬랙(여유 시간) 분 단위 계산
slack_minutes = int((target_arrival - expected_arrival).total_seconds() / 60)

# 판정 규칙
if slack_minutes < 0:
    alert_type = "NO_ACTION"       # 이미 지각 확정
elif slack_minutes >= COMFORTABLE_BUFFER_MINUTES:
    alert_type = "GO_NOW"          # 여유 있게 출발 가능
else:  # 0 <= slack_minutes < COMFORTABLE_BUFFER_MINUTES
    alert_type = "LAST_CHANCE"     # 마지노선 경고
```


---

## 4. Logic 1.2: 마지노선 경고 알고리즘

### 4.1 출근 모드: 막판 교통편 알림

- Logic 1.1의 Door-to-Door 계산 결과,  
  **슬랙이 0 이상 10분 미만**일 때 `LAST_CHANCE` 알림 발송
- 교통수단 타입에 따라 메시지를 다르게 구성합니다.

```text
조건: 0 <= slack < COMFORTABLE_BUFFER_MINUTES (10분)

- SUBWAY → "마지막 지하철[7호선]"
- BUS    → "마지막 버스[146번]"
- 기타   → "마지막 교통수단"
```

출력 예시:

```json
{
  "alertType": "LAST_CHANCE",
  "message": "⚠️지각 주의! 08:50 도착을 위한 마지막 지하철[7호선]이 곧 출발합니다.",
  "recommendedTransport": { ... }
}
```

### 4.2 퇴근 모드: 막차 알림 (개요)

- 사용자가 선택한 퇴근 경로(A/B/C)에 대해 **막차까지 남은 시간**을 계산
- `≤ 30분` 이내면 막차 경고 발송, 아니면 `NO_ACTION`

> 전체 구현은 `PathOptimizeService.get_retreat_mode_last_bus_alert()` 및  
> `LastBusScheduleRepository`에 있습니다.

---

## 5. Logic 2.1: Context Awareness (상황 인지)

### 5.1 개요

- **GPS 위치 + 속도**를 기반으로 사용자의 현재 상태를 자동으로 인식합니다.
- 예:
  - 집/회사 근처 & 거의 정지 → `WAITING`
  - 천천히 이동 중 → `WALKING`
  - 일정 속도 이상으로 이동 → `ON_TRIP`(탑승 중) → ETA 화면으로 자동 전환

### 5.2 상태 분류 기준

```text
WAITING:
  - 집/회사 100m 이내
  - 또는 속도 < 0.5 m/s

WALKING:
  - 집/회사에서 100m 이상 떨어짐
  - 속도 0.5 ~ 2.0 m/s

ON_TRIP:
  - 속도 ≥ 2.0 m/s
  - 이 때 ETA 모드로 자동 전환
```

### 5.3 Haversine 거리 계산 (대표 코드)

```python
import math

def calculate_haversine_distance(point1, point2) -> float:
    """
    두 좌표 간 직선 거리 계산 (Haversine 공식)
    Returns: 거리 (미터)
    """
    R = 6371000  # 지구 반지름 (m)

    lat1 = math.radians(point1["latitude"])
    lat2 = math.radians(point2["latitude"])
    delta_lat = math.radians(point2["latitude"] - point1["latitude"])
    delta_lon = math.radians(point2["longitude"] - point1["longitude"])

    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1) * math.cos(lat2) *
         math.sin(delta_lon / 2) ** 2)

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c
```

> 실제 Context Awareness 로직은  
> `속도 추정 → 상태 분류 → ON_TRIP 시 ETA 계산 및 모드 전환`까지 포함합니다.

---

## 5.5 Logic 2.4: 환승 리마인더 & 실시간 환승 열차 안내

### 개요

- 사용자가 **환승역 근처(예: 500m 이내)** 에 진입하면:
  1. “곧 환승해야 합니다” 알림 발송
  2. 환승 대상 열차의 **실시간 도착 정보**(예: 3분 후 도착)를 함께 제공

### 핵심 아이디어

1. 현재 GPS와 환승 지점 리스트 간의 **최단 거리 환승역** 찾기  
2. 반경 이내면 실시간 도착 정보 조회 (지하철/버스)  
3. 사용자에게 **역 이름, 노선, 도착까지 남은 시간**을 포함해 안내

> 구현은 `PathOptimizeService.get_transfer_reminder()` 및  
> `get_transfer_vehicle_realtime_info()`에 존재하며,  
> 이 문서에서는 흐름만 설명합니다.

---

## 6. Logic 2.2: 3중 Gate 검증 알고리즘

### 6.1 개요

> “빠른데, 갈아타기 위험하고, 지옥철이면 추천하지 않는다.”

- 대안 경로는 **3개의 Gate를 모두 통과할 때만** 추천:
  1. **시간 이득 (Clear Benefit)**
  2. **환승 확실성 (Transfer Certainty)**
  3. **탑승 경험 품질 (Experience Quality, 혼잡도)**

### 6.2 Gate 검증 프로세스

```text
Gate 1: Clear Benefit
  - 출근: 7분 이상 단축?
  - 퇴근: 10분 이상 단축 OR 착석 확률 ≥ 50% ?

Gate 2: Transfer Certainty
  - 환승 여유 시간 ≥ 3분 ?

Gate 3: Experience Quality
  - 혼잡도 < 80% ?

→ 3개 Gate 모두 PASS 시에만 shouldSuggest = true
→ 하나라도 FAIL이면 STRICTLY FORBIDDEN (추천 X)
```

### 6.3 대표 코드 조각

```python
def get_alternative_route_suggestion(...):
    # Gate 1: 명확한 시간 이득
    time_saved = current_route_time - alternative_route_time

    if mode == SystemMode.COMMUTE:
        if time_saved < TIME_BENEFIT_THRESHOLD_COMMUTE:  # 7분
            return {"shouldSuggest": False, "gateResults": {"gate1": "FAIL"}}

    elif mode == SystemMode.RETREAT:
        seating_probability = 0.7  # 예시 (실제는 DB/모델 기반)
        if time_saved < 10 and seating_probability < SEATING_POSSIBILITY_THRESHOLD:
            return {"shouldSuggest": False, "gateResults": {"gate1": "FAIL"}}

    # Gate 2: 환승 여유
    transfer_buffer = alternative_bus_arrival_minutes - current_bus_arrival_minutes
    if transfer_buffer < MIN_TRANSFER_TIME_MINUTES:  # 3분
        return {"shouldSuggest": False, "gateResults": {"gate1": "PASS", "gate2": "FAIL"}}

    # Gate 3: 혼잡도
    congestion_rate_normalized = alternative_congestion_rate / 100.0
    if congestion_rate_normalized >= MAX_CONGESTION_THRESHOLD:  # 80%
        return {"shouldSuggest": False, "gateResults": {"gate1": "PASS", "gate2": "PASS", "gate3": "FAIL"}}

    # 모든 Gate PASS
    return {"shouldSuggest": True, "gateResults": {"gate1": "PASS", "gate2": "PASS", "gate3": "PASS"}}
```

---

## 7. Logic 3.1: 지연 감지 알고리즘

### 7.1 개요

- 각 구간(예: “7호선 남구로→가산”)에 대해  
  **통계상 평균 소요 시간 vs 현재 실시간 소요 시간**을 비교해서  
  지연 여부를 판단합니다.

### 7.2 핵심 로직

1. `average_duration` 테이블에서  
   - `segment_id`, `hour`, `day_of_week` 기준 평균 소요시간 조회
2. 서울시 실시간 API로 실제 구간 소요시간 추정
3. `delay = realtime - average`가 임계값(예: 5분) 이상이면 `EXCEPTION_DETECTED`
4. 샘플 수가 부족한 통계는 **신뢰도 부족으로 제외**

### 7.3 대표 코드 조각

```python
def get_exception_alert(self, segments, current_hour, current_day_of_week):
    statistical_data_map = get_average_duration_map(
        hour=current_hour,
        day_of_week=current_day_of_week,
    )

    delayed_segments = []

    for segment in segments:
        stats = statistical_data_map.get(segment["segmentId"])
        if not stats:
            continue

        avg_duration = stats["avg_duration"]
        sample_count = stats["sample_count"]

        if sample_count < MIN_SAMPLE_COUNT_FOR_RELIABILITY:
            continue  # 샘플 부족

        realtime_duration = self._get_realtime_duration(
            segment["fromStation"],
            segment["toStation"],
        )
        if realtime_duration is None:
            continue

        delay = realtime_duration - avg_duration

        if delay >= DELAY_THRESHOLD_MINUTES:  # 예: 5분
            delayed_segments.append({
                "segmentId": segment["segmentId"],
                "delayMinutes": delay,
            })

    if delayed_segments:
        return {"action": "EXCEPTION_DETECTED", "delayedSegments": delayed_segments}
    else:
        return {"action": "NO_ACTION"}
```

---

## 8. 실시간 데이터 통합 전략

### 8.1 Multi-Source Fallback

```text
1순위: 실시간 API
  - 서울시 지하철/버스 실시간

2순위: 통계 데이터 (AverageDurationDB)
  - 시간대/요일별 평균 소요시간
  - sample_count ≥ 기준치

3순위: ODSAY 기본 정보
  - sectionTime, totalTime

4순위: 고정 기본값
  - 지하철/버스 5분 등
```

### 8.2 특수 처리 예시 – 지하철 barvlDt == 0

```python
if raw_seconds == 0:
    m = re.search(r"\[(\d+)\]\s*번째\s*전역", arvl_msg2)
    if m:
        # "[2]번째 전역" → 2 * 2분
        arrival_seconds = max(int(m.group(1)) * 120, 120)
    elif "전역" in arvl_msg2 and ("도착" in arvl_msg2 or "진입" in arvl_msg2):
        # "전역 진입/도착" → 약 2분으로 추정
        arrival_seconds = 120
    else:
        arrival_seconds = 0
```

### 8.3 버스 노선 ID 캐싱 (대표 코드)

```python
class SeoulBusRealtimeClient:
    def __init__(self):
        self._route_id_cache = {}

    def search_bus_route_id(self, bus_no: str) -> Optional[str]:
        if bus_no in self._route_id_cache:
            return self._route_id_cache[bus_no]

        # (중략) API 호출 및 파싱

        bus_route_id = parsed_bus_route_id_or_empty

        self._route_id_cache[bus_no] = bus_route_id or None
        return self._route_id_cache[bus_no]
```

---

## 9. 성능 최적화 및 Fallback 전략

### 9.1 적응형 폴링 (Logic 4.3)

```python
def get_smart_polling_frequency(...):
    if distance_to_transfer < 300 or minutes_until_alert <= 5 or in_congestion_zone:
        return {"frequency": "HIGH", "intervalSeconds": 10}

    if transit_mode == "WALKING":
        return {"frequency": "MEDIUM", "intervalSeconds": 30}

    if user_speed < 0.5:
        return {"frequency": "LOW", "intervalSeconds": 300}

    return {"frequency": "MEDIUM", "intervalSeconds": 30}
```

- **HIGH (10초)**: 환승역 300m 이내, 알림 5분 전, 혼잡 구역  
- **MEDIUM (30초)**: 일반 도보 이동  
- **LOW (5분)**: 사실상 정지 상태  

> 고정 30초 폴링 대비, 시뮬레이션 기준 **약 50~60% 수준으로 요청 수 감소**를 기대할 수 있습니다.

### 9.2 견고한 API 호출 래퍼

```python
def _safe_api_call(self, api_func, fallback_value, context: str):
    try:
        result = api_func()
        return result if result is not None else fallback_value
    except requests.Timeout:
        logger.error(f"{context}: timeout, using fallback")
        return fallback_value
    except requests.RequestException as e:
        logger.error(f"{context}: API error {e}, using fallback")
        return fallback_value
    except Exception as e:
        logger.critical(f"{context}: unexpected error {e}", exc_info=True)
        return fallback_value
```

---

## 10. 테스트 및 검증 전략

### 10.1 TDD 기반 개발 프로세스

1. **실패하는 테스트**부터 작성  
2. **최소 구현**으로 테스트 통과  
3. **리팩토링**  
4. 새로운 케이스 추가 → 반복  

### 10.2 테스트 커버리지 개요

> 아래 수치는 현재 개발/시뮬레이션 환경 기준으로 산출한 예시입니다.  
> 실제 운영 환경에서는 추가적인 통합 테스트가 포함됩니다.

- Logic 1.1 (출발 알림)  
- Logic 1.2 (막차/마지노선 경고)  
- Logic 2.1 (Context Awareness)  
- Logic 2.2 (3중 Gate)  
- Logic 3.1 (지연 감지)  
- Logic 3.2 (택시 제안) 등  
→ 각 Logic에 대해 **정상/경계/에러 케이스**를 포함한 단위 테스트/통합 테스트 구성

### 10.3 대표 테스트 예시

```python
def test_gate_1_pass_commute_mode():
    result = service.get_alternative_route_suggestion(
        current_route_time=35,
        alternative_route_time=25,
        mode=SystemMode.COMMUTE,
        current_bus_arrival_minutes=3,
        alternative_bus_arrival_minutes=8,
        alternative_congestion_rate=60,
    )

    assert result["shouldSuggest"] is True
    assert result["gateResults"]["gate1"] == "PASS"
    assert result["gateResults"]["gate2"] == "PASS"
    assert result["gateResults"]["gate3"] == "PASS"
```

---

## 정리

- 이 문서는 **DailyMotion의 핵심 로직과 알고리즘이 실제로 어떻게 구현되어 있는지**를  
  심사위원과 기술 검토자에게 설명하기 위한 문서입니다.
- 특히 다음 세 가지 메시지를 중심으로 이해하면 됩니다.
  1. **Door-to-Door 기준으로 출근/퇴근을 최적화한다.**  
  2. **Gate 3개(시간/환승/혼잡도)를 모두 통과한 경로만 사용자에게 추천한다.**  
  3. **실시간/통계/외부 API와 견고한 Fallback 구조로, 장애 상황에서도 깨지지 않도록 설계했다.**

이 버전은 심사위원용으로 **코드 블록은 대표 부분만 남기고**,  
나머지 구현 세부사항은 `service.py` 및 관련 모듈(appendix 역할)로 위임하는 형태라서,  
발표용/제출용으로 그대로 사용해도 자연스러운 구조입니다.
