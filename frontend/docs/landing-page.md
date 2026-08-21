# AI Traffic Insight 랜딩페이지

## 1. 개요

로그인 전 방문자를 위한 서비스 소개 화면이다.  
같은 사고 데이터를 Role(지자체 / 보험사)에 맞게 다르게 보여준다는 가치 제안을 전달하고, 회원가입·로그인으로만 연결한다.

- 경로: `/` (`ROUTES.LANDING`)
- `ProtectedRoute` / `AppLayout` **바깥** — 자체 sticky Nav 사용
- 이번 범위: 랜딩 UI만 (로그인·회원가입 폼은 플레이스홀더)

---

## 2. 파일 구조

```
src/
├─ pages/home/
│  └─ LandingPage.tsx              # 섹션 조립만
├─ components/landing/
│  ├─ LandingNav.tsx               # sticky 상단바
│  ├─ HeroSection.tsx              # 히어로 + 분석 결과 카드
│  ├─ RoleIntroSection.tsx         # GOV / INS 소개 (읽기 전용)
│  ├─ FeatureSection.tsx           # 특징 3개
│  ├─ MetricSection.tsx            # 데이터 기준 지표
│  ├─ CtaSection.tsx               # 가입 / 로그인 CTA
│  ├─ LandingFooter.tsx            # 참고 지표 고지 + 출처
│  ├─ riskDisplay.ts               # 위험도 3중 부호화·바 너비
│  ├─ useFadeInClassName.ts        # 스크롤 페이드인
│  ├─ *.module.css                 # 섹션별 스타일
│  └─ index.ts                     # 배럴 export
├─ mocks/data/
│  └─ govDashboard.mock.ts         # landingHighlight
├─ constants/routes.ts             # LANDING / LOGIN / SIGNUP
├─ styles/
│  ├─ tokens.css                   # 디자인 토큰
│  ├─ global.css                   # 베이스·포커스·smooth scroll
│  └─ index.css
├─ app/
│  ├─ App.tsx                      # BrowserRouter
│  └─ router/AppRouter.tsx         # 랜딩을 ProtectedRoute 밖에 배치
└─ docs/
   └─ landing-page.md              # 본 문서
```

---

## 3. 섹션 구성 (위 → 아래)

| # | 섹션 | 배경 | 앵커 | 자리 이유 |
|---|---|---|---|---|
| 1 | LandingNav | surface | — | 어디서든 가입·로그인·섹션 이동 |
| 2 | HeroSection | surface-alt | — | 첫인상: 가치 제안 + 실제 분석 카드로 증명 |
| 3 | RoleIntroSection | surface | `#intro` | 두 Role의 산출물이 다름을 설명 (선택 UI 아님) |
| 4 | FeatureSection | surface-alt | — | “점수만이 아니라 근거” 차별점 구체화 |
| 5 | MetricSection | surface | `#data` | 분석 단위·갱신 주기 등 신뢰 근거 |
| 6 | CtaSection | navy | — | 유일한 강한 색으로 전환 유도 |
| 7 | LandingFooter | surface | — | 참고 지표 고지 고정 노출 |

흰색 / `#F7F9FB`를 번갈아 섹션 경계를 만들고, CTA만 네이비로 시선을 모은다.

---

## 4. 설계 판단

### Role 선택은 랜딩이 아니라 회원가입에서

랜딩의 Role 카드는 **읽는 용도**다. Role은 회원가입 시 한 번만 고르고, 이후 로그인 시 저장된 Role로 대시보드에 들어간다.  
랜딩에서 고르게 하면 가입 폼과 **중복 입력**이 생기고, “이미 골랐는데 또 고르라”는 UX가 된다. CTA 안내 문구는 “다음에 뭘 하게 될지”만 알려준다.

### 히어로에 일러스트 대신 분석 결과 카드

추상 일러스트는 “AI 분석”을 주장만 한다.  
우선점검 시군구 + Critical 배지 + 요인별 기여도 바를 첫 화면에 두면, **점수가 아니라 근거를 준다**는 차별점을 바로 증명한다. 수치는 `landingHighlight` mock과 대시보드를 맞춘다.

### 배경 교차 + CTA만 네이비

연한 교차 배경은 카드/보더 없이 섹션을 구분한다.  
CTA만 `#0F1B2D`로 두면 페이지 전체에서 “지금 시작”이 한 군데로 모인다. 전 구간을 네이비로 칠하면 피로도가 커지고 히어로 카드의 정보 밀도가 묻힌다.

---

## 5. 디자인 토큰

`src/styles/tokens.css` — 컴포넌트는 hex 직접 사용 대신 변수 참조.

| 변수 | 용도 |
|---|---|
| `--color-navy` | CTA 배경 |
| `--color-teal` | Primary, 지자체 액센트 |
| `--color-amber` / `--color-amber-text` | 보험사 액센트 |
| `--color-red` | Critical 배지 |
| `--color-ink` / `--color-body` / `--color-hint` | 텍스트 계층 |
| `--color-surface` / `--color-surface-alt` | 교차 배경 |
| `--color-border` / `--color-border-light` | 카드·Nav 보더 |
| `--radius-card` / `--radius-button` | 8px / 6px |
| `--font-sans` | Pretendard |

weight는 **400 / 500만** 사용. 숫자는 `font-variant-numeric: tabular-nums`.

---

## 6. 도메인 규칙 반영

| 규칙 | 반영 |
|---|---|
| 지역 최소 단위 = 시군구 | 히어로 예시 `대구광역시 수성구`. 도로·교차로명 없음 |
| 위험도 색 단독 금지 | `⚠` + `Critical` + 빨간 배지 배경을 항상 병기 (`riskDisplay.ts`) |
| 참고 지표 고지 | `LandingFooter`에 고정: 행정·보험료·인수 직접 근거 아님 + TAAS·공공데이터포털 출처 |

---

## 7. 남은 작업

이번 범위에서 **제외**된 것:

- 로그인 / 회원가입 실제 폼·검증·Role 선택 UI
- 인증 후 Role별 대시보드 연동 (`ProtectedRoute`, `AppLayout`)
- `landingHighlight`의 실제 API 연동 (현재 mock)
- 로그인 후 화면용 `components/layout/`, `components/dashboard/` 작업
