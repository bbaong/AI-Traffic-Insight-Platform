# GovGuard AI v1.0.4 — 피처 명세서

본 문서는 `scripts/gov_v1_0_4.py` / `models/gov_model_v1.0.4.pkl` 을 설명합니다.

> **목적:** 지도·대응 인력 — **어디 사고가 많은가** (소지역 과대추정 완화)  
> **v1.0.3:** 건수 직접 회귀 메인  
> **v1.0.4:** **점유율×시전체(B1) + 직전 실적×2 캡**

비교 실험: [gov_v1_0_4_b1_vs_b2.md](gov_v1_0_4_b1_vs_b2.md)

현재 `src/gov_inference.py`는 **v1.0.4**을 로드합니다.

---

## 1. 모델 개요

| 항목 | 내용 |
|------|------|
| 모델명 | GovGuard AI |
| 버전 | 1.0.4 |
| 학습 | v1.0.3과 동일 패널·피처·점유율/중대/경중/반기 학습 |
| 서빙 메인 | `share_hat × 기준분기 대구 전체건수` |
| 캡 | `min(share_count, max(1, round(last_count × 2)))` |
| 비고 | 선형 건수 회귀는 pkl에 남을 수 있으나 **서빙에 사용하지 않음** |
| 서빙 필수 | `gov_model_v1.0.4.pkl` + `scripts/gov_v1_0_4.py` (**자급자족**) |
| 서빙 CSV | **불필요** (사고유형 비율·패널은 pkl) |
| 학습 CSV | `data/raw/사고분석_2016~2025_원본합본.csv` 필요 |
| 이전 코드 | `scripts/archive/gov_v1_0_3.py` — 보관·재현용 (런타임 의존 없음) |

### 레이어

| 레이어 | 지표 |
|--------|------|
| **1 (메인)** | 캡 적용 `예측사고건수` |
| 2 | `예측사고율` / `예측사고건수_share` (캡 전) |
| 3 (보조) | EB 중대율·경중 |

---

## 2. 출력 (분기) 추가 필드

| 필드 | 설명 |
|------|------|
| `예측사고건수` | **캡 적용 후** 서빙 건수 |
| `예측사고건수_share` | 캡 전 B1 건수 |
| `예측사고건수_count_reg` | (진단) v1.0.3식 건수 회귀값 |
| `건수캡_적용` | share가 캡에 잘렸으면 true |
| `참고_기준분기사고건수` | last (캡 기준) |

history `forecast.사고건수`도 동일 캡 건수를 사용하며, `경중_건수`는 캡 건수×경중%입니다.

---

## 3. 실행

```bash
python scripts/gov_v1_0_4.py
```

```python
from src.gov_inference import predict_gov_rates, predict_gov_history

predict_gov_rates(지역="군위군")
predict_gov_history(지역="군위군")
```

---

## 4. 관련 파일

| 파일 | 역할 |
|------|------|
| `scripts/gov_v1_0_4.py` | 학습·추론 (자급자족) |
| `scripts/archive/gov_v1_0_3.py` | 보관·재현용 |
| `models/gov_model_v1.0.4.pkl` | 패키지 |
| `src/gov_inference.py` | FastAPI 헬퍼 |
| `docs/gov_v1_0_4_b1_vs_b2.md` | B1/B2 실험 |
