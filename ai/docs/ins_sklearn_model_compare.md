# InsureGuard — sklearn 알고리즘 비교

> 타깃·피처·클리닝은 **v1.0.3 고정**. 후보만 변경 (sklearn only).

## 설정

| 항목 | 값 |
|------|-----|
| 데이터 | `사고분석_2016~2025_원본합본.csv` |
| 타깃 | 프로파일 위험점수 (심각도 70% + 빈도 30%) |
| 피처 | 입력 4 + 교차 6 |
| 회귀 후보 | HistGradientBoostingRegressor, RandomForestRegressor, Ridge |
| 분류 후보 | RandomForestClassifier, HistGradientBoostingClassifier, LogisticRegression |
| split | random 80/20 (stratify=사고내용), time (test∈2024–2025) |
| 승자 규칙 | 회귀: MAE↓ → 등급일치↑ / 분류: Acc↑ → macro-F1↑ |

## 해석 주의

- R²·RMSE·MAE는 **프로파일 스코어카드 재현도**이지 개별 사고 예측력이 아님.
- 현재 서빙: 회귀 HGBR + 분류 RF×2 (`ins_model_v1.0.3.pkl`).

## Split: `random_80_20` (train=91903, test=22976)

### 위험점수 회귀

| 모델 | R² | RMSE | MAE | 등급일치 | train(s) |
|------|-----|------|-----|----------|----------|
| HistGradientBoostingRegressor | 0.9851 | 2.429 | 1.508 | 0.911 | 2.973 |
| RandomForestRegressor ✅ | 0.9937 | 1.586 | 0.347 | 0.985 | 3.363 |
| Ridge | 0.1477 | 18.369 | 15.597 | 0.391 | 0.037 |

### 법규위반 분류

| 모델 | Accuracy | macro-F1 | train(s) |
|------|----------|----------|----------|
| RandomForestClassifier | 0.5456 | 0.0902 | 2.523 |
| HistGradientBoostingClassifier ✅ | 0.5470 | 0.0884 | 1.77 |
| LogisticRegression | 0.5470 | 0.0884 | 2.135 |

### 사고경중 분류

| 모델 | Accuracy | macro-F1 | train(s) |
|------|----------|----------|----------|
| RandomForestClassifier | 0.6804 | 0.2167 | 2.514 |
| HistGradientBoostingClassifier | 0.6815 | 0.2069 | 1.127 |
| LogisticRegression ✅ | 0.6822 | 0.2028 | 1.588 |

## Split: `time_2024_2025` (train=95459, test=19420)

### 위험점수 회귀

| 모델 | R² | RMSE | MAE | 등급일치 | train(s) |
|------|-----|------|-----|----------|----------|
| HistGradientBoostingRegressor | 0.9750 | 3.139 | 1.861 | 0.916 | 1.57 |
| RandomForestRegressor ✅ | 0.9848 | 2.452 | 0.550 | 0.978 | 3.605 |
| Ridge | 0.1709 | 18.080 | 15.253 | 0.404 | 0.045 |

### 법규위반 분류

| 모델 | Accuracy | macro-F1 | train(s) |
|------|----------|----------|----------|
| RandomForestClassifier | 0.5407 | 0.1028 | 2.608 |
| HistGradientBoostingClassifier | 0.5413 | 0.1037 | 1.92 |
| LogisticRegression ✅ | 0.5419 | 0.1004 | 3.193 |

### 사고경중 분류

| 모델 | Accuracy | macro-F1 | train(s) |
|------|----------|----------|----------|
| RandomForestClassifier | 0.7117 | 0.2297 | 2.679 |
| HistGradientBoostingClassifier | 0.7125 | 0.2189 | 1.007 |
| LogisticRegression ✅ | 0.7142 | 0.2083 | 1.501 |

## 결론 (적합성)

- **설득력용 time split** 회귀 승자(MAE): `RandomForestRegressor`
- **pkl 재현용 random split** 회귀 승자(MAE): `RandomForestRegressor`
- 법규 분류 (time): `LogisticRegression`
- 경중 분류 (time): `LogisticRegression`

### 해석

1. **비선형 필수:** Ridge(time MAE 15.3) ≫ 트리 계열 → LabelEncoder 범주 입력에는 선형 기준선이 부적합하고 **트리 모델이 적합**.
2. **RF vs HGBR:** 프로파일 스코어 재현에서는 RF(time MAE 0.550)가 HGBR(1.861)보다 수치상 앞선다. 동일 프로파일이 행마다 반복되는 타깃 특성상 RF의 분할이 유리할 수 있다.
3. **현재 서빙(HGBR):** time R² 0.975 / MAE 1.86 / 등급일치 91.6%로 **실무 참고용으로는 충분한 적합**. 운영 중 pkl·추론 코드를 유지할 근거가 된다. 순수 오차 최소화만 보면 RF 회귀로 교체 여지를 문서화한다.
4. **분류:** 후보 간 Acc 차이가 매우 작아 (~0.5%p 내외) **현행 RF 유지가 합리적**. macro-F1도 전체적으로 낮아 메인 KPI로 쓰기 어렵다.

생성: 스크립트 `scripts/compare_ins_sklearn.py`
