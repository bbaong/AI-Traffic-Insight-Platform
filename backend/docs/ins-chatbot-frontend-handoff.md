# 보험 상담 챗봇 — 프론트 인수인계

> **백엔드 상태:** CLI + **`POST /api/insurance/chat` 완료** (`requireAuth`)  
> **프론트:** **아직 UI 없음.** 이 문서 **2절 API**로 붙이면 됨  
> **사용법 (CLI):** [ins-chatbot.md](./ins-chatbot.md)  
> **기준일:** 2026-08-19

프론트 코드를 이 작업에서 수정하지 않았습니다. 기존 고객관리 화면은 그대로 둡니다.

---

## 0. 지금 동작 방식

**화면용 (프론트가 붙일 API)**

```
프론트 (Access 토큰)
    → POST /api/insurance/chat  { message, history? }
    → Express: JWT userId + Gemini 도구 + DB/기존 서비스
    → { reply, toolCalls }
```

**CLI (데모)** `scripts/ins_chatbot.py` — `.env` 로그인 후 같은 도구를 Python에서 호출.

- Gemini 키는 서버 `.env` (`GEMINI_API_KEY`, `GEMINI_MODEL`). 브라우저에 두지 마세요.
- `userId`는 JWT `sub`만 사용. 클라이언트가 다른 상담원 id를 넣을 수 없습니다.

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

챗봇 HTTP는 목록 REST를 다시 치지 않고 **같은 서비스 함수**를 서버에서 직접 호출합니다. 목록 화면용 REST 스키마는 바꾸지 마세요.

---

## 2. API 계약 (프론트 연동)

인증: 다른 보험 API와 동일. `Authorization: Bearer <accessToken>`  
라우트에 `requireAuth`가 이미 걸려 있습니다.

### 요청

```http
POST /api/insurance/chat
Content-Type: application/json
Authorization: Bearer <accessToken>
```

```json
{
  "message": "위험 점수 높은 고객 찾아줘",
  "history": [
    { "role": "user", "text": "안녕" },
    { "role": "model", "text": "무엇을 도와드릴까요?" }
  ]
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `message` | 예 | 이번 질문. 빈 문자열이면 400 |
| `history` | 아니오 | 직전 대화. `role`: `user` \| `model` \| `assistant`. 텍스트는 `text` 또는 `content`. 서버가 최근 16턴만 사용 |

### 성공 응답 `200`

```json
{
  "success": true,
  "data": {
    "reply": "점수 높은 순으로 …",
    "toolCalls": [
      { "name": "find_high_risk_customers", "args": { "limit": 8 } }
    ]
  }
}
```

| 필드 | 설명 |
|------|------|
| `reply` | 상담원에게 보여줄 한국어 |
| `toolCalls` | 이번 턴에서 Gemini가 호출한 도구 이름·인자 (디버그/칩 표시용). 결과 원문은 없음 |

### 오류

| 상태 | 언제 |
|------|------|
| 400 | `message` 없음 |
| 401 | 토큰 없음/만료 |
| 502 | Gemini 실패 |
| 503 | 서버에 `GEMINI_API_KEY` 없음 |

### 프론트 호출 예 (`insChat.ts` 제안)

```ts
const res = await fetch(`${API_BASE}/api/insurance/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ message, history }),
});
```

`userId`를 body에 넣지 마세요. 서버가 토큰에서 꺼냅니다.

도구 목록은 CLI와 동일: `list_customers`, `find_high_risk_customers`, `get_customer_brief`, `get_coverage_report`, `analyze_risk`, `evaluate_discount_riders`.

구현: `src/services/insChat.service.ts`, `POST /chat` in `src/routes/insurance.ts`.

---

## 3. 기존 API 계약 (프론트가 이미 쓰는 것)

챗봇 도구가 호출하는 REST입니다. **신규 고객 API는 없습니다.**

인증: 고객·상담 REST도 `requireAuth`입니다. 챗봇 `POST /api/insurance/chat`는 토큰만 있으면 되고 `userId` 쿼리는 쓰지 않습니다.

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
- SDK: `google-genai`. 모델명은 `.env` `GEMINI_MODEL` (예: `gemini-3.6-flash`)
- DB 복구 중이면 고객 0건 → 빈 답변이 정상
