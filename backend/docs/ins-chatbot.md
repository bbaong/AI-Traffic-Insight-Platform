# 보험 상담 챗봇 — 사용 가이드

> **스크립트:** `backend/scripts/ins_chatbot.py`  
> **역할:** Gemini가 Express 보험 API를 호출해 상담원 질문에 답함  
> **프론트:** 1차에서는 **사용하지 않음** (CLI만)  
> **관련:** [프론트 인수인계](./ins-chatbot-frontend-handoff.md)

---

## 1. 무엇을 하나요

상담원이 고객 화면을 뒤지지 않고, 말로 확인할 수 있게 합니다.

| 질문 예 | 실제 동작 |
|---------|-----------|
| 최근 상담 고객 5명 | `GET /api/customers` 후 최근순 |
| 위험 점수 높은 고객 | 같은 목록을 점수·등급으로 필터 |
| 김서연 최근 상담 | 이름 검색 → 상담 이력 |
| 수성구 30대 남 승용차 위험도 | `POST /api/insurance/analyze` (저장 없음) |
| 블랙박스 있으면 특약? | `POST /api/discount-riders/evaluate` (저장 없음) |

**하지 않는 것:** 고객 숨김, 상담 저장, PDF 생성, JWT 로그인 화면.

전화번호는 `010-****-1234` 형태로만 모델에 넘깁니다.

---

## 2. 사전 준비

1. Express 백엔드가 켜져 있어야 합니다.

```bash
cd backend
npm run dev
```

- 주소: `http://localhost:5000`

2. Python 패키지

```bash
pip install google-generativeai python-dotenv
```

(`google-genai` 와는 **다른 패키지**입니다. 현재 스크립트는 `google.generativeai` 를 씁니다.)

3. `backend/.env` — 아래 **세 값**이 필요합니다.

```env
GEMINI_API_KEY=발급받은키
GEMINI_MODEL=gemini-3.6-flash
INS_CHAT_USER_ID=3
BACKEND_URL=http://localhost:5000
```

| 변수 | 설명 |
|------|------|
| `GEMINI_API_KEY` | Google AI Studio 키 |
| `GEMINI_MODEL` | `gemini-2.0-flash` 는 **404**. 사용 가능한 모델명 (예: `gemini-3.6-flash`) |
| `INS_CHAT_USER_ID` | `users.user_id` **숫자만**. 로그인 아이디 문자열이 아님 |
| `BACKEND_URL` | Express 주소. 기본 `http://localhost:5000` |

`INS_CHAT_USER_ID` 확인:

```sql
SELECT user_id, login_id, name, role FROM users;
```

`.env` 올바른 예:

```env
INS_CHAT_USER_ID=3
```

잘못된 예 (500 남):

```env
INS_CHAT_USER_ID=ai_traffic_insight_chatbot
INS_CHAT_USER_ID= 3 user_id
```

이 챗봇은 **프론트 로그인 세션을 쓰지 않습니다.**  
대신 `.env`의 `user_id`로 “어느 상담원의 고객인지”만 지정합니다. 그 상담원이 `registered_by`로 등록한 고객만 조회됩니다.

---

## 3. 실행

`backend` 폴더에서:

```bash
python scripts/ins_chatbot.py
```

한 번만 묻고 종료:

```bash
python scripts/ins_chatbot.py -q "위험 점수 높은 고객 찾아줘"
```

대화 종료: `exit` / `quit` / `q`

호출한 HTTP는 터미널에 이렇게 찍힙니다.

```text
→ GET http://localhost:5000/api/customers?userId=3
```

시작 시 아래가 맞는지 확인하세요.

```text
backend: http://localhost:5000
userId:   3
model:    gemini-3.6-flash
```

---

## 4. 질문 예시

- 최근 상담 고객 5명
- 오늘 또는 최근 7일 상담한 사람
- 위험 점수 70 이상인 고객
- Critical 등급만
- 동구 고위험 찾아줘
- 진행 중인 고위험 고객
- (고객이름) 최근 상담 요약해줘
- 수성구, 30대, 남성, 승용차면 위험도 어때?
- 연 1만 km, 블랙박스 상시녹화면 특약 어떻게 나와?

---

## 5. 도구 ↔ API

| Gemini 도구 | 백엔드 |
|-------------|--------|
| `list_customers` | `GET /api/customers?userId=` |
| `find_high_risk_customers` | 위 목록을 파이썬에서 필터 (전용 API 없음) |
| `get_customer_brief` | `GET /api/customers/:id/consultations?userId=` |
| `get_coverage_report` | `GET /api/consultations/:id/report` |
| `analyze_risk` | `POST /api/insurance/analyze` |
| `evaluate_discount_riders` | `POST /api/discount-riders/evaluate` |

위험 등급 DB 값: `Low` / `Moderate` / `High` / `Critical`

---

## 6. 문제 해결

| 증상 | 원인 | 조치 |
|------|------|------|
| `404 ... gemini-2.0-flash is no longer available` | 모델 폐기 | `.env`에 `GEMINI_MODEL=gemini-3.6-flash` |
| `백엔드에 연결하지 못했습니다` | Express 미실행 | `npm run dev` |
| `userId: 3 user_id` 후 500 | `.env`에 설명 글자가 섞임 | `INS_CHAT_USER_ID=3` 만 |
| `userId: (문자열 login_id)` 후 500 | 숫자가 아님 | `users.user_id` 사용 |
| 고객 0명 | 해당 상담원 고객 없음 / DB 복구 중 | HeidiSQL `customers.registered_by` 확인 |
| `google.generativeai` FutureWarning | 구 SDK | 동작은 가능. 이후 `google-genai` 이전 예정 |

pip 설치 시 tensorflow와 protobuf 버전 경고가 날 수 있습니다. 챗봇 실행과는 별개입니다.

---

## 7. 참고

- 코드: `backend/scripts/ins_chatbot.py`
- env 예시: `backend/.env.example`
- 고객 API: `src/routes/customer.route.ts`, `src/services/customer.service.ts`
- 프론트 연동 시: [ins-chatbot-frontend-handoff.md](./ins-chatbot-frontend-handoff.md)
