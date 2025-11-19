# API Changelog

이 문서는 DailyMotion v1 API의 변경 이력을 기록하기 위한 템플릿입니다.  
각 변경은 날짜 기준으로 정리하고, **프론트엔드에 영향이 있는 스펙 변경**만을 기록합니다.

---

## 2025-11-19

- v1 초기 정의
  - `/api/v1/briefings/commute` – 출근 브리핑 (Logic 1.1/1.2)
  - `/api/v1/briefings/commute-settings` – 출퇴근 설정 저장/조회
  - `/api/v1/context/routes/alternative` – 고신뢰 대안 경로 제안 (Logic 2.2)
  - `/api/v1/context/exceptions/delays` – 구간 지연 감지 (Logic 3.1)
  - `/api/v1/context/taxi/suggest` – 택시 제안 (Logic 3.2)
  - `/api/v1/context/polling/frequency` – 스마트 폴링 빈도 (Logic 4.3)
  - `/api/v1/briefings/transfer-reminder` – 환승 리마인더 (Logic 2.4)
  - `/api/v1/risk-manage/risk-zones`, `/api/v1/risk-manage/report` – 위험 지역/시민 리포트

---

> 이후 변경 시 예시 형식

```md
## 2025-11-20
- `/api/v1/context/exceptions/delays` 응답에 `alert` 필드 추가
  - `alert.show`, `alert.type`, `alert.title`, `alert.description`

## 2025-11-22
- `/api/v1/context/routes/alternative` 응답: `transferTime` 타입을 `number` → `number | null` 로 변경
```

