**최종 목표**: v3.0 명세서의 모든 Logic을 TDD 원칙으로 구현 ✨

---

## 🚀 **Phase 12.5: ODSAY API 웹 엔드포인트 및 서버 구성** (2025.11.14)

### ✅ 완료한 작업

#### 1️⃣ **FastAPI 서버 기본 설정 개선**
- Pydantic v2 호환성 수정
  - `Config` 클래스 → `ConfigDict` 방식으로 변경
  - `env_file`, `case_sensitive`, `extra` 옵션 설정
- 환경변수 추가: `ODSAY_API_KEY`, `ENVIRONMENT`, `LOG_LEVEL`
- `extra="ignore"` 설정으로 추가 환경변수 무시하도록 개선

#### 2️⃣ **환경변수 로드 메커니즘 강화**
- `main.py`에서 `load_dotenv()` 명시적 호출 추가
- `.env` 파일이 서버 시작 시 자동으로 로드되도록 설정
- 이전 문제: `BaseSettings`가 자동 로드한다는 가정 ❌ → 명시적 로드 필요

#### 3️⃣ **ODSAY API 웹 엔드포인트 구현**
- **2개의 테스트 엔드포인트** 추가 (path_optimize_router.py):
  1. `GET /api/v1/briefings/odsay/test/station`
     - 파라미터: `station_name` (역/정류장 이름)
     - 응답: 최대 5개 정류장 정보 (이름, ID, 좌표, 주소, 유형)

  2. `GET /api/v1/briefings/odsay/test/route`
     - 파라미터: `start_station`, `end_station`
     - 과정: 역 검색 → 좌표 획득 → 경로 검색
     - 응답: 경로 목록 (상위 3개, 소요시간/거리/요금)

#### 4️⃣ **웹 테스트 성공**
```
✅ 강남역 검색: 10개 정류장 발견
✅ 을지로입구역 검색: 성공
✅ 경로 검색: 17개 경로 반환
✅ 웹 브라우저 (curl): 정상 응답
✅ FastAPI Swagger UI (/docs): 엔드포인트 접근 가능
```

### 🔴 발견한 문제점 및 개선 필요 사항

#### **문제 1: legs 필드가 항상 비어있음**
```python
# 현재 코드 (잘못됨)
"legs": legs  # 항상 []
```

**원인분석**:
- ODSAY API 응답에는 `legs` 필드가 없음
- 실제 필드명은 **`subPath`**
- 필드명 및 데이터 매핑이 잘못됨

**해결방법**:
```python
# 수정 필요
"subPath": path.get("subPath", [])  # 이게 맞음
```

#### **문제 2: busCount, subwayCount가 항상 0**
```python
# 현재 응답
"busCount": 0,
"subwayCount": 0,
"transferCount": 0
```

**원인분석**:
- ODSAY 응답의 `info` 필드에 이 값들이 없거나 0으로 반환됨
- 또는 `subPath` 배열의 `trafficType`을 분석해 수동으로 계산해야 함
  - `trafficType`: 1=버스, 2=지하철, 3=택시, 4=자동차 등

**해결방법**:
```python
# subPath 배열에서 trafficType 분석해 자동 계산
busCount = len([s for s in subPath if s.get('trafficType') == 1])
subwayCount = len([s for s in subPath if s.get('trafficType') == 2])
transferCount = calculate_transfer_count(subPath)
```

#### **문제 3: totalPrice (요금)가 항상 0**
```python
# 현재 응답
"totalPrice": 0
```

**원인분석**:
- ODSAY API가 정말 0을 반환하는지 불명확
- 또는 요금 정보가 다른 필드에 있을 가능성
- 응답 구조 재검증 필요

**해결방법**:
- ODSAY API 원본 응답 상세 분석 필요
- `info` 필드와 각 `subPath` 구간의 가격 정보 확인

#### **문제 4: parse_route_info() 함수의 불완전한 파싱**
```python
# 현재 구현
formatted_path = {
    "id": f"path_{idx + 1}",
    "pathType": path.get("pathType", 1),
    "totalTime": total_time_seconds,
    "totalDistance": total_distance_meters,
    "totalPrice": info.get("totalPrice", 0),
    "busCount": info.get("busCount", 0),  # ❌ 항상 0
    "subwayCount": info.get("subwayCount", 0),  # ❌ 항상 0
    "transferCount": info.get("transferCount", 0),  # ❌ 항상 0
    "legs": legs  # ❌ 항상 []
}
```

**개선 필요 사항**:
1. `legs` → `subPath`로 필드명 변경
2. `subPath` 배열 구조 상세 분석
3. `trafficType` 기반 버스/지하철 개수 자동 계산
4. `transferCount` 정확한 계산 로직 구현
5. `totalPrice` 출처 재확인

### 📊 현재 상황 및 다음 단계

#### **현재 상황**
- ✅ ODSAY API 호출: 성공
- ✅ 기본 데이터 파싱: 부분 성공 (일부 필드만)
- ✅ 프론트엔드 API: 구현 (테스트 엔드포인트)
- ❌ **PathOptimizeService 연동**: 미구현
- ❌ **Logic 2.2 Gate 검증 자동화**: 미구현
- ❌ **데이터베이스 저장**: 미구현

#### **우선순위 개선 작업** (Phase 12.5 다음)
1. **parse_route_info() 함수 재구현** (필수)
   - ODSAY API 응답 상세 분석
   - `subPath` 배열 완전 파싱
   - 버스/지하철/환승 개수 정확 계산

2. **PathOptimizeService와 연동** (필수)
   - ODSAY 경로 데이터 자동 입력
   - Logic 2.2 Gate 검증 자동화

3. **데이터베이스 저장** (Phase 11)
   - 경로 검색 결과 저장
   - 사용자별 경로 히스토리 관리

### 🔍 기술 정보

#### **포트 설정**
- FastAPI 서버: `127.0.0.1:8001`
- Swagger UI: `http://localhost:8001/docs`
- 상태: 🟢 **실행 중** (uvicorn reload 모드)

#### **ODSAY API 파라미터 명세**
- Base URL: `https://api.odsay.com/v1/api`
- 엔드포인트 1: `/searchStation` (역 검색)
- 엔드포인트 2: `/searchPubTransPathT` (경로 검색)
- 주요 파라미터: `SX`, `SY`, `EX`, `EY`, `apiKey`
- **stationClass**: `"1:2"` (콜론 구분 - **쉼표 아님**)
- **SearchPathType**: 0=모두, 1=지하철, 2=버스

#### **ODSAY API 응답 구조 (문서에서 확인)**
```
searchPubTransPathT 응답:
├── result
│   └── path[] (경로 배열)
│       ├── pathType: 1=지하철, 2=버스, 3=복합
│       ├── info
│       │   ├── totalTime: 소요시간 (초)
│       │   ├── totalDistance: 거리 (미터)
│       │   ├── totalPrice: 요금 (원)
│       │   ├── busCount: 버스 탑승 횟수
│       │   ├── subwayCount: 지하철 탑승 횟수
│       │   └── transferCount: 환승 횟수
│       ├── subPath[] (구간 배열) ← 우리가 파싱 안 함
│       │   ├── trafficType: 1=버스, 2=지하철, 3=택시
│       │   ├── distance: 구간 거리
│       │   ├── sectionTime: 구간 시간
│       │   ├── startName: 출발역
│       │   ├── endName: 도착역
│       │   ├── lane: 버스/지하철 라인 정보
│       │   └── passStopList: 중간 정류장들
│       └── legs[] ← 우리가 사용하는 필드 (실제로는 subPath)
└── code (없음!)
```

### 📝 커밋 정보
- 커밋 ID: `149ab23`
- 커밋 메시지: FastAPI 서버 구성 및 ODSAY API 웹 엔드포인트 추가
- 변경 파일: 3개 (`config.py`, `main.py`, `path_optimize_router.py`)

---