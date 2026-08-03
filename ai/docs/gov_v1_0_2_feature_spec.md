# GovGuard AI v1.0.2 — 피처 명세서

본 문서는 `scripts/gov_v1_0_2.py` / `models/gov_model_v1.0.2.pkl` 을 설명합니다.

> **v1.0.0:** 지역별 다음 분기 **사고 점유율**  
> **v1.0.1:** + raw **중대사고율**·경중 구성  
> **v1.0.2:** 중대·경중에 **EB 스무딩(α=40)** + **반기 중대율 보조 모델**  
> (실험: `docs/gov_severe_experiments.md`)

현재 `src/gov_inference.py`는 **v1.0.3**(지도·건수 중심)을 로드합니다.  
v1.0.0 / v1.0.1 pkl은 보존됩니다.  
> **후속:** 건수 가중·사고건수 회귀는 **v1.0.3** (`docs/gov_v1_0_3_feature_spec.md`).

---

## 1. 모델 개요

| 항목 | 내용 |
|------|------|
| 모델명 | GovGuard AI |
| 버전 | 1.0.2 |
| 용도 | 지역별 다음 분기 점유율 + EB 중대·경중 / 반기 중대 순위 |
| 학습 데이터 | `data/raw/사고분석_2016~2025_원본합본.csv` |
| 사용자 입력 | 없음 |

### 정의

$$
\text{사고율(점유율)}_{r,t} = \frac{\text{지역 }r\text{ 사고건수}_t}{\text{대구 전체 사고건수}_t}
$$

$$
\text{중대사고율}_{r,t}^{\text{EB}} = \frac{d_{r,t}+s_{r,t}+\alpha\,\bar p}{n_{r,t}+\alpha},\quad \alpha=40
$$

경중 비율도 동일 EB 방식으로 스무딩합니다.

### 실험 요약 (vs raw 평가)

| 설정 | R² (vs raw) | 비고 |
|------|-------------|------|
| Q_raw (v1.0.1 계열) | **~0.63** | raw 적합 최고 |
| Q_eb (본 버전 기본 중대) | ~0.52 | 안정화, vs raw R²는 하락 |
| H_raw / H_eb | R² 낮음 | **순위(Spearman)** 유리 |

실무: 기본 API는 **분기 EB**. 지역 순위 비교는 `freq="H"` 반기 모델을 참고.

학습 지표 (time split, next∈2024–2025):

| 지표 | 값 |
|------|-----|
| Share R² | **0.946** |
| Severe EB R² | 0.400 |
| Severe vs raw R² | 0.442 |
| Severe H EB R² | 0.395 |
| Severe H vs raw R² | 0.394 |

---

## 2. 출력

### 분기 (`freq="Q"`, 기본)

| 필드 | 설명 |
|------|------|
| `예측사고율_퍼센트` | 다음 분기 지역 점유율 |
| `예측중대사고율_퍼센트` | 다음 분기 EB 중대율 |
| `중대사고등급` | LOW / MODERATE / HIGH / CRITICAL |
| `예측사고경중_퍼센트` | EB 사망·중상·경상·부상신고 |
| `추정_다음분기중대사고건수` | 점유×전체건수 가정 × 중대율 |

### 반기 (`freq="H"`)

| 필드 | 설명 |
|------|------|
| `예측중대사고율_퍼센트` | 다음 반기 EB 중대율 |
| `중대사고등급` | 동일 임계 |

등급: ≥35% CRITICAL / ≥28% HIGH / ≥22% MODERATE / 그 외 LOW

---

## 3. 학습 피처

**분기:** v1.0.1과 동일 시계열 + EB `severe_*` / 경중 share  
**반기:** lag 1–2, roll2 (피처 수 축소)

타깃:
1. `next_사고율` (분기만, raw 점유율)
2. `next_중대사고율` (EB)
3. `next_{경중}_비율` (분기만, EB)
4. 반기: `next_중대사고율` (EB)만

평가: next 타깃 연도 ∈ {2024, 2025}. 패키지에 `severe_rate_vs_raw`도 저장.

---

## 4. 실행

```bash
python -m scripts.gov_v1_0_2
```

```python
from src.gov_inference import predict_gov_rates

predict_gov_rates()                 # 분기, 중대율 높은 순
predict_gov_rates(지역="중구")
predict_gov_rates(freq="H")         # 반기 순위
```

---

## 5. 관련 파일

| 파일 | 역할 |
|------|------|
| `scripts/gov_v1_0_2.py` | 학습·추론 |
| `models/gov_model_v1.0.2.pkl` | 패키지 |
| `src/gov_inference.py` | 서빙 헬퍼 |
| `docs/figures/gov_v1_0_2/` | EB 중대율 추이 |
| `docs/gov_severe_experiments.md` | EB/반기 실험 |
| `scripts/gov_v1_0_1.py` | 이전(raw 중대) |
