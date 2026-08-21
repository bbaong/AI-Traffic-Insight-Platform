# 회원가입 Step 2 — 보험사(ROLE_B) 폼

## 1. 개요

게이트에서 `?role=ROLE_B` 로 진입한 사용자가 **계정 정보 + 회사명**을 입력하는 화면이다.  
지자체(`SignupGovFormPage`)와 **대칭 구조**이며, accent는 Amber로 고정한다.  
실제 POST는 하지 않고 `SignupInsPayload`를 `console.log` 한 뒤 `/signup/complete`로 이동한다.

---

## 2. 파일 구조

```
src/
├─ pages/auth/
│  ├─ SignupGovFormPage.tsx        # 지자체 (SignupAccountFields 사용으로 리팩터)
│  ├─ SignupInsFormPage.tsx        # 보험사 (신규)
│  ├─ SignupFormPage.module.css    # 두 폼 공유 셸 (data-accent)
│  └─ SignupFormEntryPage.tsx      # ROLE_A / ROLE_B 분기
├─ components/signup/
│  ├─ SignupAccountFields.tsx      # ★ 계정 정보 공통 섹션
│  ├─ SignupStepper.tsx            # accent prop 추가
│  ├─ FormField / IdCheckField     # accent CSS 변수 상속
├─ types/signup.ts                 # SignupInsPayload
└─ docs/signup-ins-form.md
```

---

## 3. 지자체 폼과의 차이

| 항목 | 지자체 (ROLE_A) | 보험사 (ROLE_B) |
|---|---|---|
| accent | Teal `#0E7C86` | Amber `#D97706` |
| 소속 필드 | 부서 `<select>` (`fetchDepartments`) | 회사명 `<input>` (자유 텍스트) |
| payload 핵심 | `departmentId` | `orgName` |
| 배타 컬럼 | `org_name` = NULL | `department_id` = NULL |
| 계정 정보 | `SignupAccountFields` 공유 | 동일 |

---

## 4. DB 필드 매핑

| 폼 입력 | users 컬럼 | 필수 |
|---|---|---|
| 아이디 | `login_id` | O |
| 비밀번호 | `password_hash` | O (평문 전송, 해시 서버) |
| 이름 | `name` | O |
| (게이트) | `role` = `ROLE_B` | O |
| 회사명·소속 | `org_name` | O (≤100자) |
| — | `department_id` | 항상 NULL |
| 직급·직책 | `position` | X |
| 이메일 | `email` | X |

---

## 5. 핵심 설계 판단

| 판단 | 이유 |
|---|---|
| **`SignupAccountFields` 추출** | 아이디·비밀번호·이름·직급 검증이 양쪽 동일하다. 한곳에서 관리해야 규칙 변경 시 두 폼이 어긋나지 않는다. |
| **`role` 쿼리 검증** | 지자체 URL로 보험사 폼(또는 반대)이 열리는 교차 진입을 막는다. |
| **회사명 = 자유 텍스트** | 보험사 소속은 마스터(`departments`)가 없고 회사·지역본부가 제각각이다. 셀렉트보다 `org_name` 직접 입력이 맞다. |
| **셸 CSS `data-accent`** | 로고·강조 바·배지·제출 버튼·포커스 링이 같은 변수(`--signup-accent`)를 쓴다. 색만 바꾸고 UI는 복붙하지 않는다. |

---

## 6. 다음 작업

- 실제 가입 POST API
- 가입 성공 화면 정식 구현
- 로그인 연동
