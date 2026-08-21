# GovGuard — sklearn 점유율(rate) 모델 비교 (B1 + last×2 고정)

> 파이프라인(B1 × 시전체 + `last×2` cap)은 고정하고, **점유율 회귀 알고리즘만** 비교.
> 서빙 구조(B1 vs B2 vs 건수회귀) 비교는 [`gov_compare_b1_b2_v1_0_4.md`](gov_compare_b1_b2_v1_0_4.md) 참고.

## 설정

| 항목 | 값 |
|------|-----|
| split | next∈2024–2025 (train=216, test=69) |
| 후보 | HistGradientBoostingRegressor, RandomForestRegressor, Ridge |
| 최종 KPI | cap 적용 후 **건수** MAE / MAPE / R² / Top-3 |
| 소지역 | `['남구', '중구']` |
| 승자 규칙 | min small-region MAPE, then overall MAE, then Top-3 |

## 전체 (캡 적용 후 건수)

| 모델 | MAE | MAPE% | R² | Top-3 | jump_p95 | share MAE | train(s) |
|------|-----|-------|-----|-------|----------|-----------|----------|
| HistGradientBoostingRegressor | 20.6 | 14.8 | 0.972 | 0.917 | 2.00 | 0.0105 | 1.618 |
| RandomForestRegressor | 19.3 | 14.5 | 0.977 | 0.917 | 2.00 | 0.0101 | 0.32 |
| Ridge ✅ | 15.9 | 7.8 | 0.982 | 0.917 | 1.28 | 0.0062 | 0.008 |

## 소지역

| 모델 | MAE | MAPE% | jump_p95 |
|------|-----|-------|----------|
| HistGradientBoostingRegressor | 18.7 | 14.2 | 1.44 |
| RandomForestRegressor | 19.5 | 14.7 | 1.50 |
| Ridge ✅ | 12.2 | 8.2 | 1.31 |

## 결론

- **수치 승자 (이 실험):** `Ridge` — cap 적용 후 전체·소지역 MAE/MAPE가 가장 낮음.
- **현재 서빙 rate 모델:** `HistGradientBoostingRegressor` (Top-3는 세 후보 모두 0.917로 동일).
- **해석**
  1. `last×2` 캡이 강하면 **알고리즘 격차가 축소**되고, jump 상한(2.0)에 걸린 트리는 건수 KPI에서 Ridge에 밀릴 수 있다.
  2. 그래도 HGBR/RF도 R²≈0.97·MAE≈20으로 **서비스 참고용 적합 구간**이다.
  3. **더 중요한 선정 근거**는 알고리즘이 아니라 파이프라인이다 → [`gov_compare_b1_b2_v1_0_4.md`](gov_compare_b1_b2_v1_0_4.md) (건수 직접회귀 vs B1).
  4. 운영상 HGBR 유지 근거: 기존 pkl·중대/경중 헤드와 동일 스택, Top-3 동등. Ridge로 바꾸려면 재학습·캡 상호작용을 별도 검증해야 한다.

스크립트: `scripts/gov_compare_rate_sklearn.py`
