# AI 문서 목차

설치·실행·API는 상위 [`../README.md`](../README.md)를 먼저 보세요.  
이 폴더는 **피처 명세·검증·실험 기록**을 모읍니다.

---

## 현재 사용 (API 서빙 기준)

| 계열 | 모델 | 피처 명세 | 학습 스크립트 |
|------|------|-----------|---------------|
| InsureGuard (보험) | `models/ins_model_v1.0.3.pkl` | [ins_v1_0_3_feature_spec.md](ins_v1_0_3_feature_spec.md) | `scripts/ins_v1_0_3.py` |
| GovGuard (지자체) | `models/gov_model_v1.0.3.pkl` | [gov_v1_0_3_feature_spec.md](gov_v1_0_3_feature_spec.md) | `scripts/gov_v1_0_3.py` |

---

## 검증 · 실험

| 문서 | 설명 |
|------|------|
| [validation_v1_0_3.md](validation_v1_0_3.md) | InsureGuard v1.0.3 검증 요약 |
| [validation_v1_0_3_results.json](validation_v1_0_3_results.json) | 검증 수치 |
| [gov_severe_experiments.md](gov_severe_experiments.md) | 지자체 중대율 EB/반기 실험 |
| [gov_severe_experiments.json](gov_severe_experiments.json) | 실험 수치 |
| `figures/` | 버전·실험별 차트 PNG |

---

## 보관 (이전 버전 · 비교용)

API가 쓰지 않는 과거 명세입니다. 버전 비교·이력용으로만 참고하세요.

| 문서 | 비고 |
|------|------|
| [ins_v1_0_2_feature_spec.md](ins_v1_0_2_feature_spec.md) | 보험 v1.0.2 |
| [gov_v1_0_0_feature_spec.md](gov_v1_0_0_feature_spec.md) | 지자체 v1.0.0 |
| [gov_v1_0_1_feature_spec.md](gov_v1_0_1_feature_spec.md) | 지자체 v1.0.1 |
| [gov_v1_0_2_feature_spec.md](gov_v1_0_2_feature_spec.md) | 지자체 v1.0.2 |

---

## 보관 (구형 · 현재 서빙과 무관)

아래 문서는 **레거시 `traffic_accident_model.pkl` / `new_model` 계열** 기준입니다.  
지금 FastAPI가 서빙하는 InsureGuard·GovGuard v1.0.3과 **다릅니다.**

| 문서 | 비고 |
|------|------|
| [feature_specification.md](feature_specification.md) | 구 피처 명세 |
| [model_usage_guide.md](model_usage_guide.md) | 구 pkl 사용 가이드 |
| [benchmark_results.json](benchmark_results.json) | 구 벤치마크 수치(있을 경우) |
