# 회원가입 게이트(Step 1) UI 리디자인

## 1. 개요

회원가입 Role 선택 게이트의 **시각 스타일만** 교체한 작업이다.  
라우팅·`?role=` 전달·`handleSelectRole`·로그인 링크·API 연동은 **무변경**.

---

## 2. 변경 전 / 후

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 카드 배경 | 흰 표면 + 얇은 테두리 | 회색 채움 `#F4F7FA` + `#E1E7EE` 테두리 |
| 정렬 | 좌측 | 중앙 (아이콘·카피·태그·버튼) |
| 아이콘 | 48px 배지, 좌측 | 52px 배지, 상단 중앙, 아이콘 27px |
| 주 액션 | 우측 화살표 + 카드 클릭 | 하단 풀폭 채움 버튼 (`지자체/보험사로 가입하기`) |
| 제목·부제 | 좌측, 28px / 15px | 중앙, 19px / 12px |
| 스텝퍼 | 좌측 정렬 | 가로 중앙 |

---

## 3. 건드리지 않은 것

| 항목 | 상태 |
|---|---|
| `navigate(\`${ROUTES.SIGNUP_FORM}?role=${role}\`)` | 동일 |
| `RoleGateCard` props (`role`, `meta`, `onSelect`) | 동일 |
| `ROLE_META` / `UserRole` | 동일 |
| 로그인 `Link` → `/login` | 동일 |
| 회원가입 API·스토어 | 미호출 구간, 변경 없음 |

카드 클릭과 CTA 버튼 모두 기존 `onSelect`를 호출한다. 버튼은 `stopPropagation`으로 이중 navigate를 막는다.

---

## 4. 디자인 판단

| 판단 | 이유 |
|---|---|
| **채워진 박스 + 중앙 정렬 + 하단 버튼** | 얇은 테두리 카드는 “필터 선택”처럼 가볍다. 채움·큰 아이콘·풀폭 CTA로 “여기서 가입이 시작된다”는 무게를 준다. |
| **Role 색은 배지·태그·버튼에만** | 카드 배경은 공통 회색. Teal/Amber를 전면에 깔지 않아 두 유형이 대등하게 보이고, accent는 식별용으로만 쓴다. |
| **설명 `min-height`** | 두 카드 본문 길이가 달라도 CTA 라인이 나란히 맞는다. |

---

## 5. 주요 파일

| 파일 | 역할 |
|---|---|
| `RoleGateCard.tsx` / `.module.css` | 카드 마크업·채움 스타일·CTA |
| `SignupRoleGatePage.tsx` / `.module.css` | 중앙 레이아웃·부제 카피 |
| `tokens.css` | `--color-card-fill`, `--color-border-card`, radius 조정 |
| `AuthTopBar.module.css` | 로고 마크 17×17 |

---

## 6. 문구 줄바꿈 + 여백 조정

- 설명은 `확인하고` / `산출하고` 뒤에서 `<br />`로 2줄 고정 (의미 단위 줄바꿈).
- 카드 padding·요소 간 세로 간격을 늘려 읽기 여유를 줌. 그리드는 `align-items: stretch`로 두 카드 높이 맞춤.
