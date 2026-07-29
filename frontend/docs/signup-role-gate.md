# 회원가입 Step 1 — Role 선택 게이트

## 1. 개요

회원가입의 **1단계**다. 지자체(`ROLE_A`) / 보험사(`ROLE_B`) 중 하나를 고르면, 그 값을 들고 Step 2(`/signup/form`)로 보낸다.

Role별로 입력 항목이 갈린다(지자체: 소속 부서, 보험사: 회사명). 그래서 Role을 먼저 확정한 뒤 그에 맞는 폼을 띄운다.

로그인 전 화면이므로 `ProtectedRoute` / `AppLayout` 바깥에 두고, 자체 네이비 상단바를 쓴다.

> UI 스타일(채워진 박스형) 변경 내역은 [`signup-gate-redesign.md`](./signup-gate-redesign.md) 참고.

---

## 2. 핵심 흐름 (무변경)

| 판단 | 이유 |
|---|---|
| **카드/CTA → 즉시 이동** | `onSelect(role)` → `?role=` 쿼리로 Step 2 진입 |
| **Role을 URL 쿼리로 전달** | 새로고침·뒤로가기에도 값 유지 |
| **`ROLE_META`로 데이터 기반 렌더** | 라벨·설명·태그·아이콘·accent 한곳 관리 |

---

## 3. Role 타입

| 이름 | 내용 |
|---|---|
| `UserRole` | `'ROLE_A' \| 'ROLE_B'` |
| `ROLE_META` | Role별 `label`, `description`, `tags`, `icon`, `accent` |
| `isUserRole()` | 쿼리 문자열 가드 |

---

## 4. 관련 문서

- [게이트 UI 리디자인](./signup-gate-redesign.md)
- [지자체 Step 2](./signup-gov-form.md)
- [보험사 Step 2](./signup-ins-form.md)
