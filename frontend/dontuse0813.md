# 미사용·잔여 파일/폴더 정리 후보 (2026-08-13)

기준: `frontend/`  
방법: `main.tsx` → `AppRouter` import 그래프 + 문자열 경로 참조(`public/`, CSS `url()`) 교차 확인  
제외: `node_modules/`, `dist/`

이 문서는 **오늘 폴더 구조 정리용** 체크리스트다.  
삭제는 아직 하지 않았고, 아래는 조사 결과만이다.

---

## 한줄 요약

| 등급 | 개수 | 의미 |
|---|---|---|
| A. 확실히 안 씀 | 5 | 런타임 영향 없이 삭제 가능 |
| B. 개발/시안·문서 잔여 | 다수 | 의도 확인 후 삭제·보관·이동 |
| C. 위치만 어색 (사용 중) | 몇 개 | 삭제 금지 · 이동만 검토 |
| D. 문서에만 남아 있고 이미 없음 | — | `docs/` 현행화 필요 |

---

## A. 확실히 안 씀 (삭제 추천)

앱 엔트리·라우터·다른 파일에서 **import/참조 없음**.

| 경로 | 이유 | 권장 |
|---|---|---|
| `src/pages/home/FeatureSection.tsx` | `LandingPage` / `pages/home/index.ts`에 미포함. 어디에서도 import 안 함 | 삭제 |
| `src/pages/home/FeatureSection.module.css` | 위 파일만 참조하는 죽은 CSS | 함께 삭제 |
| `src/App.css` | 어떤 파일도 import 안 함. `.map { width/height:100% }`만 있음. `MapCard`는 자체 CSS 사용 | 삭제 |
| `src/index.css` | `main.tsx`는 `./styles/index.css`만 import. 루트 `index.css`는 중복 레거시 | 삭제 |
| `landingexample.html` | Vite 엔트리 아님. 독립 HTML 시안. 앱에서 참조 없음 | 삭제 또는 `docs/examples/`로 이동 |

### A 삭제 시 한 줄 커밋 예시

```
chore: 미사용 FeatureSection·루트 CSS·landingexample 제거
```

---

## B. 개발용 / 의사(pseudo) 잔여 (신중)

| 경로 | 이유 | Safe? | 권장 |
|---|---|---|---|
| `src/pages/dev/DevPolygonPickerPage.tsx` | `AppRouter`에 `/dev/polygon-picker`로 등록. `ROUTES`·사이드바에는 없음. 프로덕션 메뉴 미노출 | careful | 개발 도구로 유지, 또는 prod에서 라우트 제거 |
| `src/pages/dev/DevPolygonPicker.tsx` | 위 페이지만 사용 | careful | 위와 동일 |
| `requirements.txt` | npm 프로젝트인데 pip 스타일 의존성 목록. `package.json`과 중복. 빌드/런타임 미사용 | careful | 팀에서 안 쓰면 삭제, 문서용 관례면 유지 |

---

## C. 사용 중 · 위치만 정리 후보 (삭제 금지)

폴더 구조 정리할 때 **옮기기만** 검토.

| 경로 | 실제 사용처 | 이슈 | 제안 |
|---|---|---|---|
| `src/shared/components/dashboard/GovDashboardPage.module.css` | `domains/gov/pages/GovDashboardPage.tsx` | GOV 페이지 CSS가 `shared/`에 있음 | `domains/gov/pages/` 옆으로 이동 |
| `src/stores/authStore.ts` | 전역 인증 | `shared/stores/`와 루트 `stores/`가 갈라짐 | 장기적으로 `shared/stores/`로 통합 검토 |
| `src/stores/settingsVerifyStore.ts` | SettingsGate / SettingsVerifyPage | 위와 동일 | 위와 동일 |
| `src/shared/stores/districtStore.ts` | GOV·MapCard·Reports | 위치는 적절, 루트 stores와 혼재만 이슈 | stores 정책 통일 시 함께 |

> `src/pages/settings/*`, `src/pages/mypage/*` → **사용 중**. 삭제 대상 아님.

---

## D. 문서에만 남아 있고 디스크에는 이미 없음

`docs/폴더구조.md`, `docs/0731폴더구조.md`, `docs/dashboard-shell.md`, `docs/landing-page.md` 등이 아래를 **아직 있는 것처럼** 적고 있음 → **현행화** 필요.

| 문서에 언급됨 | 현재 상태 |
|---|---|
| `src/api/` | 없음 (도메인별 `domains/*/api/`로 이동 완료) |
| `src/mocks/` | 없음 |
| `signup.bak.ts` / `SignupCompletePage` | 없음 |
| `DashboardShell` / `KpiCard` / `AiSummaryCard` | 없음 |
| `InsDataNoticeFooter` | 없음 |
| `public/favicon.svg`, `icons.svg` | 없음 (`icon_logo.png`만 사용) |
| `vite.svg` / `react.svg` | 없음 |
| `FeatureSection` (랜딩 구성으로 기술) | 파일은 있으나 LandingPage에서 **미사용** → A에서 삭제 권장 |

### 문서 정리 후보 (코드 아님)

| 경로 | 비고 |
|---|---|
| `docs/0731폴더구조.md` | 구 스냅샷. archive 유지 or 삭제 |
| `docs/폴더구조.md` | 기준 문서지만 outdated → **갱신 필수** |
| `docs/dashboard-shell.md` | 없는 컴포넌트 기준 |
| `docs/ins-dashboard-data-notice.md` | 없는 footer 기준 |
| `docs/landing-page.md` | FeatureSection 등 구 구성 |

`docs/README.md`, 현행 API/UI 문서는 유지.

---

## E. Keep 확인 (오해하기 쉬운 것)

| 경로 | 근거 |
|---|---|
| `public/icon_logo.png` | Sidebar / LandingNav / AuthTopBar / `index.html` favicon |
| `src/assets/images/hero-traffic-bg.png` | HeroSection import |
| `src/types/kakao.d.ts` | ambient 전역 타입 (import 없이 필요) |
| `src/vite-env.d.ts` | Vite env 타입 |
| `src/styles/*` | `main.tsx` → `styles/index.css` |
| `src/shared/utils/riskMeta.ts` | PriorityTop3Card |
| `src/domains/ins/utils/riskMeta.ts` | INS 전용 (별도 함수) — 중복처럼 보여도 **둘 다 사용** |
| ROUTES 10개 전부 | AppRouter에 등록됨. orphan 페이지 없음 |

---

## 오늘 정리 추천 순서

1. **A 삭제** — FeatureSection 2파일 + `App.css` + `index.css` (+ 선택: `landingexample.html`)
2. **`requirements.txt`** 필요 여부 팀 확인 후 처리
3. **Dev polygon** — 유지할지 / 라우트만 막을지 결정
4. **위치 이동** — `GovDashboardPage.module.css` → `domains/gov/pages/`
5. **stores 정책** — 루트 `src/stores` vs `shared/stores` 통일 방향만 잡기
6. **`docs/폴더구조.md` 갱신** — 없는 폴더·컴포넌트 언급 제거

---

## 참고: 조사 시 라우터 매핑 (사용 중)

| URL | 화면 |
|---|---|
| `/` | `pages/home/LandingPage` |
| `/login` | `domains/auth/pages/LoginPage` |
| `/signup`, `/signup/form` | SignupRoleGate / SignupFormEntry |
| `/dashboard/gov` | GovDashboardPage |
| `/dashboard/insurance` | InsDashboardPage |
| `/common/customers` | CustomersPage |
| `/common/reports` | ReportsPage |
| `/mypage` | MyPage |
| `/common/settings` | SettingsGate |
| `/dev/polygon-picker` | DevPolygonPickerPage (메뉴 미노출) |

---

*작성: 2026-08-13 · 파일명 `dontuse0813.md`*
