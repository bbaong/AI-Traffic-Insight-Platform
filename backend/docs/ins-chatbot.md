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
pip install -r scripts/requirements-chatbot.txt
```

패키지: `google-genai` (`google-generativeai` 구 SDK 아님). requirements 파일은 Windows pip용 **영문 주석만** 사용합니다.

3. `backend/.env` — Gemini 키와 **상담원 로그인**이 필요합니다. 고객 API는 JWT(`requireAuth`)입니다.

```env
GEMINI_API_KEY=발급받은키
GEMINI_MODEL=gemini-3.6-flash
BACKEND_URL=http://localhost:5000
INS_CHAT_LOGIN_ID=프론트와_같은_로그인아이디
INS_CHAT_PASSWORD=비밀번호
```

| 변수 | 설명 |
|------|------|
| `GEMINI_API_KEY` | Google AI Studio 키 |
| `GEMINI_MODEL` | 예: `gemini-3.6-flash` (`gemini-2.0-flash` 는 404) |
| `INS_CHAT_LOGIN_ID` / `INS_CHAT_PASSWORD` | `POST /api/user/login` (`id`, `password`). Access 토큰을 받아 API에 `Authorization: Bearer` 로 붙임 |
| `INS_CHAT_ACCESS_TOKEN` | (선택) 이미 있는 토큰이면 로그인 생략 |
| `INS_CHAT_USER_ID` | (선택) 숫자 `users.user_id`. 비우면 로그인 응답의 `user_id` 사용 |
| `BACKEND_URL` | Express 주소. 기본 `http://localhost:5000` |

로그인 아이디는 `users.login_id` 입니다. `user_id` 숫자를 아이디란에 넣지 마세요.

비밀번호는 `.env`에만 두고 **커밋하지 마세요.**

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
model:    gemini-3.6-flash
  auth: login ok userId=3
userId:   3
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
| `401 인증이 필요합니다` | JWT 없음 | `INS_CHAT_LOGIN_ID` / `INS_CHAT_PASSWORD` 후 재실행. 서버 `requireAuth` |
| `로그인 실패` | 아이디/비번 불일치 | 프론트와 같은 `login_id` |
| 고객 0명 | 해당 상담원 고객 없음 / DB 복구 중 | HeidiSQL `customers.registered_by` 확인 |
| `UnicodeDecodeError: cp949` | requirements 한글 주석 | ASCII `requirements-chatbot.txt` 사용 |
| TensorFlow protobuf 경고 | 구 SDK가 protobuf 5.x로 내림 | `google-genai` + `pip uninstall google-generativeai` |

pip 설치 시 tensorflow와 protobuf 버전 경고가 날 수 있습니다. 챗봇 실행과는 별개입니다.

---

## 7. 참고

- 코드: `backend/scripts/ins_chatbot.py`
- pip: `backend/scripts/requirements-chatbot.txt`
- env 예시: `backend/.env.example`
- 고객 API: `src/routes/customer.route.ts`, `src/services/customer.service.ts`
- 프론트 연동 시: [ins-chatbot-frontend-handoff.md](./ins-chatbot-frontend-handoff.md)
