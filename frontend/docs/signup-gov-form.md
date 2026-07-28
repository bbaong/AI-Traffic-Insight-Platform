# 회원가입 Step 2 — 지자체(ROLE_A) 폼

## 1. 개요

게이트에서 `?role=ROLE_A` 로 진입한 사용자가 **계정 정보 + 소속 부서**를 입력하는 화면이다.  
이 폼은 **ROLE_A 전용**이며, accent는 Teal로 고정한다.  
실제 가입 POST는 하지 않고, 검증 통과 시 `SignupGovPayload`를 `console.log` 한 뒤 `/signup/complete` placeholder로 이동한다.

---

## 2. 파일 구조

```
src/
├─ pages/auth/
│  ├─ SignupGovFormPage.tsx        # ROLE_A Step 2 폼
│  ├─ SignupGovFormPage.module.css
│  ├─ SignupFormEntryPage.tsx      # role 분기 (A=폼 / B=준비중)
│  └─ SignupCompletePage.tsx       # 제출 후 placeholder
├─ components/signup/
│  ├─ FormField.tsx                # label + hint + error/success
│  ├─ IdCheckField.tsx             # 아이디 + 중복확인
│  ├─ SignupStepper.tsx            # Step 2 완료/활성 + 변경 링크
│  └─ RoleIcons.tsx                # check / eye / eye-off 추가
├─ api/signup.ts                   # checkLoginId, fetchDepartments (목업)
├─ types/signup.ts                 # Department, SignupGovPayload
├─ constants/routes.ts             # SIGNUP_COMPLETE
└─ docs/signup-gov-form.md
```

---

## 3. DB 필드 매핑

| 폼 입력 | users 컬럼 | 필수 | 비고 |
|---|---|---|---|
| 아이디 | `login_id` | O | 중복확인 필요 |
| 비밀번호 | `password_hash` | O | 평문 전송, 해시는 서버 |
| 이름 | `name` | O | |
| (게이트) | `role` | O | 항상 `ROLE_A`, 필드 없음 |
| 소속 부서 | `department_id` | O | FK. `org_name`은 ROLE_A에서 NULL |
| 직급·직책 | `position` | X | |
| 이메일 | `email` | X | 값 있을 때만 형식 검증 |
| — | `user_id`, `is_active`, `created_at` 등 | — | 서버 담당, 폼 없음 |

부서는 `departments.department_name`만 셀렉트에 표시. **`contact_phone` 미노출.**

---

## 4. 핵심 설계 판단

| 판단 | 이유 |
|---|---|
| **중복확인 후 아이디 수정 시 확인 상태 리셋** | 확인받은 값과 제출 값이 어긋나면 중복 아이디가 통과할 수 있다. 수정 = 재확인 의무. |
| **`role` 쿼리 검증** | `/signup/form` 직접 진입·북마크·ROLE_B URL로 지자체 폼이 열리는 것을 막는다. 없거나 `ROLE_A`가 아니면 게이트로 보낸다. |
| **대표 연락처(`contact_phone`) 미표시** | 가입에 필요한 건 부서 식별(`department_id`)뿐이다. 연락처는 운영 데이터이며 가입 UX를 복잡하게 만들 뿐이다. |

---

## 5. 검증 규칙 (`canSubmit`)

```
isIdChecked
&& password.length >= 8
&& password === passwordConfirm
&& name.trim() !== ''
&& departmentId !== null
&& (email === '' || isValidEmail(email))
```

| 구분 | 항목 |
|---|---|
| 필수 | 아이디(중복확인 통과), 비밀번호·확인, 이름, 소속 부서 |
| 선택 | 직급·직책, 이메일(비어 있으면 통과) |

비활성 `가입 완료` 아래에는 충족되지 않은 조건을 짧은 문구로 안내한다.

---

## 6. 다음 작업

- 실제 가입 POST API 연동
- 보험사(`ROLE_B`) Step 2 폼
- 가입 성공 화면 정식 구현 (`SignupCompletePage` 교체)
- 부서/중복확인 API를 목업에서 실서버로 교체 (`api/signup.ts` TODO 주석)
