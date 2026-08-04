# -*- coding: utf-8 -*-
"""
GovGuard AI v1.0.4
지자체용 — B1(점유율×시전체건수) 메인 + 직전 실적×2 캡

v1.0.3 대비:
- 서빙 메인 건수: share_count (점유율×기준분기 전체건수)
- 캡: min(share_count, max(1, round(last_count × 2)))
- 선형 건수 회귀는 학습·진단용으로만 보존 (서빙 메인 아님)
- 소지역(군위 등) 과대추정 완화 (docs/gov_v1_0_4_b1_vs_b2.md)

학습·패널·중대/경중/반기는 v1.0.3 파이프라인 재사용.
"""

from __future__ import annotations

import importlib.util
import pickle
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore", category=UserWarning)

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "models"
FIG_DIR = ROOT / "docs" / "figures" / "gov_v1_0_4"
V103_PATH = ROOT / "scripts" / "gov_v1_0_3.py"

MODEL_NAME = "GovGuard AI"
MODEL_VERSION = "1.0.4"
MODEL_FILENAME = f"gov_model_v{MODEL_VERSION}.pkl"

# 직전 분기 실적 대비 예측 상한 배수
LAST_COUNT_CAP_MULT = 2.0

# 사고유형 대분류 (원본 '사고유형'의 ' - ' 앞부분) — MVP: 기준분기 실적 비율 전파
TYPE_ORDER = ["차대차", "차대사람", "차량단독"]

# (지역, 연도분기) → 대분류 비율(0~1)
_type_share_by_region_period: dict[tuple[str, str], dict[str, float]] | None = None
# 지역 전체 기간 평균 비율 (분기 데이터 없을 때 fallback)
_type_share_by_region: dict[str, dict[str, float]] | None = None


def _load_v103():
    name = "gov_v1_0_3_for_v104"
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(name, V103_PATH)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def _normalize_shares(counts: dict[str, float]) -> dict[str, float]:
    total = float(sum(counts.values()))
    if total <= 0:
        n = len(TYPE_ORDER)
        return {k: 1.0 / n for k in TYPE_ORDER}
    return {k: float(counts.get(k, 0.0)) / total for k in TYPE_ORDER}


def _ensure_type_share_tables() -> None:
    """원본 CSV에서 지역×분기 사고유형 대분류 비율 테이블을 한 번만 구축."""
    global _type_share_by_region_period, _type_share_by_region
    if _type_share_by_region_period is not None:
        return

    g = _load_v103()
    df = g.load_raw().copy()
    if "사고유형" not in df.columns:
        _type_share_by_region_period = {}
        _type_share_by_region = {}
        return

    df["사고유형대분류"] = df["사고유형"].astype(str).str.split(" - ").str[0]
    df = df[df["사고유형대분류"].isin(TYPE_ORDER)]

    by_rp: dict[tuple[str, str], dict[str, float]] = {}
    grp = (
        df.groupby(["지역", "연도분기", "사고유형대분류"], as_index=False)
        .size()
        .rename(columns={"size": "건수"})
    )
    for (region, period), sub in grp.groupby(["지역", "연도분기"]):
        counts = {k: 0.0 for k in TYPE_ORDER}
        for _, row in sub.iterrows():
            counts[str(row["사고유형대분류"])] = float(row["건수"])
        by_rp[(str(region), str(period))] = _normalize_shares(counts)

    by_region: dict[str, dict[str, float]] = {}
    grp_r = (
        df.groupby(["지역", "사고유형대분류"], as_index=False)
        .size()
        .rename(columns={"size": "건수"})
    )
    for region, sub in grp_r.groupby("지역"):
        counts = {k: 0.0 for k in TYPE_ORDER}
        for _, row in sub.iterrows():
            counts[str(row["사고유형대분류"])] = float(row["건수"])
        by_region[str(region)] = _normalize_shares(counts)

    _type_share_by_region_period = by_rp
    _type_share_by_region = by_region


def type_shares_for(지역: str | None, 기준분기: str | None) -> dict[str, float]:
    """기준분기 실적 유형 비율(0~1). 없으면 지역 전체 → 균등."""
    _ensure_type_share_tables()
    assert _type_share_by_region_period is not None
    assert _type_share_by_region is not None

    if 지역 and 기준분기:
        hit = _type_share_by_region_period.get((str(지역), str(기준분기)))
        if hit:
            return dict(hit)
    if 지역:
        hit = _type_share_by_region.get(str(지역))
        if hit:
            return dict(hit)
    return _normalize_shares({k: 1.0 for k in TYPE_ORDER})


def apply_serving_count(
    share_count: int | float,
    last_count: int | float,
    *,
    mult: float = LAST_COUNT_CAP_MULT,
) -> int:
    """B1 + last×mult 캡."""
    share_i = int(round(float(share_count)))
    last_i = max(0, int(round(float(last_count))))
    ceiling = max(1, int(round(last_i * mult))) if last_i > 0 else max(1, share_i)
    return int(min(share_i, ceiling))


def _apply_row_policy(row: dict, *, count_reg_value: int | None = None) -> dict:
    """v1.0.3 추론 행을 v1.0.4 서빙 건수로 덮어쓴다."""
    out = dict(row)
    last = int(out.get("참고_기준분기사고건수") or 0)
    share_c = int(out.get("추정_점유율기반사고건수") or 0)
    if count_reg_value is None:
        count_reg_value = int(out.get("예측사고건수") or 0)

    capped = apply_serving_count(share_c, last)
    out["예측사고건수_share"] = share_c
    out["예측사고건수_count_reg"] = count_reg_value
    out["예측사고건수"] = capped
    out["추정_다음분기사고건수"] = capped
    out["건수캡_배수"] = LAST_COUNT_CAP_MULT
    out["건수캡_적용"] = capped < share_c

    severe = float(out.get("예측중대사고율") or 0.0)
    out["추정_다음분기중대사고건수"] = int(round(capped * severe))

    # MVP: 기준분기 실적 사고유형 대분류 비율을 예측에 전파
    shares = type_shares_for(out.get("지역"), out.get("기준분기"))
    out["예측사고유형비율"] = {k: round(v, 4) for k, v in shares.items()}
    out["예측사고유형_퍼센트"] = {
        k: round(v * 100, 2) for k, v in shares.items()
    }
    out["사고유형_출처"] = "기준분기_실적비율_전파"
    return out


def train_models(df: pd.DataFrame | None = None) -> dict:
    """v1.0.3과 동일 학습 후 메타만 v1.0.4 서빙 정책으로 갱신."""
    g = _load_v103()
    package = g.train_models(df)
    package["name"] = MODEL_NAME
    package["version"] = MODEL_VERSION
    package["task"] = "region_next_quarter_share_count_capped"
    package["primary_metric"] = "share_count_capped_by_last_x2"
    package["serving"] = {
        "main": "share_hat * city_total_as_of",
        "cap": f"min(share_count, max(1, round(last_count * {LAST_COUNT_CAP_MULT})))",
        "count_regressor": "diagnostic_only_not_served",
    }
    return package


def predict_next_quarter(
    package: dict,
    지역: str | None = None,
    as_of_연도분기: str | None = None,
) -> list[dict] | dict:
    """B1 건수 + last×2 캡이 메인."""
    g = _load_v103()
    raw = g.predict_next_quarter(
        package, 지역=지역, as_of_연도분기=as_of_연도분기
    )
    if isinstance(raw, dict):
        return _apply_row_policy(raw)

    rows = [_apply_row_policy(r) for r in raw]
    rows.sort(key=lambda r: r["예측사고건수"], reverse=True)
    return rows


def predict_next_half(
    package: dict,
    지역: str | None = None,
    as_of_연도반기: str | None = None,
) -> list[dict] | dict:
    g = _load_v103()
    return g.predict_next_half(
        package, 지역=지역, as_of_연도반기=as_of_연도반기
    )


def predict_gov_rates(
    package: dict,
    지역: str | None = None,
    as_of: str | None = None,
    freq: str = "Q",
) -> list[dict] | dict:
    if freq.upper() == "H":
        return predict_next_half(package, 지역=지역, as_of_연도반기=as_of)
    return predict_next_quarter(package, 지역=지역, as_of_연도분기=as_of)


def predict_quarter_history(
    package: dict,
    지역: str,
    n_history: int = 3,
    as_of_연도분기: str | None = None,
) -> dict:
    """직전 n분기 실적 + 캡 적용된 다음 분기 예측 (경중 누적막대용)."""
    g = _load_v103()
    panel = package["latest_panel"].copy()
    rh = panel[panel["지역"] == 지역].sort_values("period_id")
    if rh.empty:
        raise ValueError(f"지역 없음: {지역}")

    if as_of_연도분기 is None:
        as_of_연도분기 = str(rh["연도분기"].iloc[-1])
    match = rh.loc[rh["연도분기"] == as_of_연도분기, "period_id"]
    if match.empty:
        raise ValueError(f"기준 분기 없음: {as_of_연도분기}")
    pid = float(match.iloc[0])
    rh = rh[rh["period_id"] <= pid]
    past = rh.tail(n_history)

    history = []
    for _, cur in past.iterrows():
        history.append(
            {
                "분기": str(cur["연도분기"]),
                "사고건수": int(cur["사고건수"]),
                "중대사고율_퍼센트": round(float(cur["중대사고율"]) * 100, 2),
                "경중_건수": {
                    col: int(cur[col]) for col in g.SEVERITY_ORDER
                },
                "경중_퍼센트": {
                    col: round(float(cur[f"{col}_비율"]) * 100, 2)
                    for col in g.SEVERITY_ORDER
                },
                "kind": "actual",
            }
        )

    forecast_row = predict_next_quarter(
        package, 지역=지역, as_of_연도분기=as_of_연도분기
    )
    assert isinstance(forecast_row, dict)
    pred_count = int(forecast_row["예측사고건수"])
    sev_pct = forecast_row["예측사고경중_퍼센트"]
    forecast = {
        "분기": forecast_row["예측분기"],
        "사고건수": pred_count,
        "중대사고율_퍼센트": forecast_row["예측중대사고율_퍼센트"],
        "경중_건수": {
            k: int(round(pred_count * (v / 100.0))) for k, v in sev_pct.items()
        },
        "경중_퍼센트": sev_pct,
        "kind": "forecast",
        "기준분기": forecast_row["기준분기"],
        "예측사고건수_share": forecast_row.get("예측사고건수_share"),
        "건수캡_적용": forecast_row.get("건수캡_적용"),
    }
    return {"지역": 지역, "history": history, "forecast": forecast}


def save_package(package: dict) -> Path:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    path = MODEL_DIR / MODEL_FILENAME
    with open(path, "wb") as f:
        pickle.dump(package, f)
    return path


def main() -> None:
    g = _load_v103()
    print(f"=== {MODEL_NAME} v{MODEL_VERSION} 학습 시작 ===")
    print(
        f"서빙: share×시전체, 캡=min(., last×{LAST_COUNT_CAP_MULT})"
    )
    raw = g.load_raw()
    print(f"1. raw rows: {len(raw):,}")

    package = train_models(raw)
    path = save_package(package)
    print(f"2. saved: {path}")
    print(f"   serving={package.get('serving')}")

    print("\n3. 분기 추론 (캡 적용 건수 순)...")
    preds = predict_next_quarter(package)
    assert isinstance(preds, list)
    print(
        f"{'지역':<8} {'캡건수':>8} {'share':>8} {'last':>6} {'캡?':>4} "
        f"{'중대%':>7}"
    )
    print("-" * 52)
    for r in preds:
        print(
            f"{r['지역']:<8} {r['예측사고건수']:>8} "
            f"{r.get('예측사고건수_share', 0):>8} "
            f"{r['참고_기준분기사고건수']:>6} "
            f"{'Y' if r.get('건수캡_적용') else 'N':>4} "
            f"{r['예측중대사고율_퍼센트']:>7.2f}"
        )

    print("\n4. 군위 history 스모크...")
    h = predict_quarter_history(package, 지역="군위군")
    for p in h["history"]:
        print(f"  {p['분기']} actual {p['사고건수']}")
    f = h["forecast"]
    print(
        f"  {f['분기']} forecast {f['사고건수']} "
        f"(share={f.get('예측사고건수_share')}, capped={f.get('건수캡_적용')})"
    )
    print(f"\n=== {MODEL_NAME} v{MODEL_VERSION} 완료 ===")


if __name__ == "__main__":
    main()
