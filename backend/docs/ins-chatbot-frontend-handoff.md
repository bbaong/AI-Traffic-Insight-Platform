# 보험 상담 챗봇 — 프론트 인수인계

> **백엔드 상태:** CLI 챗봇 1차 완료 (`scripts/ins_chatbot.py`)  
> **프론트:** **아직 UI 없음.** 이 문서는 나중에 화면 붙일 때 기준  
> **사용법:** [ins-chatbot.md](./ins-chatbot.md)  
> **기준일:** 2026-08-19

프론트 코드를 이 작업에서 수정하지 않았습니다. 기존 고객관리 화면은 그대로 둡니다.

---

## 0. 지금 동작 방식

```
상담원 질문 (터미널)
    → Gemini function calling
    → Python이 Express REST 호출
    → 결과를 Gemini가 한국어로 정리
```

- Express에 **챗봇 전용 HTTP 라우트는 없습니다.**
- Gemini 키·모델은 **백엔드 `.env`** (`GEMINI_API_KEY`, `GEMINI_MODEL`).
- 고객 범위는 **`INS_CHAT_USER_ID` = `users.user_id` 숫자**. JWT 세션과 무관.

프론트에 넣을 때는 **브라우저에 Gemini 키를 두지 마세요.**

---

## 1. 페이지 목표 (권장)

기존 보험 고객 화면 옆에 **조회 전용 채팅**을 붙이는 방향이 맞습니다.

| # | 요구 | 담당 |
|---|------|------|
| 1 | 고객관리에서 채팅 패널/드로어 열기 | **Frontend** |
| 2 | 로그인 사용자 `userId`로 고객 범위 고정 | Frontend → 백엔드 프록시 |
| 3 | 최근 고객 / 고위험 / 고객 브리핑 질문 | Gemini + 기존 보험 API |
| 4 | 가상 위험도·특약 Q&A (저장 없음) | 기존 `analyze` / `evaluate` |
| 5 | 숨김·상담 저장·PDF는 챗봇에서 제외 | 전원 |

기존 화면 (재사용):

| 경로 | 파일 |
|------|------|
| `/common/customers` | `frontend/src/domains/ins/pages/CustomersPage.tsx` |
| `/dashboard/insurance` | 보험 대시보드 |

고객 목록 API는 이미 프론트가 씁니다.

- `frontend/src/domains/ins/api/customers.ts` → `GET /api/customers?userId=`

챗봇도 **같은 API**를 칩니다. 목록 스키마를 바꾸지 마세요.

---

## 2. 권장 연동 구조

브라우저가 Gemini를 직접 부르지 말고, **백엔드가 한 번 감싸는 것**을 권장합니다.

```
Frontend 채팅 UI
    → POST /api/insurance/chat   (아직 없음 · 추가 시)
    → 서버에서 Gemini + 보험 API
    → { reply, toolCalls? }
```

이유:

- API 키가 프론트 번들에 안 나감
- `userId`는 로그인 세션에서만 주입 (클라이언트가 임의 userId 조작 완화)
- CLI 스크립트와 도구 목록을 맞출 수 있음

1차 CLI만으로 데모할 때는 프론트 작업 **불필요**입니다.

### 2.1 나중에 둘 파일 (제안)

```
frontend/src/domains/ins/
├─ api/insChat.ts                 # POST /api/insurance/chat
├─ components/InsChatPanel.tsx    # 채팅 UI
└─ pages/CustomersPage.tsx        # 패널 슬롯만 (기존 목록 유지)
```

백엔드 (아직 없음):

```
backend/src/
├─ routes/insurance.ts            # POST /chat 추가
└─ services/insChat.service.ts    # 스크립트 도구와 동일 계약
```

Python CLI (`scripts/ins_chatbot.py`)는 데모·검증용으로 남겨도 됩니다.

---

## 3. 기존 API 계약 (프론트가 이미 쓰는 것)

챗봇 도구가 호출하는 REST입니다. **신규 고객 API는 없습니다.**

인증 헤더 없음. `userId` 쿼리 필수 (고객·이력).

`VITE_API_BASE_URL` 기본 `http://localhost:5000`.

### 3.1 고객 목록

```http
GET /api/customers?userId=3
GET /api/customers?userId=3&q=김서연
```

응답 `data[]` 주요 필드:

| 필드 | 용도 |
|------|------|
| `customerId` | 상세 조회 |
| `name` | 표시 |
| `phone` | 프론트는 복호화된 번호. 챗봇 CLI는 마스킹 |
| `lastConsultedAt` | 최근 상담 |
| `lastRiskScore` / `lastRiskGrade` | 고위험 필터 |
| `lastStatus` | `IN_PROGRESS` / `COMPLETED` |
| `lastRegion` | 구·군 |

`lastRiskGrade`: `Low` \| `Moderate` \| `High` \| `Critical`

고위험 전용 쿼리는 **없습니다.** CLI는 목록을 받은 뒤 필터합니다. 데이터가 늘면 `?minScore=&grade=` 추가를 백엔드에 요청하세요.

### 3.2 상담 이력

```http
GET /api/customers/:id/consultations?userId=3
```

`data`: 상담 배열. `customer` 메타가 같이 올 수 있음.

### 3.3 담보 추천

```http
GET /api/consultations/:id/report
```

### 3.4 가상 위험도 (DB 미저장)

```http
POST /api/insurance/analyze
Content-Type: application/json

{ "구군": "동구", "연령대": "30대", "성별": "남", "차종": "승용", "주야": "주간", "노면상태": "건조" }
```

### 3.5 특약 판정 (DB 미저장)

```http
POST /api/discount-riders/evaluate
```

체크리스트 키: `annual_mileage`, `blackbox_mounted`, `safe_driving_score_used`, `fcw_status`, `ldws_status`, `existing_discount_riders`

### 3.6 챗봇에서 호출하지 말 것

| API | 이유 |
|-----|------|
| `PATCH /api/customers/:id/hide` | 삭제에 가까움 |
| `POST /api/consultations/save` | 쓰기 |
| `POST /api/insurance/report-pdf` | 바이너리 |

---

## 4. UI 가이드

### 4.1 빈 상태 / 유도

```text
고객 이름, 고위험, 최근 상담을 물어보세요
```

예시 칩: `최근 상담 5명` · `고위험 고객` · `진행 중 고위험`

### 4.2 답변 표시

- 목록: 이름 · 최근상담일 · 점수 · 등급 · 지역
- 전화번호는 화면에서도 마스킹 권장 (`010-****-1234`)
- 도구 실패(`ok: false` / HTTP 500)는 챗 버블에 원인만 짧게

### 4.3 userId

프론트는 로그인 스토어의 **숫자 `userId`** 를 쓰세요.  
`.env`의 `INS_CHAT_USER_ID`는 **CLI 전용**입니다. 화면 사용자가 바뀌면 로그인한 상담원 ID를 써야 합니다.

---

## 5. 프론트가 할 일 / 안 할 일

**할 일 (UI 붙일 때)**

- 채팅 패널 UX, 메시지 히스토리(세션)
- 로그인 `userId`를 서버 챗 프록시에 전달
- 고객 클릭 시 `get_customer_brief`에 해당하는 질문 프리필

**하지 말 것**

- Gemini 키를 `VITE_` 로 노출
- 고객 목록 API 응답 필드 임의 변경 요청 없이 깨기
- 챗봇에서 hide/save 호출
- CLI 스크립트를 브라우저에서 실행

---

## 6. 검증 체크리스트 (프론트 작업 후)

- [ ] 로그인 A 상담원으로 채팅 → **본인 고객만** 나옴
- [ ] 다른 상담원 로그인 → 목록이 바뀜
- [ ] “위험 점수 높은 고객” → 점수 내림차순
- [ ] 없는 이름 → 지어내지 않고 “없음”
- [ ] analyze/특약은 고객 DB가 안 바뀜
- [ ] 네트워크 탭에 Gemini 키가 없음

CLI 단독 검증은 [ins-chatbot.md](./ins-chatbot.md) 참고.

---

## 7. 알려진 제한

- 고위험·기간 필터는 서버가 아니라 **목록 전체 받은 뒤 필터**
- `google.generativeai` 구 SDK (경고). 모델명은 `.env` `GEMINI_MODEL` (예: `gemini-3.6-flash`)
- DB 복구 중이면 고객 0건 → 빈 답변이 정상
