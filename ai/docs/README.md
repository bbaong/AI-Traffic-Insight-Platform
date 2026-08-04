# AI 문서 목차

설치·실행·API는 상위 [`../README.md`](../README.md)를 먼저 보세요.  
이 폴더는 **현재 서빙 기준** 피처 명세·검증·실험을 모읍니다.  
이전 버전은 [`archive/`](archive/README.md) 입니다.

---

## 현재 사용 (API 서빙 기준)

| 계열 | 모델 | 피처 명세 | 학습 스크립트 |
|------|------|-----------|---------------|
| InsureGuard (보험) | `models/ins_model_v1.0.3.pkl` | [ins_v1_0_3_feature_spec.md](ins_v1_0_3_feature_spec.md) | `scripts/ins_v1_0_3.py` |
| GovGuard (지자체) | `models/gov_model_v1.0.4.pkl` | [gov_v1_0_4_feature_spec.md](gov_v1_0_4_feature_spec.md) | `scripts/gov_v1_0_4.py` |

---

## 검증 · 실험 (현재)

| 문서 | 설명 |
|------|------|
| [validation_v1_0_3.md](validation_v1_0_3.md) | InsureGuard v1.0.3 검증 요약 |
| [validation_v1_0_3_results.json](validation_v1_0_3_results.json) | 검증 수치 |
| [gov_v1_0_4_b1_vs_b2.md](gov_v1_0_4_b1_vs_b2.md) | B1(share) vs B2(log건수) + 캡 비교 |
| [gov_v1_0_4_b1_vs_b2.json](gov_v1_0_4_b1_vs_b2.json) | 비교 수치 |
| `figures/gov_v1_0_4_compare/` | 군위 등 케이스 차트 |
| `figures/` | 버전·실험별 차트 PNG |

---

## 보관

이전 명세·레거시 문서는 [`archive/`](archive/README.md) 로 옮겼습니다.  
이전 학습 스크립트는 [`../scripts/archive/`](../scripts/archive/README.md) 입니다.
