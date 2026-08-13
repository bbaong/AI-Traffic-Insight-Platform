# 지자체 지역비교 — 프론트 인수인계

> **백엔드 상태:** API 1차 완료 · Postman 검증 완료 (200 OK)  
> **관련 문서:** [gov-region-compare.md](./gov-region-compare.md), [ai/docs/gov_region_compare_plan.md](../../ai/docs/gov_region_compare_plan.md)  
> **기준일:** 2026-08-13

---

## 0. 검증 결과 (백엔드)

| 항목 | 결과 |
|------|------|
| `GET /api/prediction/gov-forecasts` | ✅ 200 — 지도용 스냅샷 OK |
| `GET /api/gov/region-compare?districtIds=7,6,5` | ✅ 200 — `meta` / `cityAvg` / `districts` / `insights` 정상 |

인증 없음. `VITE_API_BASE_URL` 기본 `http://localhost:5000`.

---

## 1. 페이지 목표

대시보드(`/dashboard/gov`)를 기반으로 **여러 구를 선택해 비교**하는 페이지.

| # | 요구 | 담당 |
|---|------|------|
| 1 | 우측 상단 기간 버튼 삭제 | **Frontend** |
| 2 | 지도에서 구 클릭 → 상단 칩에 이름 (UI 기본 max **3**, 서버 max **8**) | **Frontend** |
| 3 | 비교 요약 우측 `[비교하기]` + 클릭 전 유도 문구 | **Frontend** |
| 3-1 | 요약 태그 = 인사이트 요약 (`summary.tags`) | Backend 제공 · Frontend 표시 |
| 4 | 비교 요약·핵심 지표·사고유형·추세에 **대구 평균(`cityAvg`) 고정** | Backend 제공 · Frontend 렌더 |
| 5 | 구별 상세 비교표 **삭제** | **Frontend** |

유도 문구:

```text
지도에서 비교하고 싶은 구를 클릭 후 비교하기 버튼을 눌러주세요
```

---

## 2. 권장 파일 구조 (프론트)

대시보드와 동일 결로 맞출 것.

```
frontend/src/domains/gov/
├─ pages/GovRegionComparePage.tsx      # 신규 페이지
├─ api/govRegionCompare.ts             # fetch + 타입
├─ components/…                        # 카드별 컴포넌트 (선택)
```

라우트 예:

- `ROUTES.DASHBOARD_GOV_COMPARE = '/dashboard/gov/compare'` (또는 팀 네이밍)
- `AppRouter` + `SIDEBAR_MENUS` ROLE_A에 「지역비교」 메뉴 추가

재사용 권장:

| 기존 | 용도 |
|------|------|
| `MapCard` | 구별 위험도 비교 지도 |
| `fetchGovForecasts` / `severeRateToMapLevel` | 지도 색 (클릭 전·칩 선택과 분리) |
| `DAEGU_DISTRICTS` | 이름 ↔ code / districtId 매핑 |
| `ComparisonCard` 스타일 | 핵심 지표 막대 UI 참고 |

---

## 3. API 계약 (메인)

### 3.1 요청

```http
GET /api/gov/region-compare?districtIds=7,6,5
```

| Query | 설명 |
|-------|------|
| `districtIds` | 필수. 쉼표 구분. 정수, 중복 제거. **1~8개** |

**호출 타이밍:** 칩에 구를 모은 뒤 **`[비교하기]` 클릭 시 1회**.  
지도 클릭만으로는 이 API를 호출하지 말 것 (선택 상태만 프론트에서 관리).

### 3.2 성공 응답 (200)

```ts
{
  success: true;
  data: {
    meta: RegionCompareMeta;
    cityAvg: RegionCompareEntity;   // 대구 평균 (항상 포함)
    districts: RegionCompareDistrict[]; // 요청 순서 기준
    insights: RegionCompareInsight[];
  };
}
```

### 3.3 타입 스케치 (복붙용)

```ts
export interface RegionCompareMeta {
  asOf: string;                    // 예: "2025Q4"
  forecastLabel: string | null;    // 예: "2026Q1"
  modelVersion: string;
  benchmarkPeriodEnd: string;      // ISO
  benchmarkCalculatedAt: string;
  accidentTypePeriodEnd: string | null;
  riskWeights: {
    scale: number;
    severity: number;
    pedestrian: number;
    night: number;
    signal: number;
  };
  maxDistricts: number;            // 8
}

export interface ComparisonMetrics {
  pedestrianPct: number;
  nightPct: number;
  seriousPct: number;
  signalPct: number;
  pedestrianCount: number;
  nightCount: number;
  seriousCount: number;
  signalCount: number;
  totalCount: number;
}

export interface AccidentTypeMix {
  차대차: number;      // %
  차대사람: number;
  차량단독: number;
}

export interface TrendPoint {
  quarterLabel: string;   // 예: "2025-Q3"
  total: number;
  seriousAbove: number | null;
  isForecast: boolean;
}

export interface RegionCompareSummary {
  riskScore: number;              // 0~100
  rank: number | null;            // cityAvg는 null
  rankTotal: number;              // 예: 9
  tags: string[];                 // 예: ["야간사고 높음"]
  predictedAccidentCount: number;
  predictedSharePct: number | null;
  predictedSevereRatePct: number | null;
}

export interface RegionCompareEntity {
  summary: RegionCompareSummary;
  metrics: ComparisonMetrics;
  accidentTypes: AccidentTypeMix;
  trend: {
    history: TrendPoint[];   // isForecast: false
    forecast: TrendPoint;    // isForecast: true — 다음 분기 1점
  };
}

export interface RegionCompareDistrict extends RegionCompareEntity {
  districtId: number;
  districtName: string;
  suggestions: Array<{
    key: string;
    icon: string;
    title: string;
    desc: string;
  }>;
}

export interface RegionCompareInsight {
  districtId: number | null;
  districtName: string | null;
  key: string;
  text: string;
}
```

### 3.4 에러

| Status | 상황 | UI 힌트 |
|--------|------|---------|
| 400 | `districtIds` 없음/형식 오류, 9개 이상 | 칩 개수·선택 안내 |
| 404 | forecast/benchmark 없음, 잘못된 id | 「데이터 준비 중」 |
| 500 | 서버 오류 | 재시도 |

응답: `{ success: false, message: string }`

---

## 4. UI 블록 ↔ 데이터 매핑

| UI | 데이터 | 비고 |
|----|--------|------|
| 상단 칩 | 프론트 로컬 state (`districtId` + 이름) | API 호출 전 |
| 구별 위험도 비교 지도 | `GET /api/prediction/gov-forecasts` | 색칠용. 클릭 → 칩 추가/제거 |
| 비교 요약 카드 | `districts[].summary` + **`cityAvg.summary`** | `riskScore`, `rank`/`rankTotal`, `tags` |
| 핵심 지표 비교 | `districts[].metrics` + `cityAvg.metrics` | 보행·야간·중상·신호 % |
| 사고유형 구성 | `districts[].accidentTypes` + `cityAvg.accidentTypes` | 스택 100% |
| 분기별 추세 | `trend.history` + `trend.forecast` | 실선=history, 점선=forecast 1점 |
| 비교 인사이트 | `insights[].text` | 구별 + 상대 비교 문장 |
| 기간 버튼 | — | **만들지 않음 / 삭제** |
| 구별 상세 비교표 | — | **삭제** |

차트 시리즈 구성 예:

1. 선택 구 N개  
2. **항상** `대구 평균` (`cityAvg`) 한 줄/한 막대  

---

## 5. 프론트 플로우

```
1. 페이지 진입
   └─ gov-forecasts 로딩 → 지도 색
   └─ 비교 영역: 유도 문구만 표시 (API 미호출)

2. 지도 클릭
   └─ 칩에 구 추가 (이미 있으면 제거 권장)
   └─ UI max 3 초과 시 toast / 무시 (서버는 8까지 허용)

3. [비교하기] 클릭
   └─ GET /api/gov/region-compare?districtIds=…
   └─ 로딩 → cityAvg + districts + insights 렌더

4. 칩 변경 후 다시 비교하려면 [비교하기] 재클릭
```

---

## 6. districtId 참고 (대구)

Postman 검증 시 사용한 예: `7,6,5`.

전체 ID는 아래로 확인:

```http
GET /api/prediction/gov-forecasts
```

응답 `data.districts[].districtId` / `지역`.

또는 DB:

```sql
SELECT district_id, district_name FROM districts WHERE is_active = 1;
```

이름 → id 매핑은 `gov-forecasts` 결과 또는 `districts` 테이블을 소스로 둘 것.  
(`DAEGU_DISTRICTS`의 code와 DB `district_id`가 다를 수 있으니 **이름 또는 forecast의 districtId**를 쓰세요.)

---

## 7. 지도 API (보조)

비교 API와 별개. 지도 색·클릭용.

```http
GET /api/prediction/gov-forecasts?freq=Q
```

- 대시보드와 동일 패턴 재사용 가능  
- 지역비교에서는 **기간 선택 UI 없음** → 항상 최신 스냅샷

---

## 8. 백엔드가 이미 해준 것 / 프론트가 할 것

### Backend (완료)

- 다구 + `cityAvg` 한 응답
- 종합 위험도 가중합 (`meta.riskWeights`)
- 사고유형 % (차대차/차대사람/차량단독) + 시 구성
- 추세 시 평균(구 건수 **평균**) + forecast 1점
- 인사이트 문장·요약 태그

### Frontend (할 일)

- 페이지·라우트·사이드바
- 지도 클릭 ↔ 칩 (max 3 UX)
- `[비교하기]` / 유도 문구
- `cityAvg`를 모든 차트·요약에 **고정 시리즈**로 그림
- 기간 버튼·상세 비교표 제거
- (선택) `meta.asOf` / `forecastLabel`을 작은 캡션으로 표시

---

## 9. fetch 예시

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export async function fetchRegionCompare(districtIds: number[]) {
  const q = districtIds.join(',');
  const res = await fetch(
    `${API_BASE}/api/gov/region-compare?districtIds=${encodeURIComponent(q)}`,
  );
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? '지역비교 조회 실패');
  }
  return json.data;
}
```

---

## 10. 문의 시 참고 파일 (Backend)

| 파일 | 역할 |
|------|------|
| `src/services/govRegionCompare.service.ts` | 조립·점수·유형·추세 |
| `src/controllers/gov.controller.ts` | `getRegionCompareHandler` |
| `src/routes/gov.route.ts` | `GET /region-compare` |

가중치·태그 문구 변경은 백엔드 `RISK_WEIGHTS` / `TAG_BY_SUGGESTION_KEY`만 수정하면 됨.
