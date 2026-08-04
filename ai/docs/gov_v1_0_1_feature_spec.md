> 📦 **보관** — 이전 버전입니다. 현재 서빙: [gov_v1_0_3_feature_spec.md](gov_v1_0_3_feature_spec.md) · [목차](README.md)

# GovGuard AI v1.0.1 — 피처 명세서

본 문서는 `scripts/gov_v1_0_1.py` / `models/gov_model_v1.0.1.pkl` 을 설명합니다.

> **v1.0.0:** 지역별 다음 분기 **사고 점유율**만 예측  
> **v1.0.1:** + 다음 분기 **중대사고율**(중상+사망 비중) 및 **경중 구성** 예측  
> → 지자체 화면의 “어디서 큰 사고 비중이 커질지 / 사고경중”에 대응

> **후속:** EB 스무딩·반기 보조는 **v1.0.2**, 지도·건수 중심은 **v1.0.3**.  
> 현재 서빙 헬퍼(`src/gov_inference.py`)는 **v1.0.3**을 사용합니다.  
> v1.0.0 / v1.0.1 pkl은 그대로 보존됩니다.

---

## 1. 모델 개요

| 항목 | 내용 |
|------|------|
| 모델명 | GovGuard AI |
| 버전 | 1.0.1 |
| 용도 | 지역별 다음 분기 사고 점유율 + 중대·경중 전망 |
| 학습 데이터 | `data/raw/사고분석_2016~2025_원본합본.csv` |
| 사용자 입력 | 없음 (인구통계 X) |

### 정의

$$
\text{사고율(점유율)}_{r,t} = \frac{\text{지역 }r\text{ 사고건수}_t}{\text{대구 전체 사고건수}_t}
$$

$$
\text{중대사고율}_{r,t} = \frac{\text{사망}_t + \text{중상}_t}{\text{지역 }r\text{ 사고건수}_t}
$$

경중 비율: 사망 / 중상 / 경상 / 부상신고 각각의 지역 내 비중.

---

## 2. 출력 (추론)

| 필드 | 설명 |
|------|------|
| `예측사고율_퍼센트` | 다음 분기 지역 점유율 |
| `예측중대사고율_퍼센트` | 다음 분기 중대(중상+사망) 비중 |
| `중대사고등급` | LOW / MODERATE / HIGH / CRITICAL |
| `예측사고경중_퍼센트` | 사망·중상·경상·부상신고 비율 |
| `추정_다음분기중대사고건수` | 점유율×전체건수 가정 × 중대율 |

등급 임계값(중대사고율): ≥35% CRITICAL / ≥28% HIGH / ≥22% MODERATE / 그 외 LOW

---

## 3. 학습 피처

v1.0.0 시계열 피처 + `severe_*`, `death_share_t`, `serious_share_t`

타깃 3종:
1. `next_사고율` (점유율)
2. `next_중대사고율`
3. `next_{사망|중상|경상|부상신고}_비율`

평가: next 타깃 연도 ∈ {2024, 2025} time split

---

## 4. 실행

```bash
python -m scripts.gov_v1_0_1
```

```python
from src.gov_inference import predict_gov_rates
predict_gov_rates()           # 전 지역 (중대율 높은 순)
predict_gov_rates(지역="중구")
```

---

## 5. 관련 파일

| 파일 | 역할 |
|------|------|
| `scripts/gov_v1_0_1.py` | 학습·추론 |
| `models/gov_model_v1.0.1.pkl` | 패키지 |
| `src/gov_inference.py` | 서빙 헬퍼 |
| `docs/figures/gov_v1_0_1/` | 중대사고율 추이 그래프 |
| `scripts/gov_v1_0_0.py` | 이전 버전(점유율만) |
