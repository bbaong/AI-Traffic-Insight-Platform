# InsureGuard AI v1.0.5 — 피처 명세서

본 문서는 `scripts/ins_v1_0_5.py` / `models/ins_model_v1.0.5.pkl` 을 설명합니다.

> **목적:** 보험 인수·요율 참고 — **이 프로파일의 기대손실**  
> **v1.0.4:** 심각도 순위 70% + **건수** 순위 30%  
> **v1.0.5:** 위험점수 = **인구대비 발생률 × 건당 심도** 의 프로파일 백분위  
> 발생·심도는 참고 필드로 API에 같이 내려 감.

현재 `src/inference.py`는 **v1.0.5 pkl만** 로드합니다.  
학습 스크립트를 요청마다 import 하지 **않습니다** (GovGuard `gov_v1_0_5.py` 자급자족 서빙과 반대).

---

## 1. 모델 개요

| 항목 | 내용 |
|------|------|
| 모델명 | InsureGuard AI |
| 버전 | 1.0.5 |
| 입력 | 성별, 연령대, 차종, 지역 (교차 6개 유지) |
| 타깃 | 기대손실 순위 0~100 |
| 학습 CSV | `사고분석_2016~2025_원본합본.csv` + `대구_연령별인구현황_2016~2025_합본(in).csv` |
| 서빙 | `ins_model_v1.0.5.pkl` 만. 인구 CSV·학습 py **불필요** |
| 이전 | `scripts/archive/ins_v1_0_4.py`, `docs/ins_v1_0_4_feature_spec.md` |

학습 지표 (재학습):

| 지표 | 값 |
|------|-----|
| R² | 0.9989 (프로파일 스코어카드 재현. 개별 사고 예측 아님) |
| RMSE / MAE | 1.25 / 0.73 |
| 법규 Acc. | 54.85% |
| 경중 Acc. | 67.97% |
| 프로파일 수 | 911 |

---

## 2. 타깃 산식

노출 `E` = 구·사고연령대·성별의 **2016–2025 월평균 주민등록인구**.  
차종은 인구 분모에 없음 (1차 근사).

10세 인구 구간 → 사고 연령대:

| 인구 | 사고 연령대 |
|------|-------------|
| 10~19 | 20세 이하 (0~9는 제외) |
| 20~29 … 50~59 | 21-30 … 51-60 |
| 60~69 | 61-64 (4/9) + 65세 이상 (5/9) |
| 70+ | 65세 이상 |

$$
\text{발생률}_g = \frac{n_g}{E_g \times 10\text{년}} \times 10{,}000
\quad\text{(연간 1만 명당)}
$$

심도는 v1.0.4와 동일 EB (`prior_strength=40`):

$$
\widetilde{\text{EPDO}}_g,\quad \widetilde{p}^{\text{severe}}_g
$$

$$
\text{기대손실}_g = \widetilde{\text{발생률}}_g \times \widetilde{\text{EPDO}}_g
$$

$$
\text{위험점수}_g = \text{PercentileRank}(\text{기대손실}_g) \times 100
$$

참고 축 (게이지가 아님):

$$
\text{발생점수}_g = \text{PercentileRank}(\widetilde{\text{발생률}}_g)\times 100
$$
$$
\text{심도점수}_g = \text{PercentileRank}(\text{sev\_raw}_g)\times 100
$$

`sev_raw` = `0.72·log1p(EPDO) + 0.28·(10·중대율)` (v1.0.4와 동일).

등급 임계값: 75 / 50 / 30 → CRITICAL / HIGH / MODERATE / LOW.

---

## 3. 서빙 (Gov와 분리)

| | GovGuard v1.0.5 | **InsureGuard v1.0.5** |
|--|-----------------|-------------------------|
| 로드 | pkl + **매 요청 `gov_v1_0_5.py` exec** | pkl만, `@lru_cache` |
| 인구/패널 CSV | 서빙 시 불필요 (이미 pkl) | 서빙 시 불필요 (`profile_lookup` pkl) |
| 상담 문구 | 없음 | `src/consult_copy.py` (학습 py 비의존) |

pkl에 `profile_lookup`(911키) + `profile_defaults` 를 넣어, 발생·심도·발생률은 **회귀 재계산이 아니라 조회**입니다.

---

## 4. API `POST /predict`

요청 4필드는 v1.0.4와 동일합니다. 기존 응답 필드는 **유지**합니다.

| 필드 | 변경 |
|------|------|
| `버전` / `variant` | `InsureGuard AI v1.0.5` / `ins_v1.0.5` |
| `위험도` | **기대손실 순위** (게이지). 더 이상 70:30 블렌드 아님 |
| `예측등급` | 위험도 임계값 동일 |
| `등급확률` | 법규 TOP3 (0~1) 유지 |
| `사고경중비율` | 유지 |
| `담보추천` | 유지 |
| **`발생위험`** | `{점수, 등급, 라벨, 설명}` **신규** |
| **`심도위험`** | 동일 구조 **신규** |
| **`상담포인트`** | 발생×심도 한 줄 **신규** |
| **`발생률_1만명당`** | 연간 1만 명당 (참고) **신규** |

수성구 vs 군위군 (남 / 51-60세 / 승용) 학습 조회 예:

| | 수성구 | 군위군 |
|--|--------|--------|
| v1.0.4 위험도 | 53 (HIGH) | 91.6 (CRITICAL) |
| v1.0.5 위험도 | ~90 (CRITICAL) | ~94 (CRITICAL) |
| 발생점수 | 높음 (인구 대비 잦음) | 보통 |
| 심도점수 | 보통 (v1.0.4와 동일 ~33) | 위험 (~99.5) |

기대손실로 바꾸면 **수성도 올라갑니다.** 건수는 많아 발생률이 높고, 심도는 낮아도 곱이 크기 때문입니다. UI에서 두 축을 보여 줘야 상담이 됩니다.

---

## 5. 실행

```bash
python scripts/ins_v1_0_5.py
python -m src.inference --구군 수성구 --연령대 "51-60세" --성별 남 --차종 승용
python test_model.py
```

---

## 6. 관련 파일

| 파일 | 역할 |
|------|------|
| `scripts/ins_v1_0_5.py` | **학습 전용** |
| `scripts/archive/ins_v1_0_4.py` | 이전 학습 |
| `models/ins_model_v1.0.5.pkl` | 서빙 패키지 |
| `src/inference.py` | FastAPI 추론 (pkl only) |
| `src/consult_copy.py` | 상담 문구 |
| `docs/ins_v1_0_5_frontend_handoff.md` | 프론트 인수인계 |
