2# 데일리모션 백엔드 코드 오너십 로드맵 (2주/10일)

> 목표:  
> - 남이 짠(혹은 AI가 짠) 데일리모션 백엔드 코드를 **내 코드처럼** 장악하기  
> - 흐름 이해 → 리팩토링 → 테스트 코드 작성까지 이어지는 **완전 사이클** 경험  
> - 기준: **하루 2시간, 2주(10일)**  
> - 구성:  
>   - **A. 설계/TDD 트랙** – AGENTS, OpenAPI, 서비스/리포지토리, 테스트 이해  
>   - **B. 코드 오너십 트랙** – 로그 추적, 고장 내기, 변수 조작, 작은 기능 수정

이 문서는 “3번 유형: 코드 오너십 트랙 (2주/10일 완성)”을 참고해서,  
기존 설계 중심 STUDY_PLAN과 통합한 **하이브리드 플랜**입니다.

---

## 0. 이 문서 사용 방법

- [ ] 하루 공부 시작 전에, 오늘 할 **Day N** 섹션을 고른다.
- [ ] 각 Day에는 항상 두 축이 있다.
  - **A. 설계/TDD 트랙** – 문서/코드 구조 이해, 리팩토링 설계
  - **B. 코드 오너십 트랙** – 실행해보기, 고장 내보기, 수정/테스트
- [ ] 각 체크박스를 완료할 때마다, 옆에 **(완료 날짜/메모)**를 적는다.
- [ ] 모르는 개념/코드는 바로 리팩토링하지 말고, **“왜 이렇게 만들었을까?”**를 먼저 적어본다.
- [ ] 리팩토링은 항상 **작은 단위**로 나누고, 변경 전/후 행동이 같은지 확인한다.
- [ ] 테스트는 항상 **사용자/비즈니스 관점 시나리오**를 먼저 글로 쓰고, 그다음 Pytest 코드로 옮긴다.

예시:

- [x] AGENTS.md 정독 (2025-01-01, 헌법 구조 이해 완료)

### 0-1. 참고 문서 지도 (어디에서 무엇을 볼지)

- [ ] 프로젝트 헌법/철학
  - [ ] `AGENTS.md` – 전체 규칙, 백엔드/프론트 협업 원칙 (Day 1)
  - [ ] `claude.md` – AI/아키텍트 관점 헌법, Logic/Gate 요약 (Day 1)
  - [ ] `LEARNING_ROADMAP.md` – 8주 장기 학습 플랜 (지금 로드맵보다 더 긴 플랜이 필요할 때 참고)
- [ ] 백엔드 전반/DB 구조
  - [ ] `server/README.md` – 서버 디렉토리 구조/개발 가이드 (Day 1~2)
  - [ ] `server/docs/USERS_SCHEMA.md` – `users`, `commute_settings`, `journeys`, `optimization_history` 관계 (Day 6)
- [ ] 모듈/로직 설계
  - [ ] `docs/MODULES.md` – `ai_pattern` / `path_optimize` / `risk_manage` 모듈 역할 개요 (Day 1~2)
  - [ ] `server/app/modules/path_optimize/DESIGN.md` – v3.0 Logic 전체 설계 (Day 4)
  - [ ] `server/docs/path_optimize/LOGIC_GUIDE.md` – Logic 1.1~4.3 세부 로직/임계값 (Day 4)
  - [ ] `server/docs/path_optimize/API.md` – `PathOptimizeService` public 메서드/계약서 (Day 4~5)
  - [ ] `server/docs/path_optimize/CONGESTION_MAPPING.md` – 혼잡도/구간 매핑 설계 (Day 4 또는 Phase C 읽을 때)
  - [ ] `server/app/modules/path_optimize/SERVICE_REVIEW.md` – `service.py` 코드 리뷰/개선 포인트 (Day 4~6)
  - [ ] `server/app/modules/path_optimize/COMPLIANCE_AUDIT.md` – 헌법 준수 여부 리포트 (Day 4~6)
  - [ ] `server/app/modules/path_optimize/TASKS_PATH_OPTIMIZE.md` – 모듈 TODO/진행 상황 (Day 4~6)
- [ ] API/프론트 연동
  - [ ] `docs/openapi/v1.yaml` – Design-First OpenAPI 원본 (Day 3)
  - [ ] `docs/api-contracts.md` – 고정 API 계약(프론트-백엔드 합의 스펙) (Day 3)
  - [ ] `docs/api-changelog.md` – 스펙 변경 이력 (Day 3 이후 필요 시)
  - [ ] `docs/frontend_integration.md` – 화면별 어떤 API를 언제/어떻게 쓰는지 (Day 3~5)
  - [ ] `시나리오.md` – 실제 UX/시나리오 흐름 (Logic 1.1~3.2가 언제 쓰이는지 감 잡기) (Day 3~5)
- [ ] 진행/로깅/실시간
  - [ ] `TASKS_DAILYMOTION_ROADMAP.md` – 전체 Phase/Logic별 TODO (Day 1)
  - [ ] `TASKS_PHASE_C_REALTIME.md` – 실시간 데이터(C-1~C-3) 세부 TODO (Day 1 또는 Phase C 보기 시작할 때)
  - [ ] `PROGRESS_DAILYMOTION_BACKEND.md` – 이미 구현된 것/남은 것 요약 (Day 1~2)
- [ ] 기타
  - [ ] `docs/presentation/*.md` – 제품/서비스 소개용 슬라이드 원고, 비즈니스 맥락 이해에 도움이 될 때 참고 (선택)
  - [ ] `client/README.md` – 클라이언트 구조/React Query·Zustand 사용 방식 (프론트 연동이 궁금할 때 선택)

---

## Week 1 – 데이터의 여행 (흐름 파악)

### Day 1 – 지도 그리기 (헌법 + 아키텍처)

> ⏱ 권장 흐름 (2시간 예시)  
> - 0~20분: AGENTS.md 1회 정독 + 밑줄/메모  
> - 20~50분: README/로드맵 문서 읽고 한 문단 요약  
> - 50~80분: `server/app/` 트리 펼쳐보고 각 디렉터리 역할 정리  
> - 80~120분: 손으로 아키텍처 그림 그리기 + 짧은 설명 문장 쓰기

**A. 설계/TDD 트랙**

- [ ] `AGENTS.md`를 **처음부터 끝까지 정독**한다.
  - [x] 1회차: 빠르게 스크롤하면서 큰 섹션 제목(프론트/백엔드/상호규약 등)만 훑어본다. 2025.11.29
  - [ ] 2회차: 각 섹션에서 중요한 문장에 밑줄(또는 IDE 하이라이트)을 긋는다.
  - [ ] 이해 안 되는 용어/규칙은 옆에 `?` 표시하고 “나중에 다시 보기” 리스트를 만든다.
  - [ ] 프론트/백엔드 역할, 모듈형 모놀리식 개념을 메모한다.
    - [ ] “프론트엔드가 하는 일 / 백엔드가 하는 일”을 각각 한 문장으로 적어본다.
    - [ ] “모듈형 모놀리식”의 정의를 내 말로 2~3줄로 써본다.
  - [ ] Logic 1.x / 2.x / 3.x / 4.x 키워드를 따로 노트에 정리한다.
    - [ ] 각 Logic 옆에 “지금 예상하는 역할”을 간단히 써본다 (정확하지 않아도 됨).
- [ ] `claude.md`를 읽고, AGENTS.md와 비교해본다.
  - [ ] Logic 1.1 / 2.2 / 3.1 / 3.2 핵심 포인트(출발 알림, Gate 3개, 지연 감지, 택시 제안)를 한 줄씩 요약한다.
  - [ ] “Design-First → TDD → 구현” 흐름이 어떻게 반복되는지 정리한다.
- [ ] 루트 문서 훑어보기  
  - [ ] `README.md`에서 전체 프로젝트 목표, 실행 방법을 읽고 요약한다.
    - [ ] “이 서비스가 사용자의 어떤 문제를 해결하는지”를 한 문장으로 적는다.
    - [ ] 설치/실행 방법 중 모르는 명령어나 도구가 있으면 체크해둔다.
  - [ ] `server/README.md`를 읽고, `server/app/` 디렉토리 구조와 각 폴더 역할을 다시 한 번 정리한다.
  - [ ] `docs/MODULES.md`에서 `ai_pattern` / `path_optimize` / `risk_manage` 각 모듈의 “책임”을 한 줄씩 적는다.
  - [ ] `TASKS_DAILYMOTION_ROADMAP.md`를 읽고, **현재 백엔드 로드맵**을 한 문단으로 요약한다.
    - [ ] Phase A/B/C/D/E 중 지금 가장 많이 구현된 것과 덜 구현된 것을 표시한다.
    - [ ] “앞으로 이 프로젝트가 어디로 가려는지”를 3줄 요약한다.
  - [ ] `TASKS_PHASE_C_REALTIME.md`가 있다면, **실시간 기능(Phase C)** 방향을 주요 bullet로 정리한다.
    - [ ] 어떤 외부 API/실시간 소스(지하철, 버스 등)를 쓰려는지 적어본다.
  - [ ] `PROGRESS_DAILYMOTION_BACKEND.md`를 읽고, 이미 구현이 “완료된 Logic vs TODO인 Logic”을 표로 나눈다.
- [ ] 디렉토리 트리 눈으로 익히기
  - [ ] IDE에서 `server/app/` 하위 구조(`api/`, `core/`, `db/`, `modules/`)를 펼쳐본다.
  - [ ] 각 디렉토리의 “역할”을 한 줄씩 적는다.  
    - 예: `modules/path_optimize`: 출퇴근 경로 최적화 핵심 로직

**B. 코드 오너십 트랙 (3번 Day 1 – 지도 그리기)**

- [ ] A4/노트/타블렛 등에 **손으로 아키텍처 그림**을 그린다.  
  - [ ] “클라이언트 → FastAPI(라우터) → 서비스 → 리포지토리/클라이언트 → DB/외부 API” 흐름을 박스로 그린다.
  - [ ] `path_optimize`, `ai_pattern`, `risk_manage` 모듈이 어디에 위치하는지 표시한다.
- [ ] 완성된 그림을 사진 찍거나, 나중에 다시 볼 수 있게 보관한다.

---

### Day 2 – FastAPI 앱 구조 + 로그 추적

> ⏱ 권장 흐름 (2시간 예시)  
> - 0~20분: `main.py` 읽고 앱/라우터 등록 구조 파악  
> - 20~40분: `api/v1/__init__.py`와 각 라우터 파일 위치/역할 정리  
> - 40~70분: `path_optimize_router.py`에서 엔드포인트/서비스 매핑 표 만들기  
> - 70~110분: 임시 로그 추가 후 서버/테스트 실행, 로그 순서 확인  
> - 110~120분: 오늘 알게 된 “요청 → 라우터 → 서비스” 흐름을 3~5줄로 요약

**A. 설계/TDD 트랙**

- [ ] `server/app/main.py` 읽기
  - [ ] FastAPI 인스턴스 생성 위치를 찾는다.
    - [ ] `FastAPI(`가 선언된 부분에 “앱 진입점”이라고 주석/메모를 남긴다.
  - [ ] 어떤 라우터들이 `include_router`로 등록되는지 리스트를 만든다.
    - [ ] 각 라우터에 대해 “어떤 도메인을 담당하는지”를 괄호 안에 적는다. (예: path_optimize – 출퇴근 로직)
  - [ ] `/health`와 `/api/v1/*` 라우트의 차이를 메모한다.
    - [ ] `/health`가 어디에서 사용될지(예: 쿠버네티스 헬스 체크)를 추측해서 적어본다.
- [ ] API v1 라우터 구조 이해
  - [ ] `server/app/api/v1/__init__.py`에서 각 라우터(`path_optimize_router`, `user_router`, `risk_manage_router`, `ai_pattern_router`)를 확인한다.
  - [ ] 각 라우터 파일 이름과 “담당 도메인”을 노트에 정리한다.
    - [ ] 아직 구현이 덜 된 라우터(예: ai_pattern)가 있다면 “TODO”라고 표시해둔다.
- [ ] `server/app/api/v1/path_optimize_router.py`를 대략 읽어본다.
  - [ ] 어떤 HTTP 메서드/URL이 있는지 목록을 만든다.  
    - 예: `GET /context/mode-switch`, `POST /routes/alternative`, ...
  - [ ] 각 엔드포인트가 **어떤 서비스 메서드**를 호출하는지 적어둔다.  
    - 예: `/context/mode-switch` → `PathOptimizeService.get_auto_mode_switch_action`
    - [ ] “이 엔드포인트는 어떤 Logic(1.x/2.x/3.x/4.x)에 해당할까?”를 추측해서 옆에 적어본다.
- [ ] `docs/MODULES.md`의 경로 최적화/위험 관리/AI 패턴 섹션을 다시 보면서, 각 라우터가 어떤 모듈 서비스와 연결되는지 매핑 표를 만든다.

**B. 코드 오너십 트랙 (3번 Day 2 – 로그 추적)**

- [ ] 다음 위치에 **임시 로그(logging.info 또는 print)**를 추가한다.
  - [ ] `main.py` – 요청이 들어올 때 간단한 로그 (예: path, method).
  - [ ] `path_optimize_router.py`의 대표 엔드포인트(예: `/context/mode-switch`) 진입 시 로그.
  - [ ] `PathOptimizeService`의 같은 흐름을 처리하는 메서드 진입 시 로그.
- [ ] 서버/테스트 실행으로 로그 순서를 직접 확인한다.
  - [ ] (가능하다면) `uvicorn app.main:app --reload` 또는 프로젝트에서 사용하는 실행 스크립트를 사용한다.
  - [ ] 브라우저/HTTP 클라이언트/테스트로 해당 엔드포인트를 호출해서 로그 흐름을 관찰한다.
  - [ ] “요청 1번이 들어왔을 때, 로그가 A → B → C 순서로 찍힌다”는 것을 노트에 기록한다.
  - [ ] 작업 후에는 임시 로그를 정리하거나 주석 처리해둔다.

---

### Day 3 – OpenAPI 스펙 + API 해부

> ⏱ 권장 흐름 (2시간 예시)  
> - 0~25분: `docs/openapi/v1.yaml`의 `paths:`만 빠르게 1회 스캔  
> - 25~45분: 핵심 엔드포인트 1개 골라 요청/응답 스키마 자세히 읽기  
> - 45~70분: 해당 엔드포인트의 라우터 → 서비스 → 리포지토리까지 따라가며 노트 정리  
> - 70~100분: `docs/api-contracts.md`/`docs/api-changelog.md`/`docs/frontend_integration.md`/`시나리오.md`를 엮어서 “이 API가 실제 화면에서 어떻게 쓰이는지” 정리  
> - 100~120분: “이 프로젝트의 Design-First 흐름”을 A4 1/2장으로 요약

**A. 설계/TDD 트랙**

- [ ] `docs/openapi/v1.yaml` 전체 구조 훑기
  - [ ] `paths:` 아래의 주요 엔드포인트 목록을 만든다.  
    - 출퇴근 관련, 경로 최적화 관련, 예외/지연 관련, 택시 관련 등으로 분류해본다.
  - [ ] 하나의 엔드포인트(예: `/context/mode-switch` 또는 `/briefings/commute`)를 골라, **request/response 스키마**를 읽고 요약한다.
    - [ ] 요청 쿼리/바디 필드 이름과 타입을 표로 정리한다.
    - [ ] 응답의 `data` 구조가 어떻게 생겼는지(필수/옵션 필드) 적는다.
- [ ] 스펙 ↔ 라우터 연결 연습
  - [ ] 위에서 고른 엔드포인트의 실제 구현을 `path_optimize_router.py`에서 찾아본다.
  - [ ] 스펙의 **쿼리 파라미터 이름(camelCase)** 와 라우터 함수의 파라미터 이름이 일치하는지 비교한다.
  - [ ] 스펙에서 정의한 응답 구조(Envelope 형태)가 실제 코드에서 어떻게 표현되는지 확인한다.
    - [ ] 실제 코드에서 Pydantic 모델/타입 힌트가 스펙과 다른 부분이 있는지 표시한다.
- [ ] `docs/api-contracts.md`에서 같은 엔드포인트 섹션을 찾아, OpenAPI와 비교했을 때 “프론트와 합의된 고정 계약”이 무엇인지 정리한다.
  - [ ] 응답 필드/타입/에러 구조가 실제 구현과 맞는지 체크한다.
- [ ] `docs/api-changelog.md`를 읽고, 지금 보고 있는 엔드포인트에 대해 과거에 어떤 변경이 있었는지(있다면) 확인한다.
- [ ] `docs/frontend_integration.md` + `시나리오.md`에서 같은 엔드포인트가 어떤 화면/UX에서 어떻게 호출되는지, 어떤 필드를 UI에 매핑하는지 정리한다.
- [ ] 메모 정리
  - [ ] “이 프로젝트는 **Design-First(OpenAPI)**를 어떻게 구현에 반영하고 있는가?”를 A4 1/2장 정도로 정리한다.
    - [ ] “스펙 → 라우터 → 서비스 → 테스트” 흐름을 글로 한 번 써본다.

**B. 코드 오너십 트랙 (3번 Day 3 – API 해부)**

- [ ] “가장 핵심”이라고 느끼는 API 하나를 선택한다.  
  - 예: `/context/mode-switch`, `/context/routes/alternative`, `/briefings/commute` 등
- [ ] 그 API를 **router → service → repository/db**까지 한 줄 한 줄 따라가며 해부한다.
  - [ ] 라우터 함수에 주석 또는 외부 노트로 “여기서 서비스의 X 메서드 호출”이라고 적는다.
  - [ ] 서비스 메서드에 “여기서 DB에서 Y 정보를 읽고, Z 규칙으로 판단”이라고 요약한다.
  - [ ] 최종적으로 어느 모델/테이블까지 가는지(예: `AverageDurationDB`, `LastBusScheduleDB`) 확인한다.
  - [ ] “이 API가 실패할 수 있는 경우(예외/에러 코드)”를 코드에서 찾아보고 정리한다.

---

### Day 4 – path_optimize 모듈 개요 + 변수 조작

> ⏱ 권장 흐름 (2시간 예시)  
> - 0~25분: `path_optimize/DESIGN.md` 정독 + Logic 1.x~3.x 요약  
> - 25~45분: `server/docs/path_optimize/LOGIC_GUIDE.md`에서 각 Logic의 임계값/성공 기준 정리  
> - 45~65분: `SERVICE_REVIEW.md`, `COMPLIANCE_AUDIT.md`, `TASKS_PATH_OPTIMIZE.md`에서 Gate/규칙/진행상황 발췌  
> - 65~80분: `server/docs/path_optimize/API.md`에서 `PathOptimizeService` public 메서드 시그니처/역할 정리  
> - 80~110분: Day 3에서 해부한 API 흐름 중간 변수 1~2개 조작해보고 응답 비교  
> - 110~120분: “path_optimize 서비스가 하는 일”을 한 문단으로 설명

**A. 설계/TDD 트랙**

- [ ] 문서 먼저 읽기
  - [ ] `server/app/modules/path_optimize/DESIGN.md`를 정독한다.
  - [ ] Logic 1.1 ~ 3.x에 대해 “무슨 문제를 해결하는지”를 bullet로 정리한다.
  - [ ] `SERVICE_REVIEW.md`, `COMPLIANCE_AUDIT.md`가 있다면, **위반하면 안 되는 규칙/조건(Gate)**를 체크한다.
    - [ ] Gate(조건) 각각에 대해 “위반되면 사용자 입장에서 어떤 문제가 생기는지”를 적어본다.
  - [ ] `server/docs/path_optimize/LOGIC_GUIDE.md`에서 Logic 1.1~4.3 각각에 대해
    - [ ] “입력 값”, “임계값(예: 7분, 3분, 혼잡도 80% 등)”, “성공/발동 기준”을 표로 정리한다.
  - [ ] `server/app/modules/path_optimize/TASKS_PATH_OPTIMIZE.md`에서 현재 Logic별로 어떤 테스트/구현이 완료됐는지 요약한다.
  - [ ] `server/app/modules/path_optimize/SERVICE_REVIEW.md`를 훑으며, `service.py`의 강점/문제점/리팩토링 권장사항을 목록으로 빼놓는다.
  - [ ] `server/docs/path_optimize/API.md`에서 `PathOptimizeService`의 public 메서드 12개 이름/역할을 표로 정리하고, 어떤 Logic에 매핑되는지 적는다.
  - [ ] (선택) `server/app/modules/path_optimize/phase12.5.md`, `solution.md`를 읽고, ODSAY 연동 과정에서 어떤 문제들이 있었고 어떻게 해결했는지 “교훈 리스트”를 만든다.
- [ ] 서비스 코드 개요 잡기
  - [ ] `server/app/modules/path_optimize/service.py`를 열고, 클래스/함수 목록을 싹 훑는다.
  - [ ] Logic 1.x / 2.x / 3.x에 대응하는 메서드를 찾아 이름을 적어둔다.
  - [ ] 각 메서드가 어떤 repository/클라이언트에 의존하는지 (import/호출 부분)을 표시한다.
    - [ ] 서비스 메서드마다 “입력 / 내부 의존성 / 출력”을 간단히 표처럼 적어본다.

**B. 코드 오너십 트랙 (3번 Day 4 – 변수 조작)**

- [ ] Day 3에서 해부한 API를 다시 호출해보면서, 중간 변수 값을 조작해본다.
  - [ ] 서비스 메서드 내부에서, 특정 조건 분기 전에 **임시로 변수 값을 바꾸는 코드**를 넣어본다.  
    - 예: 실제 지연 여부와 상관없이 `is_delayed = True`로 강제.
  - [ ] 또는, 막차까지 남은 시간을 계산하는 부분에서 값을 일부러 +10, -10 해본다.
  - [ ] API 응답 또는 로그가 어떻게 달라지는지 확인한다.
  - [ ] “변수 한 줄 바꿨더니, 응답의 어떤 필드/플래그가 바뀌었다”를 구체적으로 메모한다.
  - [ ] 작업이 끝난 후에는 코드 원상복구를 꼭 해둔다.

---

### Day 5 – 테스트 구조 이해 + 데이터 흐름 설명

> ⏱ 권장 흐름 (2시간 예시)  
> - 0~20분: `path_optimize/tests/` 파일 이름만 쭉 읽으며 Logic 매핑  
> - 20~55분: `test_logic_1_1.py`의 테스트들을 Given/When/Then 구조로 노트에 정리  
> - 55~80분: 다른 테스트 파일 1개(`test_logic_2_2` 등)도 같은 방식으로 분석  
> - 80~105분: `docs/frontend_integration.md`/`docs/api-contracts.md`/`server/docs/path_optimize/API.md`를 보며 “테스트가 보장하는 계약”에 밑줄 긋기  
> - 105~120분: 오늘 이해한 “데이터 흐름”을 입으로 3~5분 설명해보고 메모

**A. 설계/TDD 트랙**

- [ ] 테스트 디렉토리 스캐닝
  - [ ] `server/app/modules/path_optimize/tests/` 내부 파일 목록을 쭉 보고, 파일 이름을 읽어본다.
  - [ ] Logic별 테스트(`test_logic_1_1.py`, `test_logic_2_2_gate_validation.py`, `test_logic_3_1_delay_detection.py` 등)를 노트에 적는다.
- [ ] 대표 테스트 파일 1~2개 깊게 읽기
  - [ ] `test_logic_1_1.py`를 선택해, 각 테스트 케이스의 **Given / When / Then**을 한국어로 정리한다.
    - [ ] 각 테스트 함수 이름을 해석해서 “어떤 상황을 검증하는지” 한 줄로 쓴다.
    - [ ] Given 블록에서 어떤 데이터/상태를 준비하는지 목록을 만든다.
    - [ ] Then에서 어떤 조건을 assert 하는지(값/길이/에러 등) 정확히 적는다.
  - [ ] `test_logic_2_2_gate_validation.py` 또는 관심있는 다른 파일도 같은 방식으로 정리한다.
- [ ] 테스트 철학 이해
  - [ ] “이 프로젝트의 테스트는 무엇을 보장하려고 하는가?”를 한 단락으로 정리한다.
  - [ ] AGENTS.md의 “TDD/테스트는 엔진 설계도의 집행관”이라는 문장을 실제 테스트와 연결해서 설명해본다.
    - [ ] “이 테스트가 깨지면, 어떤 설계 원칙이 깨진 것인지”를 구체 예시와 함께 써본다.
  - [ ] `docs/api-contracts.md`/`docs/frontend_integration.md`/`server/docs/path_optimize/API.md` 중 관련 섹션을 보면서, 특정 테스트가 “어떤 API/서비스 계약을 깨지 않도록 지켜주는지”를 연결해서 적어본다.

**B. 코드 오너십 트랙 (3번 Day 5 – 중간 점검)**

- [ ] 친구/동료/가상의 청자에게 설명한다는 느낌으로, **데이터 흐름**을 말로 풀어본다.
  - [ ] “사용자가 앱에서 A 버튼을 누르면 → 어떤 API가 호출되고 → 서비스에서 어떤 결정을 하고 → DB/외부 API를 어떻게 조회해서 → 응답이 어떻게 만들어진다”를 3~5분 분량으로 정리한다.
  - [ ] 말로 설명이 안 되는 부분은 따로 표시해두고, 나중에 다시 코드/테스트를 보며 채워넣는다.

---

## Week 2 – 집도의 모드 (수정 및 테스트)

### Day 6 – DB/Repository 구조 파악 + 고장 내기

> ⏱ 권장 흐름 (2시간 예시)  
> - 0~25분: `db/models/*.py`에서 주요 테이블와 필드 역할 훑어보기  
> - 25~45분: `path_optimize/models`에서 이 모듈이 쓰는 DB 모델만 다시 정리  
> - 45~70분: 각 리포지토리(`average_duration_*.py` 등)에서 “어떤 질문에 답하는 함수인지” 한 줄씩 적기  
> - 70~100분: 핵심 로직 1곳을 선택해 if 조건/쿼리 일부를 고장 내고, 어떤 테스트/API가 깨지는지 확인  
> - 100~120분: 스택 트레이스/에러 메시지에서 알게 된 호출 순서를 노트에 정리 + 코드 원복

**A. 설계/TDD 트랙**

- [ ] DB 모델 보기
  - [ ] `server/app/db/models/journey.py`, `user.py`, `report.py`를 훑으며 각 테이블 역할을 파악한다.
  - [ ] `path_optimize` 모듈에서 실제로 사용하는 모델이 무엇인지 표시한다 (예: `AverageDurationDB`, `LastBusScheduleDB` 등).
  - [ ] `server/docs/USERS_SCHEMA.md`를 읽고, `users`를 중심으로 `commute_settings`, `journeys`, `optimization_history`, `reports`가 어떻게 연결되는지 ERD처럼 그려본다.
- [ ] path_optimize 관련 DB 모델/리포지토리 집중
  - [ ] `server/app/modules/path_optimize/models/__init__.py`와 개별 모델 파일을 확인한다.
  - [ ] `average_duration_repository.py`, `optimization_history_repository.py`, `seoul_subway_congestion_repository.py`, `last_bus_schedule_repository.py`의 함수 목록을 한 번씩 훑는다.
  - [ ] 각 리포지토리가 **어떤 질문에 답하는지** (예: “구간별 평균 소요시간?”, “막차까지 남은 시간?”) 한 줄 설명을 적어둔다.
    - [ ] 각 리포지토리에 대해 “입력 파라미터 / 반환 타입 / 에러 시 동작”을 표로 정리한다.

**B. 코드 오너십 트랙 (3번 Day 6 – 고장 내기)**

- [ ] 핵심 흐름 하나를 골라 **의도적으로 고장** 내본다.
  - [ ] 예: `PathOptimizeService`의 특정 Logic에서 if 조건을 뒤집어 보기 (`if not condition` 형태로).
  - [ ] 예: `last_bus_schedule_repository`에서 DB 쿼리 결과를 강제로 `None`으로 돌려보기.
  - [ ] 고장 난 상태에서 테스트 또는 API를 실행한다.
  - [ ] 관련 테스트 파일이나 E2E 테스트(예: `test_logic_1_2_retreat_mode.py` 등)를 실행해본다.
  - [ ] 어디서 AssertionError/HTTPException/로그 경고가 터지는지 관찰하고, **스택 트레이스를 노트에 복사**해본다.
- [ ] 고장 내기 후에는 코드를 반드시 원래대로 되돌린다.

---

### Day 7 – `last_bus_schedule_repository` 깊이 이해 + 작은 기능 변경

> ⏱ 권장 흐름 (2시간 예시)  
> - 0~30분: `last_bus_schedule_repository.py`를 줄단위로 읽고, 각 블록마다 한 줄 요약 적기  
> - 30~50분: `get_minutes_until_last_bus` 호출 위치 검색 및 호출 흐름 지도 그리기  
> - 50~80분: “DB 접근 영역 vs 계산 영역”을 나눠 pseudo code로 정리  
> - 80~105분: 로그 메시지/작은 기능 1개를 실제로 수정해보고 동작 확인  
> - 105~120분: 수정 전/후 차이를 한 줄 요약 + 원복(또는 유지 여부 결정)

**A. 설계/TDD 트랙**

- [ ] 파일 전체 읽기
  - [ ] `server/app/modules/path_optimize/last_bus_schedule_repository.py`를 줄 단위로 읽는다.
  - [ ] `_get_db_session`, `get_minutes_until_last_bus`의 책임을 각각 한 문장으로 정의한다.
- [ ] 호출하는 쪽 탐색
  - [ ] IDE 검색/`rg "get_minutes_until_last_bus"`로 이 함수를 어디서 호출하는지 찾는다.
  - [ ] 호출하는 서비스 메서드(예: Logic 1.2 퇴근 모드 관련)를 열어, 막차 정보가 어떤 의사결정에 쓰이는지 메모한다.
- [ ] 순수 로직 vs 인프라 로직 분리 관점에서 분석
  - [ ] “DB에서 데이터 가져오기”와 “남은 시간(분) 계산”을 각각 pseudo code로 나눈다.
  - [ ] “남은 시간 계산” 부분을, 나중에 **순수 함수**로 빼낼 수 있을지 아이디어를 적어본다.
    - [ ] 각각의 블록 옆에 “이 부분은 나중에 테스트하기 쉬운가?”를 체크한다.

**B. 코드 오너십 트랙 (3번 Day 7 – 기능 변경)**

- [ ] 아주 작은 기능을 하나 골라 **눈에 보이게** 바꿔본다.
  - [ ] 예: `last_bus_schedule_repository`의 로그 메시지에 현재 요일/route_choice를 더 친절하게 넣어보기.
  - [ ] 예: 특정 API 응답에 디버깅용으로 작은 필드를 추가했다가, 다시 제거해보기 (실제 스펙/계약을 깨지 않는 선에서).
- [ ] 변경 후에는 관련 테스트 또는 API를 다시 실행해본다.
  - [ ] 코드 변경 → 실행/테스트 → 결과 확인의 사이클을 짧게 가져가면서 “내가 뭘 바꿨는지”를 몸으로 느껴본다.

---

### Day 8 – 리팩토링 설계 + 코드 청소

> ⏱ 권장 흐름 (2시간 예시)  
> - 0~25분: `last_bus_schedule_repository`에 대해 “완전히 이해한 상태”의 기준을 글로 정의  
> - 25~55분: 요일/막차/DB 실패/레코드 없음 등 테스트 시나리오만 텍스트로 쭉 적기  
> - 55~80분: 각 시나리오에 대응하는 테스트 함수 이름을 붙이고 우선순위(필수/옵션) 표시  
> - 80~100분: 1~3단계 리팩토링(순수 함수, 세션 주입, 호출부 수정) 계획을 체크리스트로 만들기  
> - 100~120분: 지금까지 본 파일들에서 import/죽은 코드/공백 등 “가벼운 청소” 실행

**A. 설계/TDD 트랙**

- [ ] `last_bus_schedule_repository` 리팩토링 목표 정의
  - [ ] “이 함수를 완전히 이해했다”고 말할 수 있으려면 어떤 상태여야 하는지 스스로 정의한다.  
    - 예: 입력/출력, 실패 케이스, 요일 처리, DB 오류 처리까지 설명 가능.
- [ ] 테스트 아이디어만 먼저 정리 (코드 작성 X)
  - [ ] 다음 상황을 시나리오로 적어둔다.  
    - [ ] 요일별 레코드가 있는 경우 → 해당 요일 우선 선택  
    - [ ] 요일별 레코드가 없고 공통 레코드만 있는 경우  
    - [ ] 막차 시간이 이미 지난 경우 (0분으로 처리)  
    - [ ] DB 세션 생성 실패 시 `None` 반환  
    - [ ] 해당 `route_choice`에 레코드가 없을 때 `None` 반환
  - [ ] 각 시나리오 옆에 나중에 만들 테스트 함수 이름을 미리 적어둔다.  
    - 예: `test_get_minutes_until_last_bus_returns_zero_after_last_bus`
- [ ] 리팩토링 단계 나누기
  - [ ] 1단계: “남은 시간 계산”만 별도 순수 함수로 분리  
  - [ ] 2단계: DB 세션을 **옵션 파라미터**로 주입할 수 있게 변경  
  - [ ] 3단계: 호출하는 곳에서 새 시그니처로 맞추기
    - [ ] 각 단계가 끝났을 때 실행해볼 테스트/시나리오를 옆에 적어둔다.

**B. 코드 오너십 트랙 (3번 Day 8 – 청소하기)**

- [ ] 지금까지 읽은 파일들에서 **불필요한 것들**을 정리한다.
  - [ ] `last_bus_schedule_repository.py`, `average_duration_repository.py` 등에서 안 쓰는 import가 있는지 확인하고 제거한다.
  - [ ] 오래된 TODO 주석/주석 처리된 죽은 코드가 있으면, 정말 필요 없는지 확인 후 삭제한다.
  - [ ] PEP8/프로젝트 스타일을 크게 해치지 않는 선에서, 긴 줄/공백을 정리한다.
- [ ] 정리 후에도 테스트나 주요 시나리오가 정상 동작하는지 확인한다.

---

### Day 9 – 순수 함수 추출 + 첫 테스트 작성 (Happy Path)

> ⏱ 권장 흐름 (2시간 예시)  
> - 0~35분: `calculate_minutes_until_last_bus` 순수 함수 추가 및 기존 코드 리팩토링  
> - 35~55분: 몇 가지 시간 예시를 종이에 적어 직접 계산 → 함수 결과와 비교  
> - 55~80분: `test_db_last_bus_schedule.py` 파일 생성 및 기본 import/fixture 세팅  
> - 80~105분: Happy Path 1개 테스트 구현(막차 30분 전)  
> - 105~120분: 해당 테스트만 실행해보고, 실패 시 에러 메시지 분석/수정

**A. 설계/TDD 트랙**

- [ ] 순수 계산 함수 추출
  - [ ] `last_bus_schedule_repository.py`에, 예를 들어  
        `calculate_minutes_until_last_bus(current_time, last_bus_time) -> int`  
        형태의 순수 함수를 추가한다.
  - [ ] 기존 `get_minutes_until_last_bus`에서 시간 계산 부분을 이 함수로 옮긴다.
  - [ ] 코드를 바꾸기 전/후에 몇 가지 수동 예시(종이에 시간 적기)로 결과를 비교한다.
- [ ] 테스트 파일 뼈대 생성
  - [ ] `server/app/modules/path_optimize/tests/test_db_last_bus_schedule.py`(또는 비슷한 이름)를 새로 만든다.
  - [ ] 상단에 필요한 import(예: `datetime`, `pytest`, `LastBusScheduleDB`, `get_minutes_until_last_bus`)를 추가한다.
  - [ ] Day 8에서 적어둔 시나리오 중 **Happy Path** 하나를 골라 테스트 함수 뼈대를 만든다.

**B. 코드 오너십 트랙 (3번 Day 9 – 테스트 작성)**

- [ ] “가장 불안한” Happy Path 하나를 골라 Pytest 테스트를 완성한다.
  - [ ] 특정 `route_choice`와 `day_of_week`에 대해 막차 시간이 저장된 레코드를 테스트용 DB에 삽입하는 코드를 작성한다.
  - [ ] `current_time`이 막차 30분 전인 상황에서 `get_minutes_until_last_bus`를 호출하고, 30이 반환되는지 검증한다.
- [ ] 테스트 실행
  - [ ] `./run_test.sh server/app/modules/path_optimize/tests/test_db_last_bus_schedule.py` 또는 해당 테스트만 실행해본다.
  - [ ] 실패 시 에러 메시지를 읽고, fixture/세션 설정을 보완한다.

---

### Day 10 – Edge Case 테스트 + 최종 회고

> ⏱ 권장 흐름 (2시간 예시)  
> - 0~30분: 막차 지난 후/레코드 없음/옵션으로 DB 실패 케이스 테스트 구현  
> - 30~60분: 새 테스트들 실행, fixture/cleanup 보완하며 테스트 안정화  
> - 60~90분: “처음 봤을 때 vs 지금”을 비교하는 회고 글 작성  
> - 90~110분: `last_bus_schedule_repository` 5분 설명 스크립트 작성  
> - 110~120분: 다음 타깃(다른 리포/서비스) 후보를 골라, 미니 로드맵 초안 3~5줄 적기

**A. 설계/TDD 트랙**

- [ ] Edge Case 테스트 구현
  - [ ] 막차 지난 후 케이스  
    - [ ] `current_time`이 막차 10분 지난 시점으로 설정된 테스트를 작성한다.  
    - [ ] 반환값이 0으로 고정되는지 검증한다.
  - [ ] 레코드 없는 경우  
    - [ ] 해당 `route_choice`에 레코드가 없는 상황에서 `None`을 반환하는 테스트를 작성한다.
  - [ ] (선택) DB 세션 생성 실패/예외 발생 시 `None` 반환 테스트  
    - [ ] 필요하면 `_get_db_session`을 mock하거나, 세션 팩토리를 주입받도록 구조를 리팩토링하는 방법을 검토한다.
- [ ] 테스트 안정화
  - [ ] 작성한 테스트가 **여러 번 실행해도 항상 같은 결과**를 내는지 확인한다.
  - [ ] fixture/cleanup 코드가 누락되지 않았는지 점검한다.

**B. 코드 오너십 트랙 (3번 Day 10 – 최종 회고)**

- [ ] 회고 작성
  - [ ] “처음 이 코드를 봤을 때 vs 지금” 무엇이 달라졌는지 글로 정리한다.
  - [ ] `last_bus_schedule_repository`에 대해, **면접에서 설명하듯이** 5분짜리 설명 스크립트를 써본다.
- [ ] 다음 타깃 선정
  - [ ] path_optimize에서 다음으로 리팩토링/테스트를 강화하고 싶은 대상(예: `average_duration_repository`, `PathOptimizeService`의 특정 메서드)을 정한다.
  - [ ] 이 문서 형식을 복붙해서, 새로운 대상에 대한 **미니 3~5일 로드맵**을 추가로 만든다.
- [ ] 전체 프로젝트 관점 정리
  - [ ] AGENTS.md, OpenAPI 스펙, path_optimize 모듈, 테스트들을 관통해서 “이 프로젝트의 철학”을 A4 1장 이내로 요약해본다.
  - [ ] “이제 이 프로젝트의 어떤 파일이든 두려움 없이 열 수 있는가?”를 스스로 점검한다.

---

## 부록 – 추천 습관

- [ ] 매 세션 시작 시, 지난 세션 메모를 5분 동안만 복습한다.
- [ ] 하루에 2시간을 모두 쓰지 못해도, **적어도 체크박스 1개는 채우는 것**을 목표로 한다.
- [ ] 새로운 아이디어가 떠올라도, 먼저 이 로드맵을 참고해서 **지금 단계에 맞는 일**인지 확인해본다.
- [ ] 리팩토링은 “더 이해했을 때” 다시 돌아와서 반복할 수 있도록, 변경 전/후를 간단히 기록해둔다.
- [ ] “설계/TDD 트랙”과 “코드 오너십 트랙” 중 어느 한쪽으로 치우치지 않도록, 둘을 항상 같이 가져가려고 의식한다.
