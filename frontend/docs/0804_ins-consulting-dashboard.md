# 보험 상담 대시보드

## 1. 작업 개요

보험사(INS) 본문을 **보험 상담 대시보드** 3열 레이아웃으로 재구성했다.  
프로필 위험점수·법규위반은 `predict-ins` 실 API를 사용하고, 체크리스트·맞춤 특약 검토·상담 저장은 타입·async 서비스·목업으로 분리해 두어 이후 API·DB만 교체하면 되도록 했다. 지자체(GOV) 대시보드는 변경하지 않았다.

---

## 2. 생성한 파일 목록

| 경로 | 역할 |
|---|---|
| `src/domains/ins/constants/checklistItems.ts` | 체크리스트 5문항 정의(데이터) |
| `src/domains/ins/constants/tokkStatus.ts` | 특약 상태(권장/확인/제외) 메타·색 |
| `src/domains/ins/types/consulting.ts` | 체크리스트·특약·상담 저장 payload 타입 |
| `src/domains/ins/mocks/tokkReview.mock.ts` | 특약 검토 목업 5종 |
| `src/domains/ins/utils/sleep.ts` | 목업 네트워크 지연 유틸 |
| `src/domains/ins/api/tokkReview.ts` | `fetchTokkReview` (목업 서비스) |
| `src/domains/ins/api/consultation.ts` | `saveConsultation` (목업 저장) |
| `docs/ins-consulting-dashboard.md` | 본 보고 문서 |

> `InsDashboardPage.tsx` / `.module.css`는 기존 파일을 **전면 재작성**했다(아래 수정 목록).

---

## 3. 수정한 파일 목록

| 경로 | 변경 내용 |
|---|---|
| `src/domains/ins/pages/InsDashboardPage.tsx` | 3열 상담 UI(고객·프로필 / 체크리스트 / 특약·메모·저장) + 실예측·목업 연동 |
| `src/domains/ins/pages/InsDashboardPage.module.css` | 3열·카드·세그먼트·특약 리스트 스타일 |
| `src/shared/layouts/AppLayout.tsx` | INS 헤더 제목 → `보험 상담 대시보드` |
| `src/shared/constants/routes.ts` | `REPORTS`, `CUSTOMERS` 상수 추가 |
| `src/shared/constants/sidebarMenus.ts` | ROLE_B 메뉴: 대시보드·고객관리·리포트·마이페이지·설정 (GOV 메뉴 구성은 동일, path만 ROUTES 상수화) |
| `src/mocks/data/govDashboard.mock.ts` | `PriorityRegionRow.accidentCount` 필수 필드 보완(타입 오류 수정, GOV UI 로직 변경 없음) |

---

## 4. 목업 데이터 목록

| 목업 | 위치 | 내용 요약 |
|---|---|---|
| 체크리스트 문항 | `constants/checklistItems.ts` | 5문항(주행거리·블랙박스·안전운전·FCW·LDW). UI는 이 배열을 map |
| 특약 검토 결과 | `mocks/tokkReview.mock.ts` | 5특약: 마일리지/블랙박스/안전운전=RECOMMEND, FCW=CHECK, LDW=EXCLUDE |
| 특약 서비스 | `api/tokkReview.ts` | `sleep(300)` 후 목업 복사 반환. 컴포넌트는 여기만 호출 |
| 상담 저장 | `api/consultation.ts` | `sleep` + `console.info` + mock id. 토스트는 페이지에서 표시 |
| 저장 payload | `types/consulting.ts` → `ConsultationPayload` | 고객·프로필·prediction·체크리스트·메모·특약·savedAt |

---

## 5. 실제 연결 vs 목업

| 기능 | 구분 | 진입점 |
|---|---|---|
| 프로필 위험점수·법규위반 | **실제 API** | `api/prediction.ts` → `POST /api/prediction/predict-ins` |
| 체크리스트 문항 정의 | 프론트 상수(목업 아님, UI 스펙) | `constants/checklistItems.ts` |
| 맞춤 특약 검토 | **목업** | `fetchTokkReview` |
| 상담 대시보드 저장 | **목업** | `saveConsultation` |

---

## 6. 나중에 API·DB 연결 시 교체 지점

| 함수 / 위치 | TODO | 교체 예정 엔드포인트 |
|---|---|---|
| `fetchTokkReview` (`api/tokkReview.ts`) | 체크리스트→특약 매칭 백엔드 연결 | `POST /api/tokk-review` (또는 `/api/consultation/tokk-review`) |
| `MOCK_TOKK_RESULT` (`mocks/tokkReview.mock.ts`) | fixtures 유지 또는 제거 | 응답 `data`를 `TokkResult[]`로 매핑 |
| `saveConsultation` (`api/consultation.ts`) | DB 저장 | `POST /api/consultation` |
| 호출부 (`InsDashboardPage.tsx`) | **변경 불필요** | 서비스 함수 시그니처 유지 |

원칙: 컴포넌트는 `mocks/`를 직접 import하지 않음. 서비스 함수 내부만 교체.

---

## 7. 타입 정의 위치

| 타입 | 파일 |
|---|---|
| `InsPredictRequest` / `InsPredictData` / `ApiResponse` | `types/prediction.ts` |
| `RiskGrade` | `types/prediction.ts` |
| `ChecklistAnswers` / `TokkResult` / `TokkStatus` / `ConsultationPayload` / `CustomerInfo` / `ProfileInput` | `types/consulting.ts` |
| `ChecklistItem` | `constants/checklistItems.ts` |

셀렉트 정본: `constants/insFeatures.ts` (변경 금지).

---

## 8. 건드리지 않은 것

| 대상 | 확인 |
|---|---|
| 지자체 `GovDashboardPage` 및 GOV prediction | 무변경 |
| `DashboardShell` / `MapCard` (GOV 사용) | 무변경 |
| Header 컴포넌트 API(프로필 사진·알림벨 추가 없음) | 무변경. 제목만 AppLayout에서 지정 |
| 로그인·회원가입 플로우 | 무변경 |

---

## 화면·흐름 요약

1. **좌** 고객명·휴대폰 + 4피처 → `분석하기` → predict-ins → 점수·게이지·등급·법규위반 TOP3  
2. **중** 체크리스트 5문항(스텝 없음) → `맞춤 특약 검토하기` → 목업 특약  
3. **우** 특약 결과 + 상담 메모(0/500) → `상담 대시보드 저장` → 목업 저장 + 토스트  

반응형: ≤1200px 2열, ≤800px 1열.
