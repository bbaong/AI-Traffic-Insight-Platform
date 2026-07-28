# 회원가입 백엔드 연동 보고서

## 1. 개요

회원가입 플로우(아이디 중복 확인 · 부서 목록 · 가입 제출)를 백엔드 API와 연결했다.  
기존에는 폼이 `console.log` 후 완료 페이지로만 이동했으나, 이제 `POST /api/user/create`로 실제 DB 저장까지 이어진다.

| 구분 | 연동 전 | 연동 후 |
|---|---|---|
| 아이디 중복 확인 | GET + `{ available }` (미연동) | `POST /api/user/idCheck` |
| 부서 목록 | `/api/departments` (404) | `GET /api/user/departments` |
| 가입 제출 | `console.log` + 페이지 이동 | `signupGov` / `signupIns` → `POST /api/user/create` |
| 성공 UX | 없음 | 토스트 `가입성공` → 1.2초 후 완료 페이지 |
| 실패 UX | 없음 | 서버 메시지 배너 표시 |

---

## 2. 변경 파일

```
src/
├─ api/
│  └─ signup.ts                         # idCheck · fetchDepartments · signupGov/Ins
├─ components/ui/
│  ├─ Toast.tsx                         # ★ 성공 토스트 (신규)
│  └─ Toast.module.css
├─ pages/auth/
│  ├─ SignupGovFormPage.tsx             # signupGov 연동 · 로딩 · 에러 · 토스트
│  ├─ SignupInsFormPage.tsx             # signupIns 연동 · 로딩 · 에러 · 토스트
│  └─ SignupFormPage.module.css         # .submitError 스타일 추가
└─ docs/
   └─ signup-api-integration.md         # 본 문서
```

백엔드(참고): `user.route.ts`에 `idCheck`, `departments`, `create` 라우트 등록.

---

## 3. API 계약

기본 URL: `VITE_API_BASE_URL` (미설정 시 `http://localhost:5000`)

### 3.1 아이디 중복 확인

| 항목 | 값 |
|---|---|
| Method | `POST` |
| URL | `/api/user/idCheck` |
| Body | `{ "login_id": "입력아이디" }` |

| 응답 | 의미 | 프론트 매핑 |
|---|---|---|
| `200` + `{ success: true, message: "아이디 중복 아님" }` | 사용 가능 | `{ available: true }` |
| `400` + `{ success: false, message: "아이디 중복" }` | 이미 사용 중 | `{ available: false }` |
| 그 외 | 서버/네트워크 오류 | `throw` → UI: "중복확인에 실패했습니다" |

구현: `api/signup.ts` → `checkLoginId()`  
소비: `components/signup/IdCheckField.tsx`

### 3.2 부서 목록 (지자체 전용)

| 항목 | 값 |
|---|---|
| Method | `GET` |
| URL | `/api/user/departments` |

응답 예:

```json
[
  { "department_id": 1, "department_name": "교통정책과 교통안전팀" }
]
```

프론트에서 `departmentId` / `departmentName`(camelCase)으로 변환 후 드롭다운에 바인딩.

구현: `api/signup.ts` → `fetchDepartments()`  
소비: `pages/auth/SignupGovFormPage.tsx`

### 3.3 회원가입

| 항목 | 값 |
|---|---|
| Method | `POST` |
| URL | `/api/user/create` |

**지자체 (`signupGov`)**

```json
{
  "login_id": "...",
  "password": "...",
  "name": "...",
  "role": "ROLE_A",
  "department_id": 1,
  "org_name": null,
  "position": null,
  "email": null
}
```

**보험사 (`signupIns`)**

```json
{
  "login_id": "...",
  "password": "...",
  "name": "...",
  "role": "ROLE_B",
  "department_id": null,
  "org_name": "OO손해보험 대구 수성지역본부",
  "position": null,
  "email": null
}
```

| 응답 | 프론트 처리 |
|---|---|
| `201` + `success: true` | `{ ok: true }` → 토스트 → 완료 페이지 |
| `4xx/5xx` 또는 `success: false` | `{ ok: false, message }` → `.submitError` 배너 |

비밀번호는 **평문**으로 전송한다. 해시는 서버(`bcrypt`)에서 수행.

---

## 4. 가입 제출 UX

### 4.1 상태

| state | 용도 |
|---|---|
| `submitting` | 제출 중 버튼 `가입 중…` + 비활성화 |
| `submitError` | 서버/네트워크 실패 메시지 |
| `showSuccessToast` | 성공 토스트 표시 여부 |

### 4.2 제출 흐름

```
[가입 완료 클릭]
  → submitting = true, submitError = null
  → signupGov(payload) | signupIns(payload)
  → 실패: submitError 표시, submitting = false
  → 성공: showSuccessToast = true
         → 1.2초 후 navigate(SIGNUP_COMPLETE)
         → submitting = false
```

### 4.3 Toast 컴포넌트

- 경로: `components/ui/Toast.tsx`
- props: `message`, `visible`
- 성공 시 메시지: **`가입성공`**
- 화면 하단 중앙 고정, 간단한 fade-in 애니메이션

---

## 5. 화면별 적용

| 페이지 | API 함수 | 비고 |
|---|---|---|
| `SignupGovFormPage` | `fetchDepartments`, `signupGov` | 부서 드롭다운 + `department_id` 전송 |
| `SignupInsFormPage` | `signupIns` | `org_name` 전송, `department_id` = null |

두 폼 모두 `handleSubmit`을 `async`로 변경했으며, 기존 `console.log` + 즉시 이동 로직은 제거했다.

---

## 6. 테스트 체크리스트

### Postman / Network

- [ ] `POST /api/user/idCheck` — 사용 가능/중복 각각 확인
- [ ] `GET /api/user/departments` — 부서 배열 반환
- [ ] `POST /api/user/create` — 지자체·보험사 payload 각각 `201`

### UI

- [ ] 보험사 가입: 중복확인 → 제출 → 토스트 → 완료 페이지
- [ ] 지자체 가입: 부서 선택 → 제출 → 토스트 → 완료 페이지
- [ ] 중복 아이디 가입 시 에러 배너
- [ ] 제출 중 버튼 `가입 중…` 표시

### DB

- [ ] `users` 테이블에 신규 row 생성 확인
- [ ] 지자체: `department_id` 저장 / 보험사: `org_name` 저장

---

## 7. 알려진 제한 · 다음 작업

| 항목 | 상태 |
|---|---|
| 로그인 | [login-api-integration.md](./login-api-integration.md) — 연동 완료 |
| JWT/세션 | 없음 — 가입만 DB 반영 |
| `signup-gov-form.md` / `signup-ins-form.md` | "POST 안 함" 설명 → 본 문서 기준으로 갱신 필요 |
| `signup.bak.ts` | mock 백업 파일, 정리 대상 |

---

## 8. 관련 문서

- [signup-gov-form.md](./signup-gov-form.md) — 지자체 폼 UI·필드
- [signup-ins-form.md](./signup-ins-form.md) — 보험사 폼 UI·필드
- [login-api-integration.md](./login-api-integration.md) — 로그인 백엔드 연동
- [login.md](./login.md) — 로그인 페이지 UI
