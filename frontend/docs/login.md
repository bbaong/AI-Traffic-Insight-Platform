# 로그인 페이지

## 1. 개요

`login_id` + 비밀번호로 접속하는 화면이다.  
**Role 선택 UI는 없다** — 목업/서버가 계정의 `role`을 반환하면 그걸로 대시보드를 분기한다.  
현재는 `mocks/users.mock.ts` + `api/auth.ts`의 `login()` 목업으로 성공/실패를 판정한다.

---

## 2. 파일 구조

```
src/
├─ pages/auth/
│  ├─ LoginPage.tsx                    # 로그인 UI
│  ├─ LoginPage.module.css
│  ├─ GovDashboardPlaceholderPage.tsx  # /dashboard/gov 임시
│  └─ InsDashboardPlaceholderPage.tsx  # /dashboard/insurance 임시
├─ mocks/users.mock.ts                 # 테스트 계정
├─ api/auth.ts                         # login() 목업
├─ stores/authStore.ts                 # Zustand 로그인 상태
├─ types/auth.ts                       # LoginPayload, LoginResult, MockUser
├─ constants/routes.ts                 # DASHBOARD_GOV / DASHBOARD_INS
└─ docs/login.md
```

---

## 3. 목업 데이터

| 아이디 | 비밀번호 | 결과 |
|---|---|---|
| `gov_daegu` | `test1234` | 성공 → `/dashboard/gov` (ROLE_A) |
| `ins_sample` | `test1234` | 성공 → `/dashboard/insurance` (ROLE_B) |
| `inactive` | `test1234` | 실패 `INACTIVE` |

---

## 4. 로그인 흐름

1. 폼 제출 → `login({ loginId, password })`
2. 성공 → `authStore.setUser` → `role`로 `navigate`  
   - `ROLE_A` → `/dashboard/gov`  
   - `ROLE_B` → `/dashboard/insurance`
3. 실패  
   - `INVALID` → 통일 메시지 + 실패 횟수 안내  
   - `INACTIVE` → 비활성 계정 안내  
   - INVALID 5회 → 프론트 10분 잠금(버튼 비활성)
4. `user_login_logs` / `last_login_at` → **서버 몫** (`// TODO` 주석만)

---

## 5. 핵심 설계 판단

| 판단 | 이유 |
|---|---|
| **전체 뷰포트 + 중앙 카드** | 데스크톱 웹 비율. 카드만 좁게(max 400px) 두고 바깥은 `#F7F9FB`. 앱처럼 세로 풀폭 폼은 이 서비스에 맞지 않는다. |
| **INVALID 메시지 통일** | 아이디 존재 여부를 알려주면 계정 열거 공격에 유리하다. |
| **비밀번호 찾기 없음** | DB/정책에 재설정 근거가 없다. 임의 UI를 넣지 않는다. |
| **role은 서버(목업) 반환값만** | 클라이언트가 role을 고르거나 URL에서 읽으면 조작 가능하다. |

---

## 6. 다음 작업

- 실제 `POST /auth/login` 연동
- `user_login_logs` 기록 · `last_login_at` 갱신
- 서버측 계정 잠금 (프론트 카운트는 보조)
- 대시보드 정식 화면 · `ProtectedRoute`
