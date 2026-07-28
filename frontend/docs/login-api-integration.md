# 로그인 백엔드 연동 보고서

## 1. 개요

로그인을 백엔드 API·DB와 연결했다.  
기존 `MOCK_USERS` 목업 대신 `POST /api/user/login`으로 인증하고, 성공 시 `authStore`에 사용자 정보를 저장한 뒤 역할별 대시보드로 이동한다.

| 구분 | 연동 전 | 연동 후 |
|---|---|---|
| 인증 | `mocks/users.mock.ts` 평문 비교 | `POST /api/user/login` (서버 bcrypt 검증) |
| 사용자 정보 | 목업 `userId`, `name`, `role` | DB `data.user_id`, `name`, `role` |
| `LoginPage` | 변경 없음 (`login()` 호출 유지) | 동일 |

---

## 2. 변경 파일

```
src/
├─ api/
│  └─ auth.ts                    # login() 실 API 연동 (목업 제거)
├─ pages/auth/
│  └─ LoginPage.tsx              # 변경 없음 (기존 분기·잠금 로직 재사용)
├─ stores/authStore.ts           # 변경 없음
├─ types/auth.ts                 # 변경 없음
└─ docs/
   ├─ login-api-integration.md   # 본 문서
   └─ login.md                    # UI·흐름 문서 (목업 설명 갱신)
```

백엔드(참고): `user.route.ts` → `POST /login` → `loginUsers` (`user.controller.ts`)

---

## 3. API 계약

기본 URL: `VITE_API_BASE_URL` (미설정 시 `http://localhost:5000`)

### 3.1 로그인

| 항목 | 값 |
|---|---|
| Method | `POST` |
| URL | `/api/user/login` |
| Body | `{ "id": "로그인아이디", "password": "비밀번호" }` |

> 프론트 폼 필드는 `loginId`이나, 백엔드 body 키는 **`id`** 이다.

### 3.2 성공 응답 (200)

```json
{
  "success": true,
  "message": "로그인 성공",
  "data": {
    "user_id": "20",
    "login_id": "byyannie1",
    "name": "배영영",
    "role": "ROLE_A",
    "department_id": 3,
    "org_name": null,
    "position": "주무관",
    "email": null,
    "is_active": true,
    "last_login_at": null,
    "created_at": "2026-07-28T07:43:45.000Z"
  }
}
```

| 백엔드 `data` | 프론트 `AuthUser` | 비고 |
|---|---|---|
| `user_id` | `userId` | BigInt → JSON 문자열. `Number()` 변환 |
| `name` | `name` | |
| `role` | `role` | `ROLE_A` \| `ROLE_B` 검증 |
| `password_hash` | *(저장 안 함)* | 응답에 포함되어도 스토어에 넣지 않음 |
| `is_active` | `INACTIVE` 판정 | `false`면 로그인 거부 |

프론트 반환: `{ ok: true, user: { userId, name, role } }`

### 3.3 실패 응답 (400 등)

| 서버 상황 | HTTP | 프론트 `LoginResult` | UI 메시지 |
|---|---|---|---|
| 아이디 없음 | `400` | `{ ok: false, reason: 'INVALID' }` | 아이디 또는 비밀번호가 올바르지 않습니다 |
| 비밀번호 불일치 | `400` | `{ ok: false, reason: 'INVALID' }` | 동일 (보안상 메시지 통일) |
| 필수값 누락 | `400` | `{ ok: false, reason: 'INVALID' }` | 동일 |
| `is_active === false` | `200` (현재 백엔드) | `{ ok: false, reason: 'INACTIVE' }` | 비활성화된 계정입니다 |
| 서버 오류 | `500` | `{ ok: false, reason: 'INVALID' }` | 동일 |

아이디 존재 여부를 노출하지 않기 위해 서버의 세부 `message`/`error`는 UI에 그대로 쓰지 않고 `INVALID`로 통일한다.

---

## 4. 로그인 흐름

```
[로그인 클릭]
  → login({ loginId, password })
  → POST /api/user/login { id, password }
  → 실패: INVALID / INACTIVE → LoginPage 에러·잠금 처리
  → 성공: authStore.setUser(user, remember)
         → ROLE_A → /dashboard/gov
         → ROLE_B → /dashboard/insurance
```

### LoginPage에서 유지되는 UX

| 기능 | 설명 |
|---|---|
| `submitting` | 버튼 `로그인 중…` |
| INVALID 5회 | 프론트 10분 잠금 |
| 로그인 상태 유지 | `remember` → localStorage / sessionStorage |

---

## 5. 구현 요약 (`api/auth.ts`)

```ts
// 요청
POST ${API_BASE}/api/user/login
body: { id: payload.loginId, password: payload.password }

// 성공 매핑
userId: Number(data.user_id)
name: data.name
role: data.role  // ROLE_A | ROLE_B 검증

// 실패
400/500 또는 success !== true → INVALID
is_active === false → INACTIVE
```

---

## 6. 테스트 체크리스트

### Postman

- [ ] `POST /api/user/login` — 가입 계정으로 `200` + `data`
- [ ] 잘못된 비밀번호 — `400`
- [ ] 없는 아이디 — `400`

### UI

- [ ] 가입한 계정 로그인 → 역할별 대시보드 이동
- [ ] 틀린 비번 → 통일 에러 메시지
- [ ] 5회 실패 → 10분 잠금
- [ ] 새로고침 후 로그인 상태 유지(remember 체크 시)

### Network

- [ ] Request body에 `id`, `password` 키 확인
- [ ] Response의 `password_hash`가 localStorage에 저장되지 않음

---

## 7. 알려진 제한 · 다음 작업

| 항목 | 상태 |
|---|---|
| JWT / 세션 토큰 | 없음 — 클라이언트에 `AuthUser` JSON만 저장 |
| `user_login_logs` · `last_login_at` | 백엔드 미구현 (`LoginPage` TODO 주석) |
| 비활성 계정 서버 차단 | 백엔드가 성공 응답을 주는 경우, 프론트에서 `is_active` 검사 |
| 로그인 응답 `password_hash` 제거 | 백엔드 개선 권장 |
| `mocks/users.mock.ts` | 로그인 미사용 — 정리 대상 |

---

## 8. 관련 문서

- [login.md](./login.md) — 로그인 페이지 UI·설계
- [signup-api-integration.md](./signup-api-integration.md) — 회원가입 연동 (선행 작업)
