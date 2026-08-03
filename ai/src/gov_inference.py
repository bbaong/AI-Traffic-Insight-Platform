"""GovGuard AI v1.0.3 추론 — 지도·대응용 예상 사고건수 (+점유율·EB 중대 보조)."""

from __future__ import annotations

import importlib.util
import pickle
from functools import lru_cache
from pathlib import Path
from typing import Any

from src import MODEL_DIR

MODEL_PATH = MODEL_DIR / "gov_model_v1.0.3.pkl"
SCRIPT_PATH = Path(__file__).resolve().parent.parent / "scripts" / "gov_v1_0_3.py"


@lru_cache(maxsize=1)
def load_model() -> dict[str, Any]:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"모델 파일이 없습니다: {MODEL_PATH}")
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def _gov_mod():
    spec = importlib.util.spec_from_file_location("gov_v1_0_3", SCRIPT_PATH)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def predict_gov_rates(
    지역: str | None = None,
    as_of_연도분기: str | None = None,
    *,
    freq: str = "Q",
    as_of: str | None = None,
) -> list[dict] | dict:
    """다음 기간 예상 사고건수(메인) + 점유율 + EB 중대(보조).

    freq='Q'(기본): 분기 — 건수 내림차순
    freq='H': 반기 중대율 보조 레이어
    """
    mod = _gov_mod()
    package = load_model()
    if freq.upper() == "H":
        return mod.predict_next_half(
            package,
            지역=지역,
            as_of_연도반기=as_of or as_of_연도분기,
        )
    return mod.predict_next_quarter(
        package,
        지역=지역,
        as_of_연도분기=as_of or as_of_연도분기,
    )
