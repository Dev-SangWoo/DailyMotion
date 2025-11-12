# Path Optimize Module Tests Guide

> **위치**: `server/app/modules/path_optimize/tests/`
> **목적**: path_optimize 모듈의 모든 테스트 관리 및 실행

---

## 📋 테스트 파일 목록

| 파일명 | Phase | 내용 | 테스트 수 | 상태 |
|--------|-------|------|---------|------|
| `test_commute_settings_validation.py` | 1.1 | 사용자 설정 데이터 모델 검증 | 30개 | ✅ 모두 통과 |
| `test_logic_1_1.py` | 2 | Logic 1.1 능동적 출발 알림 | 1개 | 🟡 진행 중 |

---

## 🚀 빠른 시작

### 1️⃣ 전체 테스트 실행

```bash
# 프로젝트 루트에서 실행
cd /Users/juhoseok/Desktop/dailyMotion

# 가상환경 활성화
source venv/bin/activate

# path_optimize 모든 테스트 실행
python -m pytest server/app/modules/path_optimize/tests/ -v
```

**결과**: ✅ 31 passed

---

## 🔍 구체적인 테스트 실행 방법

### 1️⃣ **특정 파일만 테스트**

```bash
# Phase 1.1 테스트만 실행
python -m pytest server/app/modules/path_optimize/tests/test_commute_settings_validation.py -v

# Phase 2 테스트만 실행
python -m pytest server/app/modules/path_optimize/tests/test_logic_1_1.py -v
```

---

### 2️⃣ **특정 테스트 클래스만 실행**

```bash
# CommuteSettings 검증 테스트만
python -m pytest server/app/modules/path_optimize/tests/test_commute_settings_validation.py::TestCommuteSettingsValidation -v

# SystemMode Enum 테스트만
python -m pytest server/app/modules/path_optimize/tests/test_commute_settings_validation.py::TestSystemModeDefinition -v

# Logic 1.1 서비스 테스트만
python -m pytest server/app/modules/path_optimize/tests/test_logic_1_1.py::TestPathOptimizeService -v
```

---

### 3️⃣ **특정 테스트 하나만 실행**

```bash
# CommuteSettings 완전한 객체 생성 테스트만
python -m pytest server/app/modules/path_optimize/tests/test_commute_settings_validation.py::TestCommuteSettingsValidation::test_commute_settings_complete_valid_object -v

# Logic 1.1 GO_NOW 테스트만
python -m pytest server/app/modules/path_optimize/tests/test_logic_1_1.py::TestPathOptimizeService::test_get_commute_briefing_logic_1_1_go_now -v
```

---

## 📊 다양한 출력 옵션

### **간단한 출력** (테스트 결과만 보기)
```bash
python -m pytest server/app/modules/path_optimize/tests/ -q
```

### **상세한 출력** (각 단계별 정보 보기)
```bash
python -m pytest server/app/modules/path_optimize/tests/ -vv
```

### **실패한 테스트만 보기**
```bash
python -m pytest server/app/modules/path_optimize/tests/ --tb=short
```

### **테스트 실행 시간 포함**
```bash
python -m pytest server/app/modules/path_optimize/tests/ -v --durations=10
```

### **커버리지 확인** (어떤 코드가 테스트되는지)
```bash
python -m pytest server/app/modules/path_optimize/tests/ --cov=app.modules.path_optimize
```

### **특정 키워드로 필터링**
```bash
# "validation"이 포함된 테스트만
python -m pytest server/app/modules/path_optimize/tests/ -k validation -v

# "enum"이 포함된 테스트만
python -m pytest server/app/modules/path_optimize/tests/ -k enum -v
```

---

## 📝 테스트 개발 시 유용한 명령어

### **실패한 것만 재실행**
```bash
# 마지막 실패 테스트만
python -m pytest server/app/modules/path_optimize/tests/ --lf

# 실패한 것, 그 다음 통과한 것
python -m pytest server/app/modules/path_optimize/tests/ --ff
```

### **중단점(breakpoint) 사용**
```bash
# pdb 디버거와 함께 실행
python -m pytest server/app/modules/path_optimize/tests/ -v --pdb

# 실패했을 때만 디버거 시작
python -m pytest server/app/modules/path_optimize/tests/ -v --pdb-trace
```

### **테스트 스킵**
```bash
# 특정 마크된 테스트 스킵
python -m pytest server/app/modules/path_optimize/tests/ -m skip
```

---

## 🧪 테스트 결과 해석

### ✅ 통과 (PASSED)
```
test_commute_settings_complete_valid_object PASSED [ 3%]
```
→ 테스트가 성공적으로 완료됨

### ❌ 실패 (FAILED)
```
test_commute_settings_complete_valid_object FAILED [ 3%]
AssertionError: assert settings.homeAddress == "..."
```
→ assertion 검증 실패

### ⏭️ 스킵 (SKIPPED)
```
test_new_feature SKIPPED [ 3%]
```
→ 테스트가 실행되지 않음 (준비 중)

### ⚠️ 경고 (WARNING)
```
PydanticDeprecatedSince20: Support for class-based `config` is deprecated
```
→ 코드는 작동하지만 미래 버전에서 문제가 될 수 있음

---

## 🔧 자주하는 문제 해결

### 문제: `ModuleNotFoundError: No module named 'app'`

**원인**: 잘못된 디렉토리에서 실행

**해결**:
```bash
# ❌ 틀린 방법
cd server/app/modules/path_optimize
pytest tests/

# ✅ 올바른 방법
cd /Users/juhoseok/Desktop/dailyMotion
python -m pytest server/app/modules/path_optimize/tests/ -v
```

---

### 문제: `ImportError: cannot import name 'CommuteSettings'`

**원인**: 가상환경이 활성화되지 않음

**해결**:
```bash
source venv/bin/activate
python -m pytest server/app/modules/path_optimize/tests/ -v
```

---

### 문제: 테스트가 실행되지 않음

**원인**: pytest가 설치되지 않았거나 버전 문제

**해결**:
```bash
# 가상환경 업데이트
pip install --upgrade pytest

# 다시 실행
python -m pytest server/app/modules/path_optimize/tests/ -v
```

---

## 📚 테스트 파일별 상세 가이드

### Phase 1.1: test_commute_settings_validation.py

**테스트 대상**:
- CommuteSettings 모델 검증
- Enum 정의 (SystemMode, TransportType, AlertType)
- Location, RecommendedTransport, BriefingResponse 모델

**실행**:
```bash
python -m pytest server/app/modules/path_optimize/tests/test_commute_settings_validation.py -v
```

**예상 결과**: ✅ 30 passed

---

### Phase 2: test_logic_1_1.py

**테스트 대상**:
- Logic 1.1 출발 알림 (get_commute_briefing)
- OpenAPI 응답 구조 검증

**실행**:
```bash
python -m pytest server/app/modules/path_optimize/tests/test_logic_1_1.py -v
```

**예상 결과**: ✅ 1 passed

---

## 💡 유용한 팁

### 1️⃣ **한 줄 명령어 자주 쓰는 경우 별칭 만들기**

```bash
# ~/.bash_profile 또는 ~/.zshrc에 추가
alias pytest-path-optimize='python -m pytest server/app/modules/path_optimize/tests/ -v'

# 사용
pytest-path-optimize
```

### 2️⃣ **테스트 자동 실행 (파일 변경 감지)**

```bash
# pytest-watch 설치
pip install pytest-watch

# 자동 실행 시작
ptw server/app/modules/path_optimize/tests/
```

### 3️⃣ **CI/CD 파이프라인용 명령어**

```bash
# 상세한 출력과 함께 실행
python -m pytest server/app/modules/path_optimize/tests/ -v --tb=short --color=yes

# 커버리지 리포트 생성
python -m pytest server/app/modules/path_optimize/tests/ --cov=app.modules.path_optimize --cov-report=html
```

---

## 🎯 테스트 체크리스트

테스트를 수행할 때마다 확인하세요:

- [ ] 가상환경이 활성화되었는가? (`source venv/bin/activate`)
- [ ] 프로젝트 루트에서 실행하는가? (`/Users/juhoseok/Desktop/dailyMotion`)
- [ ] pytest가 설치되어 있는가? (`pip install pytest`)
- [ ] 모든 테스트가 통과하는가?
- [ ] 경고 메시지를 확인했는가?
- [ ] TASKS_PATH_OPTIMIZE.md를 업데이트했는가?

---

## 📞 문제 발생 시

1. **전체 테스트 실행해보기**
   ```bash
   python -m pytest server/app/modules/path_optimize/tests/ -v
   ```

2. **가상환경 재시작**
   ```bash
   deactivate
   source venv/bin/activate
   ```

3. **의존성 재설치**
   ```bash
   pip install -r requirements.txt
   ```

4. **로그 확인**
   ```bash
   python -m pytest server/app/modules/path_optimize/tests/ -v --tb=long
   ```

---

**최종 업데이트**: 2025-11-12
**상태**: ✅ Phase 1.1-1.2 완료, Phase 2 진행 중
