# scripts/archive — 이전 학습·실험 스크립트

API 서빙에 **쓰지 않는** 과거 버전입니다.  
현재 서빙·학습은 상위 `scripts/` 만 보세요.

| 현재 (`scripts/`) | 보관 (여기) |
|-------------------|-------------|
| `gov_v1_0_5.py` | `gov_v1_0_0.py` … `gov_v1_0_4.py` |
| `ins_v1_0_4.py` | `ins_v1_0_3.py`, `ins_v1_0_2.py`, `new_model.py`, `newmodel.py` |
| `gov_compare_b1_b2_v1_0_4.py` | `gov_severe_experiments.py` |
| `ins_validate_v1_0_4.py` | `validate_ins_v1_0_3.py`, `benchmark_report.py` |

재실행 예:

```bash
python scripts/archive/gov_v1_0_4.py
python scripts/archive/ins_v1_0_3.py
python scripts/archive/gov_severe_experiments.py
```

`ROOT`는 `scripts/archive` 기준 `parents[2]`(ai 루트)로 잡혀 있습니다.
