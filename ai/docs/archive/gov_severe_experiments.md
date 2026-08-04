# GovGuard 중대사고율 개선 실험

EB prior strength α = 40.0

## 결과 (평가 타깃 = **raw** next 중대사고율)

| 실험 | n_train | n_test | R² | RMSE | MAE(%p) | 지역순위 Spearman |
|------|---------|--------|----|------|---------|-------------------|
| Q_raw | 216 | 69 | 0.6339 | 0.0401 | 3.14 | 0.733 |
| Q_eb | 216 | 69 | 0.5224 | 0.0458 | 3.44 | 0.733 |
| Q_ebFeat_rawY | 216 | 69 | 0.5779 | 0.0431 | 3.29 | 0.633 |
| H_raw | 104 | 34 | 0.3605 | 0.0451 | 3.50 | 0.833 |
| H_eb | 104 | 34 | 0.3885 | 0.0441 | 3.30 | 0.767 |

## 참고: train 타깃 스케일에서의 지표

| 실험 | train 타깃 | R² | MAE(%p) |
|------|------------|----|---------|
| Q_raw | next_severe_raw | 0.6339 | 3.14 |
| Q_eb | next_severe_eb | 0.4698 | 2.34 |
| Q_ebFeat_rawY | next_severe_raw | 0.5779 | 3.29 |
| H_raw | next_severe_raw | 0.3605 | 3.50 |
| H_eb | next_severe_eb | 0.3838 | 2.68 |

## 실험 설명

- **Q_raw**: 분기 집계, 중대율 raw 타깃 (v1.0.1과 동일 계열)
- **Q_eb**: 분기 집계, 중대율 EB 스무딩 타깃으로 학습 → raw로 평가
- **H_raw**: 반기 집계, raw 타깃
- **H_eb**: 반기 집계, EB 타깃 학습 → raw로 평가

실무 판단은 **vs raw** 지표를 우선합니다.

그래프: `docs/figures/gov_severe_experiments/severe_r2_mae.png`
