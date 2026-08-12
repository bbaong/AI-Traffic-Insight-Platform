# InsureGuard AI v1.0.3 — 엄격 검증 결과 (A~C)

스크립트: `scripts/archive/validate_ins_v1_0_3.py`  
Test 연도(A/B time): `[2024, 2025]`

## 연도별 행 수

| 연도 | 건수 |
|------|------|
| 2016 | 12,301 |
| 2017 | 12,264 |
| 2018 | 12,496 |
| 2019 | 13,798 |
| 2020 | 12,253 |
| 2021 | 11,525 |
| 2022 | 10,523 |
| 2023 | 10,299 |
| 2024 | 9,672 ← test |
| 2025 | 9,748 ← test |

## 결과 요약

| 실험 | Split | 타깃 | R² | RMSE | MAE | 법규 Acc | 경중 Acc | n_train | n_test |
|------|-------|------|----|------|-----|----------|----------|---------|--------|
| ref_random_full_target | random | full 프로파일 | 0.9668 | 3.62 | 2.43 | 54.6% | 68.0% | 91,903 | 22,976 |
| A_time_full_target | time | full 프로파일 | 0.9681 | 3.55 | 2.14 | 54.1% | 71.2% | 95,459 | 19,420 |
| B_time_trainonly_target | time | train-only 프로파일 | 0.9693 | 3.66 | 2.40 | 54.1% | 71.2% | 95,459 | 19,420 |
| B_random_trainonly_target | random | train-only 프로파일 | 0.9907 | 2.00 | 1.30 | 54.6% | 68.0% | 91,903 | 22,976 |
| C_time_individual_epdo | time | log1p(행 EPDO) | -0.3274 | 0.80 | 0.69 | 54.1% | 71.2% | 95,459 | 19,420 |
| C_random_individual_epdo | random | log1p(행 EPDO) | -0.1853 | 0.80 | 0.69 | 54.6% | 68.0% | 91,903 | 22,976 |

## 그래프

경로: `docs/figures/validation_v1_0_3/`

### 실험 설계(내용) 설명

| 파일 | 내용 |
|------|------|
| `experiment_overview.png` | ref / A / B / C 설계 비교 (Split·타깃·평가) |
| `experiment_questions.png` | 검증 질문 → 실험 매핑 |
| `experiment_A_time_split.png` | A: 연도 time split 타임라인 |
| `experiment_B_trainonly.png` | B: train-only 프로파일 타깃 흐름 |
| `experiment_C_vs_profile.png` | C: 프로파일 타깃 vs 개별 EPDO |

![overview](figures/validation_v1_0_3/experiment_overview.png)

![questions](figures/validation_v1_0_3/experiment_questions.png)

![A](figures/validation_v1_0_3/experiment_A_time_split.png)

![B](figures/validation_v1_0_3/experiment_B_trainonly.png)

![C](figures/validation_v1_0_3/experiment_C_vs_profile.png)

### 결과 수치 그래프

| 파일 | 내용 |
|------|------|
| `dashboard.png` | 4패널 종합 대시보드 |
| `r2_comparison.png` | 실험별 R² (파랑=프로파일, 빨강=개별 EPDO) |
| `rmse_mae_profile.png` | 프로파일 타깃 RMSE / MAE |
| `classification_accuracy.png` | 법규·경중 분류 정확도 |
| `year_counts.png` | 연도별 건수 (test=2024–2025) |

![dashboard](figures/validation_v1_0_3/dashboard.png)

![r2](figures/validation_v1_0_3/r2_comparison.png)

## 실험 설명

- **ref_random_full_target**: 현재 방식: 전체 데이터 프로파일 타깃 + random 80/20
- **A_time_full_target**: Time split train∉[2024, 2025] / test∈[2024, 2025]; 타깃은 전체 기간 프로파일 통계(약한 누수)
- **B_time_trainonly_target**: Time split + 프로파일 통계를 train만 집계 후 test 매핑 (test∈[2024, 2025])
  - test 미지 프로파일 행: 53 / 19,420 (fallback=50.06)
- **B_random_trainonly_target**: Random 80/20 + 프로파일 통계 train-only (누수 제거)
  - test 미지 프로파일 행: 25 / 22,976 (fallback=50.06)
- **C_time_individual_epdo**: Time split; y=log1p(행단위 EPDO); test∈[2024, 2025]
- **C_random_individual_epdo**: Random 80/20; y=log1p(행단위 EPDO)

## 해석 가이드

1. **A (time + full 타깃)**: R² ≈ 0.97로 ref와 유사 → 프로파일→점수 매핑은 **2024–2025에도 잘 재현**됨.
2. **B (train-only 타깃)**: time/random 모두 R²가 여전히 매우 높음(0.97~0.99).  
   test 미지 프로파일 행이 거의 없음(53/19,420) → 같은 입력 조합이 연도를 넘어 반복되고,  
   과제는 여전히 **결정적 스코어카드 재현**에 가깝다.  
   → “전체 통계 누수”만으로는 높은 R²가 설명되지 않으며, **타깃 정의 자체**가 핵심.
3. **C (개별 EPDO)**: R²가 **음수** → 입력 4개로 개별 사고 경중을 맞추는 baseline은 실패.  
   프로파일 모델의 높은 R²와 **공정 비교가 되지 않음**을 수치로 확인.
4. 분류 Acc(~54% / ~68–71%)는 A~C에서 큰 변화 없음 → 위험점수 검증과 독립.
5. 대외 문구: “R² 0.98 = 사고 예측 정확도”가 아니라  
   “프로파일 위험 스코어카드 재현도”로 유지할 것.

## 산출 파일

- `docs\validation_v1_0_3_results.json`
- `docs\validation_v1_0_3.md`
