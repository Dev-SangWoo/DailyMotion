# 데일리모션 프로젝트

데일리모션 프로젝트의 메인 저장소입니다.

## 프로젝트 구조

```
데일리모션_프로젝트/
├── 📜 AGENTS.md           # 1. 우리의 '헌법' (모든 규칙의 중심)
│
├── 🏗️ client/             # 2. 프론트엔드 (React Native)
│   ├── package.json
│   └── src/              # (곧 상세 설계 예정)
│
├── 🌳 server/             # 3. 백엔드 (FastAPI / Monolithic)
│   ├── requirements.txt
│   └── app/              # (모놀리식 서버 코드 위치)
│
└── 🤝 docs/               # 4. 상호 규약 (설계도)
    └── openapi/
        ├── v1.yaml       # (OpenAPI '설계도' 원본)
        └── generated/    # (설계도로 '자동 생성'된 파일들)
```

## 시작하기

### 프론트엔드 (React Native)

```bash
cd client
npm install
npm start
```

### 백엔드 (FastAPI)

```bash
cd server
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 문서

- [AGENTS.md](./AGENTS.md) - 프로젝트 헌법 및 규칙
- [docs/openapi/v1.yaml](./docs/openapi/v1.yaml) - OpenAPI 스펙

