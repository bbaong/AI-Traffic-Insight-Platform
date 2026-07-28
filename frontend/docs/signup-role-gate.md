# 회원가입 Step 1 — Role 선택 게이트

## 1. 개요

회원가입의 **1단계**다. 지자체(`ROLE_A`) / 보험사(`ROLE_B`) 중 하나를 고르면, 그 값을 들고 Step 2(`/signup/form`)로 보낸다.

Role별로 입력 항목이 갈린다(지자체: 소속 부서, 보험사: 회사명). 그래서 Role을 먼저 확정한 뒤 그에 맞는 폼을 띄운다.  
가입 후 Role 변경이 어려우므로, 이 화면에서 신중히 고르도록 안내한다.

로그인 전 화면이므로 `ProtectedRoute` / `AppLayout` 바깥에 두고, 자체 네이비 상단바를 쓴다.

---

## 2. 파일 구조

```
src/
├─ pages/auth/
│  ├─ SignupRoleGatePage.tsx       # Step 1 게이트 화면
│  ├─ SignupRoleGatePage.module.css
│  └─ SignupFormPlaceholderPage.tsx # Step 2 임시 (정식 폼 아님)
├─ components/signup/
│  ├─ RoleGateCard.tsx             # Role 선택 카드
│  ├─ RoleGateCard.module.css
│  ├─ SignupStepper.tsx            # 1─2 스텝퍼 (Step 2 재사용)
│  ├─ SignupStepper.module.css
│  ├─ RoleIcons.tsx                # tabler 상응 인라인 SVG
│  └─ index.ts
├─ types/signup.ts                 # UserRole, ROLE_META
├─ constants/routes.ts             # SIGNUP, SIGNUP_FORM 추가
├─ styles/tokens.css               # 게이트용 토큰 추가
└─ docs/signup-role-gate.md        # 본 문서
```

---

## 3. 핵심 설계 판단

| 판단 | 이유 |
|---|---|
| **다음 버튼 없이 카드 클릭 즉시 이동** | 고르는 행위가 곧 진행이다. 라디오 선택 → 다음 확인은 한 박자 더 든다. 카드가 2개뿐이라 오선택 비용도 낮고, 잘못 골랐으면 뒤로가기로 Step 1에 돌아올 수 있다. |
| **Role을 URL 쿼리로 전달** (`?role=ROLE_A`) | 새로고침·뒤로가기에도 값이 남는다. Step 2는 `useSearchParams()`로 읽으면 된다. 이 한 값만 넘기는 구간에서는 전역 스토어보다 URL이 더 견고하다. |
| **`ROLE_META`로 데이터 기반 렌더** | 라벨·설명·태그·아이콘·accent를 한곳에 둔다. 카드 2개를 복붙하면 문구·색이 어긋나기 쉽고, 이후 Role 메타 변경도 meta만 고치면 된다. |

---

## 4. Role 타입 정의

| 이름 | 내용 |
|---|---|
| `UserRole` | `'ROLE_A' \| 'ROLE_B'` |
| `ROLE_META` | Role별 `label`, `description`, `tags`, `icon`, `accent` |
| `accent` | `'teal'`(지자체) / `'amber'`(보험사) — CSS 틴트·보더에 매핑 |
| `isUserRole()` | 쿼리 문자열이 유효 Role인지 가드 (Step 2 placeholder에서 사용) |

화면·카드는 문자열 리터럴을 흩뿌리지 않고 위 타입·meta만 참조한다.

---

## 5. 다음 작업

Step 2에서 Role 받기:

```ts
const [params] = useSearchParams();
const role = params.get('role'); // 'ROLE_A' | 'ROLE_B' | null
// isUserRole(role) 로 가드 후 ROLE_META[role] 로 폼 분기
```

아직 미구현:

- Step 2 정보 입력 폼 (Role별 필드)
- 가입 API 연동
- 로그인 화면 정식 구현
- Role 없는 `/signup/form` 접근 시 게이트로 리다이렉트

---

## 6. 디자인 토큰

| 변수 | 용도 |
|---|---|
| `--color-navy` | 상단바 배경 |
| `--color-teal` / `--color-teal-bg` / `--color-teal-text` | 지자체 accent·틴트·틴트 위 텍스트 |
| `--color-amber` / `--color-amber-bg` / `--color-amber-tint-text` | 보험사 accent·틴트·틴트 위 텍스트 |
| `--color-border-strong` | 카드 기본 보더, 화살표 |
| `--color-step-inactive-bg` / `--color-step-inactive-text` | 스텝퍼 비활성 |
| `--radius-role-card` (12px) | Role 카드 |
| `--radius-icon-badge` (9px) | 아이콘 배지 |

weight는 400 / 500만 사용. `@tabler/icons-react`는 미설치 — `RoleIcons.tsx` 인라인 SVG로 동일 아이콘을 쓴다.
