# 지자체 지역비교 페이지 — 백엔드 정리

> 작업 범위: Express + Prisma 백엔드 (GOV 지역비교 API)  
> 기준: 대시보드(`/dashboard/gov`) 기능을 재사용하되, **여러 구 + 대구 평균** 비교가 목적  
> 경로: `AI-Traffic-Insight-Platform/backend`  
> 역할: Backend  
> **프론트 인수인계:** [gov-region-compare-frontend-handoff.md](./gov-region-compare-frontend-handoff.md)

---

## 1. 페이지 요구사항

대시보드를 기반으로 하되, **다른 구와 비교**하는 것이 목적. 기존 구현이 있으면 적극 재사용.

| # | 요구 | 담당 |
|---|---|---|
| 1 | 우측 상단 기간 버튼(`[2025년 4분기~…]`) 삭제 | Frontend |
| 2 | 구별 위험도 비교 지도에서 구 클릭 → 상단 칩에 구 이름 (기본 max 3, 확장 가능) | Frontend |
| 3 | 비교 요약 우측 `[비교하기]` 버튼 + 클릭 전 유도 문구 | Frontend |
| 3-1 | 요약의 「야간사고 높음」「보행자 주의」 등 = 하단 비교 인사이트 요약 | Backend 태그 + Frontend 표시 |
| 4 | 비교 요약·핵심 지표·사고유형·분기 추세에 **대구 평균 고정 포함** | Backend |
| 5 | 구별 상세 비교표 삭제 | Frontend |

유도 문구 예:

```text
지도에서 비교하고 싶은 구를 클릭 후 비교하기 버튼을 눌러주세요
```

---

## 2. 기존 재사용 자산

| 영역 | API / 서비스 | DB |
|---|---|---|
| 지도 색 | `GET /api/prediction/gov-forecasts` | `gov_forecast_runs`, `gov_forecast_districts` |
| 핵심 지표 (구 1 + 시 평균) | `GET /api/gov/comparison/:districtId` → `govComparison.service.ts` | `district_benchmark_metrics` (`district_id=null` = 대구 평균) |
| 인사이트 (구 1) | `GET /api/gov/suggestions/:districtId` → `listSuggestions` | 벤치마크 vs 시 평균 |
| 분기 추세 (구 1) | `GET /api/gov/trend/:districtId` → `listTrend` | `district_monthly_trend` (CSV ETL: `ai/scripts/etl_district_monthly_trend.py`) |
| 사고유형 | API 없음 | `accident_condition_stats` (`dimension=ACCIDENT_TYPE`) |

**갭:** 선택 N개 구 + 대구 평균을 **한 응답**으로 주는 API 없음.

관련 파일:

- `src/services/govComparison.service.ts`
- `src/services/govForecast.service.ts`
- `src/controllers/gov.controller.ts`
- `src/routes/gov.route.ts`
- `src/controllers/prediction.controller.ts` (`getGovForecasts`)

---

## 3. 백엔드 파일·API 제안

기존 GOV 대시보드 네이밍에 맞춤:

| 파일 | 역할 |
|---|---|
| `src/services/govRegionCompare.service.ts` | 다구 비교 조립 |
| `src/controllers/gov.controller.ts` | `getRegionCompareHandler` |
| `src/routes/gov.route.ts` | `GET /region-compare` |

```http
GET /api/gov/region-compare?districtIds=1,3,5
```

- 선택 구 배열 + `cityAvg`(대구 평균) 고정 포함
- 서버 max: **8** (`REGION_COMPARE_MAX_DISTRICTS`), UI 기본 3 권장
- 최신 `gov_forecast` SUCCEEDED 스냅샷 + 최신 benchmark 기준

### 응답 골격

```json
{
  "success": true,
  "data": {
    "meta": {
      "asOf": "2025Q4",
      "forecastLabel": "2026Q1",
      "modelVersion": "...",
      "riskWeights": { "scale": 0.3, "severity": 0.3, "pedestrian": 0.13, "night": 0.13, "signal": 0.14 }
    },
    "cityAvg": {
      "summary": { "riskScore": 50.0, "rank": null, "...": "..." },
      "metrics": { "pedestrianPct": 0, "nightPct": 0, "seriousPct": 0, "signalPct": 0 },
      "accidentTypes": { "차대차": 0, "차대사람": 0, "차량단독": 0 },
      "trend": { "history": [], "forecast": { "isForecast": true } }
    },
    "districts": [
      {
        "districtId": 1,
        "districtName": "중구",
        "summary": { "riskScore": 68.0, "rank": 2, "tags": ["야간사고 높음"] },
        "metrics": {},
        "accidentTypes": {},
        "trend": {},
        "suggestions": []
      }
    ],
    "insights": [{ "key": "...", "text": "..." }]
  }
}
```

프론트 대응(참고): `GovRegionComparePage.tsx`, `govRegionCompare.ts` (api) — 대시보드와 동일 결

---

## 4. 섹션별 현황·방향

### 4.1 비교 요약 → 위험 점수 산정 필요

- UI: 종합 위험도 `/100`, 구 순위, 인사이트 태그
- 현황: Prisma에 전용 risk score 테이블 없음
- 방향:
  - **단기:** `gov_forecast`의 `predicted_share_pct` / `predicted_severe_rate_pct`로 임시 점수·순위
  - **정식:** 위험 점수 산정 모델(+ 저장 테이블) 구현
- 인사이트 태그: 기존 `listSuggestions` 결과를 짧은 라벨로 변형 (예: 야간사고 높음)

### 4.2 핵심 지표 비교 → CSV 하드코딩 비추천

- UI: 보행자·야간·중상이상·신호위반 % 막대, **대구 평균 포함**
- 현황: `district_benchmark_metrics`에 구별 + 시 평균(`district_id=null`) **이미 존재**
- 방향: 기존 `getComparisonByDistrictId`를 **다구 batch**로 확장
- **CSV 하드코딩하지 말 것** (중복·갱신 리스크)

### 4.3 사고유형 구성 비교 → 대구 평균 부재

- UI: 차대차 / 차대사람 / 차량단독 스택, **대구 평균 행**
- 현황: `accident_condition_stats` (`ACCIDENT_TYPE`)는 있으나 시 평균 API·행 없음
- 방향 (택1 또는 병행):
  1. **백엔드 집계:** 대구 전 구 count 합 → 비율 (빠름, 모델 변경 최소)
  2. **모델/배치 업그레이드:** 시 평균 행을 DB에 적재 (일관성·재현성↑)
- 확인 필요: `dimension_value` 실제 문자열 매핑

### 4.4 분기별 사고 추세 비교 → 대구 평균 부재

- UI: 구별 선 + **대구 평균 선**, 예측 구간 점선
- 현황: 구별 `district_monthly_trend`만 있음
- 방향:
  - 실적: 전 구 합 또는 평균으로 시 시계열 집계 (백엔드)
  - 예측 점선: `gov_forecast` / AI history 연동 여부 결정 필요
- “합” vs “평균” 중 어느 정의인지 확정 필요

### 4.5 비교 인사이트 → 기존 변형

- 현황: `listSuggestions` = 구 vs 대구 평균 규칙 카드
- 방향: 다구 선택 시
  - 구 vs 시 평균 (기존)
  - 선택 구 간 상대 비교 (“야간 비율이 가장 높음” 등)
- 문장 생성: 백엔드 규칙 엔진 권장 (프론트 복붙 방지)

---

## 5. 본인 메모 검토 결과

| 항목 | 판단 | 코멘트 |
|---|---|---|
| 비교 요약 → 위험 점수 모델 필요 | ✅ 맞음 | 단기는 forecast 임시 가능, 장기는 전용 산식/테이블 |
| 핵심 지표 → CSV 하드코딩? | ❌ 비추천 | `district_benchmark_metrics` + 기존 comparison API 재사용 |
| 사고유형 → 모델 업그레이드로 대구 평균? | 가능, 대안 있음 | 1차는 백엔드 집계가 빠름 |
| 분기 추세 → 대구 평균 없음 | 동일 | 1차 백엔드 집계 + 예측선 소스 확정 |
| 비교 인사이트 → 기존 변형 | ✅ 좋음 | suggestions를 다구·상대 비교로 확장 |

**권장 결론**

| 항목 | 결론 |
|---|---|
| 위험 점수 | 모델/테이블 필요 (단기는 forecast 임시 가능) |
| 핵심 지표 | **DB 재사용**, CSV 하드코딩 ❌ |
| 사고유형 대구 평균 | 1차 백엔드 집계 → 여유 있으면 배치에 시 평균 적재 |
| 분기 추세 대구 평균 | 1차 백엔드 집계 + 예측선 소스 확정 |
| 인사이트 | 기존 suggestions 변형·확장 |

---

## 6. 남은 결정 사항

1. 종합 위험도 `/100` 산식 (`share` / `severe` / 신규 모델?)
2. 사고유형 `dimension_value` 실제 값 매핑
3. 대구 평균 추세 = **합** vs **평균**
4. 예측 구간(점선) 데이터 소스 (`gov_forecast` vs AI history)
5. `districtIds` 서버 max (예: 5~8)
6. 기간 UI 삭제 후 API는 항상 **최신 스냅샷** 기준인지

---

## 7. 구현 순서 (Backend)

1. `GET /api/gov/region-compare` 골격 (다구 + `cityAvg`)
2. 핵심 지표: 기존 benchmark 재사용 (batch)
3. 추세: `district_monthly_trend` 집계 + (선택) forecast
4. 사고유형: `accident_condition_stats` 집계
5. 인사이트: `listSuggestions` 변형
6. 위험 점수: 산식 확정 후 반영

---

## 8. UI ↔ 데이터 매핑 (참고)

| UI 블록 | 주 데이터 |
|---|---|
| 구별 위험도 비교 지도 | `gov-forecasts` (색), 클릭 선택은 프론트 상태 |
| 비교 요약 카드 | 위험 점수·순위 + 인사이트 short tag |
| 핵심 지표 비교 | `district_benchmark_metrics` |
| 사고유형 구성 비교 | `accident_condition_stats` (ACCIDENT_TYPE) |
| 분기별 사고 추세 비교 | `district_monthly_trend` + (예측) forecast/AI |
| 비교 인사이트 | suggestions 규칙 변형 |
| 구별 상세 비교표 | **삭제** — API 불필요 |
