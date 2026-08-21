> 📦 **보관(이전 서빙)** — 현재 서빙은 [gov_v1_0_5_feature_spec.md](../gov_v1_0_5_feature_spec.md) · [목차](../README.md)

# GovGuard AI v1.0.3 — 피처 명세서

본 문서는 `scripts/archive/gov_v1_0_3.py` / `models/gov_model_v1.0.3.pkl` 을 설명합니다.
재현·실험 비교용이며, API 서빙은 **v1.0.5** (`scripts/gov_v1_0_5.py`)입니다.

> **목적:** 지도·대응 인력 — **어디 사고가 많은가**  
> **v1.0.2:** EB 중대·반기 보조  
> **v1.0.3:** 건수 가중 점유율 + **사고건수 직접 회귀** (메인 지표)

---

## 1. 모델 개요

| 항목 | 내용 |
|------|------|
| 모델명 | GovGuard AI |
| 버전 | 1.0.3 |
| 용도 | 지역별 다음 분기 **예상 사고건수** (지도 색·인력 배치) |
| 보조 | 점유율, EB 중대율·경중, 반기 중대 |
| 학습 데이터 | `data/raw/사고분석_2016~2025_원본합본.csv` |
| 사용자 입력 | 없음 |

### 레이어

| 레이어 | 지표 | 지도 용도 |
|--------|------|-----------|
| **1 (메인)** | `예측사고건수` | 색상·정렬·대응 규모 |
| 2 | `예측사고율` | 대구 내 비중 |
| 3 (보조) | EB 중대율·중대건수 | “많으면서 심한가” |

### 학습 변경점

1. **점유율** (`next_사고율`): `sample_weight ∝ next_사고건수`  
2. **건수** (`next_사고건수`): 동일 가중으로 직접 회귀 → 추론 메인 출력  
3. 중대/경중/반기: v1.0.2와 동일 (비가중, 보조)

평가 (time split, next∈2024–2025): 비가중 R²/MAE + **가중** R²/MAE + **Top-3 구 일치**.

| 지표 | 값 |
|------|-----|
| Share R² (비가중) | 0.935 |
| Share R² (건수 가중) | **0.955** |
| Share Top-3 hit | **0.917** |
| Count R² (비가중) | 0.866 |
| Count R² (건수 가중) | **0.918** |
| Count MAE (가중) | ~31건 |
| Count Top-3 hit | **0.917** |

---

## 2. 출력 (분기)

| 필드 | 설명 |
|------|------|
| `예측사고건수` | 다음 분기 예상 건수 (**메인**, 건수 모델) |
| `추정_다음분기사고건수` | 위와 동일 (호환 별칭) |
| `추정_점유율기반사고건수` | 점유율 × 기준분기 시전체건수 |
| `예측사고율_퍼센트` | 점유율 |
| `추정_다음분기중대사고건수` | 예상건수 × EB 중대율 |
| `중대사고등급` | LOW / MODERATE / HIGH / CRITICAL |

기본 정렬: **예상 건수 내림차순**.

---

## 3. 실행

```bash
python scripts/archive/gov_v1_0_3.py
```

```python
from src.gov_inference import predict_gov_rates

predict_gov_rates()                 # 건수 높은 순
predict_gov_rates(지역="달서구")
predict_gov_rates(freq="H")         # 중대 보조
```

---

## 4. 관련 파일

| 파일 | 역할 |
|------|------|
| `scripts/archive/gov_v1_0_3.py` | 학습·추론 |
| `models/gov_model_v1.0.3.pkl` | 패키지 |
| `src/gov_inference.py` | 서빙 헬퍼 |
| `docs/figures/gov_v1_0_3/` | 건수·중대 추이 |
| `docs/archive/gov_v1_0_2_feature_spec.md` | 이전(EB 중심) |
