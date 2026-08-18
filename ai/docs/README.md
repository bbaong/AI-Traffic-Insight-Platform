# AI 문서 목차

설치·실행·API는 상위 [`../README.md`](../README.md)를 먼저 보세요.  
이 폴더는 **현재 서빙 기준** 피처 명세·검증·실험을 모읍니다.  
이전 버전은 [`archive/`](archive/README.md) 입니다.

---

## 현재 사용 (API 서빙 기준)

| 계열 | 모델 | 피처 명세 | 학습 스크립트 |
|------|------|-----------|---------------|
| InsureGuard (보험) | `models/ins_model_v1.0.5.pkl` | [ins_v1_0_5_feature_spec.md](ins_v1_0_5_feature_spec.md) | `scripts/ins_v1_0_5.py` |
| GovGuard (지자체) | `models/gov_model_v1.0.5.pkl` | [gov_v1_0_5_feature_spec.md](gov_v1_0_5_feature_spec.md) | `scripts/gov_v1_0_5.py` |

| 문서 | 설명 |
|------|------|
| [gov_region_compare_plan.md](gov_region_compare_plan.md) | 지역비교 종합 위험도·추세·역할 분담 결정 (새 pkl 없이 백엔드 중심). 유형 ETL: `scripts/etl_accident_condition_type.py` |
| [ins_v1_0_5_frontend_handoff.md](ins_v1_0_5_frontend_handoff.md) | v1.0.5 응답 필드·게이지 아래 발생/심도 UI (프론트 미수정, 인수인계) |
| [ins_v1_0_4_feature_spec.md](ins_v1_0_4_feature_spec.md) | 이전 서빙(심각도70+건수30) |
| [ins_profile_risk_gap_analysis.md](ins_profile_risk_gap_analysis.md) | 수성 vs 군위 동일 프로파일 위험점수 분해·법규 TOP3 해석 (v1.0.4) |

---

## 검증 · 실험 (현재)

| 문서 | 설명 |
|------|------|
| [validation_v1_0_4.md](validation_v1_0_4.md) | InsureGuard v1.0.4 검증 요약 |
| [validation_v1_0_4_results.json](validation_v1_0_4_results.json) | 검증 수치 |
| [ins_sklearn_model_compare.md](ins_sklearn_model_compare.md) | Ins sklearn 알고리즘 비교 (회귀·분류) |
| [ins_sklearn_model_compare.json](ins_sklearn_model_compare.json) | Ins 비교 수치 |
| [gov_v1_0_4_b1_vs_b2.md](gov_v1_0_4_b1_vs_b2.md) | B1(share) vs B2(log건수) + 캡 비교 (산식 선정 기록) |
| [gov_v1_0_4_b1_vs_b2.json](gov_v1_0_4_b1_vs_b2.json) | 비교 수치 |
| [gov_sklearn_rate_compare.md](gov_sklearn_rate_compare.md) | Gov B1+last×2 고정, rate 알고리즘 sklearn 비교 |
| [gov_sklearn_rate_compare.json](gov_sklearn_rate_compare.json) | Gov rate 비교 수치 |
| [prediction_latency.md](prediction_latency.md) | Ins/Gov 예측 응답 시간 측정 요약 |
| [prediction_latency.json](prediction_latency.json) | 지연 시간 원시 수치 |
| [prediction_latency_e2e.md](prediction_latency_e2e.md) | AI + Backend(+FE HTML) 전체 스택 지연 |
| [prediction_latency_e2e.json](prediction_latency_e2e.json) | E2E 지연 원시 수치 |
| `figures/gov_v1_0_4_compare/` | 군위 등 케이스 차트 |
| `figures/` | 버전·실험별 차트 PNG |

---

## 보관

이전 명세·레거시 문서는 [`archive/`](archive/README.md) 로 옮겼습니다.  
이전 학습 스크립트는 [`../scripts/archive/`](../scripts/archive/README.md) 입니다.
