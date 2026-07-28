# 대시보드 공용 Shell

## 1. 개요

GOV·INS 대시보드가 **같은 4층 그리드**를 쓴다.  
목적은 (1) 같은 플랫폼이라는 인상, (2) 레이아웃을 한곳에서만 고치게 하는 유지보수다.  
내용은 페이지가 slot으로 주입하고, Shell은 위치를 모른다.

---

## 2. 파일 구조

```
src/
├─ components/dashboard/
│  ├─ DashboardShell.tsx   # ★ 유일한 레이아웃 소스 (KPI + 1.9:1 ×2)
│  ├─ KpiCard.tsx
│  ├─ MapCard.tsx          # 회색 placeholder (지도 자리 예약)
│  ├─ AiSummaryCard.tsx
│  └─ DashboardCard.tsx    # 제목 + children 래퍼
├─ components/layout/
│  ├─ Header.tsx
│  └─ Sidebar.tsx
├─ layouts/AppLayout.tsx
├─ pages/gov/GovDashboardPage.tsx
├─ pages/insurance/InsDashboardPage.tsx
├─ mocks/data/govDashboard.mock.ts
├─ mocks/data/insDashboard.mock.ts
├─ types/dashboard.ts
├─ constants/sidebarMenus.ts
└─ docs/dashboard-shell.md
```

| 계층 | 책임 |
|---|---|
| Shell | 그리드·간격·비율만 |
| 카드 | props 데이터 표시 (role 모름) |
| 페이지 | mock → slot 조립 |
| AppLayout | Sidebar + Header + Outlet |

---

## 3. 핵심 설계 판단

| 판단 | 이유 |
|---|---|
| **레이아웃은 DashboardShell 하나** | 복붙하면 GOV만 gap을 바꾸고 INS는 남는 식으로 어긋난다. |
| **Shell·카드에 role 분기 없음** | slot 주입이면 내용이 바뀌어도 틀은 그대로다. Shell이 Role을 알면 결합도가 커진다. |
| **MapCard = placeholder** | 다음 단계에서 카카오맵을 넣을 **정확한 자리·비율**을 먼저 확정한다. |
| **accent 절제** | Teal/Amber는 배지·활성 바·강조 바에만. 화면 전체를 물들이면 "다른 제품"처럼 보인다. |

---

## 4. GOV vs INS

| | GOV | INS |
|---|---|---|
| **동일** | Shell 그리드, KPI×4, Map\|AI, Bottom 1.9:1, 카드 radius/gap | 동일 |
| KPI 내용 | 사고 건수·중상·위험 시군구·우선점검 | 위험점수·고위험고객·중상확률·지역 |
| Map 제목 | 시군구 위험도 지도 | 지역 위험도 지도 |
| BottomLeft | 우선점검 순위 표 | 고객 프로필 6조건(3×2) |
| BottomRight | 시간대별 사고 | 연령대별 코호트 |
| accent | Teal | Amber |
| Sidebar 전용 | 우선점검, 지역 비교 | 고객 분석, 고객군 비교 |

---

## 5. 다음 작업

- MapCard placeholder 안에 카카오맵 / GeoJSON
- 실제 API 연동 (목업 교체)
- 상세 패널·리포트 모달
- Sidebar 하위 경로 페이지 구현
