# InsureGuard AI v1.0.4 — 엄격 검증 결과 (A~C)

스크립트: `scripts/ins_validate_v1_0_4.py`  
Test 연도(A/B time): `[2024, 2025]`

## 연도별 행 수

| 연도 | 건수 |
|------|------|
| 2016 | 12,388 |
| 2017 | 12,331 |
| 2018 | 12,556 |
| 2019 | 13,901 |
| 2020 | 12,348 |
| 2021 | 11,626 |
| 2022 | 10,603 |
| 2023 | 10,332 |
| 2024 | 9,662 ← test |
| 2025 | 9,735 ← test |

## 결과 요약

| 실험 | Split | 타깃 | R² | RMSE | MAE | 법규 Acc | 경중 Acc | n_train | n_test |
|------|-------|------|----|------|-----|----------|----------|---------|--------|
| ref_random_full_target | random | full 프로파일 | 0.9835 | 2.54 | 1.52 | 54.8% | 68.0% | 92,385 | 23,097 |
| A_time_full_target | time | full 프로파일 | 0.9841 | 2.49 | 1.64 | 54.1% | 71.0% | 96,085 | 19,397 |
| B_time_trainonly_target | time | train-only 프로파일 | 0.9902 | 2.05 | 1.24 | 54.1% | 71.0% | 96,085 | 19,397 |
| B_random_trainonly_target | random | train-only 프로파일 | 0.9911 | 1.92 | 1.18 | 54.8% | 68.0% | 92,385 | 23,097 |
| C_time_individual_epdo | time | log1p(행 EPDO) | -0.3160 | 0.80 | 0.69 | 54.1% | 71.0% | 96,085 | 19,397 |
| C_random_individual_epdo | random | log1p(행 EPDO) | -0.1030 | 0.77 | 0.67 | 54.8% | 68.0% | 92,385 | 23,097 |

## 실험 설명

- **ref_random_full_target**: 현재 방식: 전체 데이터 프로파일 타깃 + random 80/20
- **A_time_full_target**: Time split train∉[2024, 2025] / test∈[2024, 2025]; 타깃은 전체 기간 프로파일 통계(약한 누수)
- **B_time_trainonly_target**: Time split + 프로파일 통계를 train만 집계 후 test 매핑 (test∈[2024, 2025])
  - test 미지 프로파일 행: 25 / 19,397 (fallback=50.06)
- **B_random_trainonly_target**: Random 80/20 + 프로파일 통계 train-only (누수 제거)
  - test 미지 프로파일 행: 19 / 23,097 (fallback=50.06)
- **C_time_individual_epdo**: Time split; y=log1p(행단위 EPDO); test∈[2024, 2025]
- **C_random_individual_epdo**: Random 80/20; y=log1p(행단위 EPDO)

## 해석 가이드

1. **ref → A**: R²가 크게 떨어지면 연도 변화에 민감(프로파일 점수 매핑의 시간 불안정).
2. **ref → B_random_trainonly**: R² 하락은 전체 데이터 프로파일 통계 **타깃 누수** 기여분.
3. **B_time_trainonly**: 시간 분리 + 누수 제거의 가장 엄격한 조합.
4. **C (개별 EPDO)**: R²가 프로파일 타깃보다 훨씬 낮으면, 입력 4개만으로 **개별 사고 경중**을 맞추기 어렵다는 기존 해석을 지지.
5. 분류 Acc는 프로파일 위험점수와 **별도 과제**이며, R²와 직접 비교하지 말 것.

## 산출 파일

- `docs\ins_validation_v1_0_4_results.json`
- `docs\ins_validation_v1_0_4.md`
