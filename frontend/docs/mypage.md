# 마이페이지

조회 전용 계정 정보 화면. 지자체·보험사 **한 컴포넌트** 공용. Role 분기는 **accent 색**과 **소속 필드** 두 곳뿐이다.

경로: `/mypage` · `src/pages/mypage/MyPage.tsx`

---

## Role 분기

| | 지자체 (`ROLE_A`) | 보험사 (`ROLE_B`) |
|---|---|---|
| Accent | Teal (`--color-teal-bg` / `--color-teal-text`) | Amber (`--color-amber-bg` / `--color-amber-tint-text`) |
| 배지 | 지자체 (Header) | 보험사 (Header) |
| 소속 라벨 | 소속 부서 | 회사명·소속 |
| 소속 값 | `department_name` | `org_name` |

레이아웃·프로필·계정 카드·하단 메타는 동일.

---

## 이번 수정

| 항목 | 내용 |
|---|---|
| 부서 ID 노출 | `부서 ID N` 제거. 로그인 응답 `department_name` 매핑 + 없으면 `fetchDepartments`로 id 매칭 (임시) |
| 기간 드롭다운 | Header `showPeriod` — GOV 대시보드에서만 표시. 마이페이지에서는 숨김 |
| 역할 행 | 카드에서 제거 (상단 배지와 중복) |
| 최근 로그인 | 하단 메타 한 곳만 |

---

## 서버 의존성

로그인 API(`POST /api/user/login`) 응답에 **`department_name`** 이 있으면 그대로 저장·표시한다.

없으면 프론트가 부서 목록 API로 매칭한다. 권장: 백엔드에서 `departments` join 후 `department_name` 포함.

```
// TODO: 서버 응답에 department_name 추가 필요 (departments join)
```

---

## 다음 작업

- 각 정보 행에 수정 진입점(버튼) 추가
- 수정 API 연동 및 저장 후 authStore 갱신
