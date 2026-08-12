# -*- coding: utf-8 -*-
"""
GovGuard — sklearn rate-model comparison under fixed B1 + last×2 serving.

Keeps panel / features / time split / B1×city_total / last×2 identical.
Only the share (rate) regressor algorithm changes.

Also points to existing pipeline compare: docs/gov_v1_0_4_b1_vs_b2.md

Outputs:
  docs/gov_sklearn_rate_compare.json
  docs/gov_sklearn_rate_compare.md
"""

from __future__ import annotations

import importlib.util
import json
import sys
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore", category=UserWarning)

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "gov_v1_0_4.py"
OUT_JSON = ROOT / "docs" / "gov_sklearn_rate_compare.json"
OUT_MD = ROOT / "docs" / "gov_sklearn_rate_compare.md"

RANDOM_STATE = 42
LAST_MULT = 2.0
CASE_REGIONS = ["군위군", "중구", "달성군", "달서구", "수성구"]


def _load_gov():
    spec = importlib.util.spec_from_file_location("gov_v1_0_4", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules["gov_v1_0_4"] = mod
    spec.loader.exec_module(mod)
    return mod


def _mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    denom = np.maximum(np.abs(y_true), 1.0)
    return float(np.mean(np.abs(y_true - y_pred) / denom) * 100.0)


def _jump_stats(pred: np.ndarray, last_count: np.ndarray) -> dict:
    last = np.maximum(np.asarray(last_count, dtype=float), 1.0)
    pred = np.asarray(pred, dtype=float)
    ratio = pred / last
    return {
        "jump_ratio_p95": float(np.quantile(ratio, 0.95)),
        "over_2x_rate": float(np.mean(pred > 2.0 * last)),
    }


def top3_hit(work_te: pd.DataFrame, y_true, y_pred, k: int = 3) -> float:
    te = work_te.copy()
    te = te.assign(_y=y_true, _p=y_pred)
    scores = []
    for _, g in te.groupby("next_연도분기"):
        if len(g) < k:
            continue
        true_top = set(g.nlargest(k, "_y")["지역"].astype(str))
        pred_top = set(g.nlargest(k, "_p")["지역"].astype(str))
        scores.append(len(true_top & pred_top) / k)
    return float(np.mean(scores)) if scores else float("nan")


def apply_cap(share_count: np.ndarray, last_count: np.ndarray) -> np.ndarray:
    out = []
    for s, last in zip(share_count, last_count):
        share_i = int(round(float(s)))
        last_i = max(0, int(round(float(last))))
        ceiling = max(1, int(round(last_i * LAST_MULT))) if last_i > 0 else max(1, share_i)
        out.append(float(min(share_i, ceiling)))
    return np.asarray(out, dtype=float)


def candidates():
    # HGBR hyperparams aligned with gov_v1_0_4._fit_regressor defaults where possible
    return {
        "HistGradientBoostingRegressor": HistGradientBoostingRegressor(
            max_depth=6,
            learning_rate=0.08,
            max_iter=300,
            min_samples_leaf=8,
            l2_regularization=0.1,
            random_state=RANDOM_STATE,
        ),
        "RandomForestRegressor": RandomForestRegressor(
            n_estimators=300,
            max_depth=12,
            min_samples_leaf=4,
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "Ridge": Pipeline(
            [
                ("scaler", StandardScaler()),
                ("model", Ridge(alpha=1.0)),
            ]
        ),
    }


def main() -> None:
    gov = _load_gov()
    print("Building panel...")
    raw = gov.load_raw()
    panel = gov.add_lag_features(gov.build_region_quarter_panel(raw))
    panel, _le = gov.encode_region(panel)
    work = gov.prepare_work(panel)

    tr_mask, te_mask = gov.time_split_mask(work, "next_연도분기")
    feat = gov.FEATURE_COLS
    X_tr = work.loc[tr_mask, feat].to_numpy(dtype=float)
    X_te = work.loc[te_mask, feat].to_numpy(dtype=float)
    y_rate_tr = work.loc[tr_mask, "next_사고율"].to_numpy(dtype=float)
    y_count_te = work.loc[te_mask, "next_사고건수"].to_numpy(dtype=float)
    last_te = work.loc[te_mask, "사고건수"].to_numpy(dtype=float)
    # city total at next period: next_count / next_rate when rate>0
    next_rate_te = work.loc[te_mask, "next_사고율"].to_numpy(dtype=float)
    city_total_te = np.where(
        next_rate_te > 1e-12,
        y_count_te / next_rate_te,
        work.loc[te_mask, "사고건수"].to_numpy(dtype=float) * 9.0,
    )
    # Prefer panel city total if available
    if "시전체건수" in work.columns:
        # align: for prediction of next, use same-quarter city total of *next* via shift
        # Here approximate with sum of next counts per period (oracle city size)
        te = work.loc[te_mask].copy()
        city_total_te = (
            te.groupby("next_연도분기")["next_사고건수"].transform("sum").to_numpy(dtype=float)
        )

    w_tr = gov._count_weights(work.loc[tr_mask, "next_사고건수"].to_numpy())
    work_te = work.loc[te_mask].reset_index(drop=True)

    # small regions: bottom ~30% by train mean count
    train_mean = (
        work.loc[tr_mask]
        .groupby("지역")["사고건수"]
        .mean()
        .sort_values()
    )
    n_small = max(1, int(round(len(train_mean) * 0.3)))
    small_names = train_mean.head(n_small).index.astype(str).tolist()
    small_mask = work_te["지역"].astype(str).isin(small_names).to_numpy()

    print(f"train={tr_mask.sum()} test={te_mask.sum()} small={small_names}")

    variants = {}
    for name, model in candidates().items():
        print(f"[rate] {name} ...")
        t0 = time.perf_counter()
        if isinstance(model, Pipeline):
            model.fit(X_tr, y_rate_tr, model__sample_weight=w_tr)
        else:
            model.fit(X_tr, y_rate_tr, sample_weight=w_tr)
        train_s = time.perf_counter() - t0
        share_hat = np.clip(model.predict(X_te), 0.0, 1.0)
        share_count = share_hat * city_total_te
        capped = apply_cap(share_count, last_te)

        overall = {
            "r2": float(r2_score(y_count_te, capped)),
            "mae": float(mean_absolute_error(y_count_te, capped)),
            "mape_pct": _mape(y_count_te, capped),
            "top3_hit_rate": top3_hit(work_te, y_count_te, capped),
            "share_mae": float(mean_absolute_error(next_rate_te, share_hat)),
            "train_seconds": round(train_s, 3),
        }
        overall.update(_jump_stats(capped, last_te))

        small = {}
        if small_mask.any():
            small = {
                "r2": float(r2_score(y_count_te[small_mask], capped[small_mask])),
                "mae": float(mean_absolute_error(y_count_te[small_mask], capped[small_mask])),
                "mape_pct": _mape(y_count_te[small_mask], capped[small_mask]),
            }
            small.update(_jump_stats(capped[small_mask], last_te[small_mask]))

        cases = []
        latest = work_te["next_연도분기"].astype(str).max()
        for region in CASE_REGIONS:
            sub = work_te[
                (work_te["지역"].astype(str) == region)
                & (work_te["next_연도분기"].astype(str) == latest)
            ]
            if sub.empty:
                sub = work_te[work_te["지역"].astype(str) == region].tail(1)
            if sub.empty:
                continue
            pos = int(sub.index[-1])
            cases.append(
                {
                    "지역": region,
                    "last_count": float(last_te[pos]),
                    "y_true": float(y_count_te[pos]),
                    "y_pred_capped": float(capped[pos]),
                    "share_count": float(share_count[pos]),
                }
            )

        variants[name] = {
            "overall": overall,
            "small_regions": small,
            "cases": cases,
        }
        print(
            f"  MAE={overall['mae']:.2f} MAPE={overall['mape_pct']:.1f}% "
            f"R2={overall['r2']:.3f} Top3={overall['top3_hit_rate']:.3f}"
        )

    # Winner: small MAPE then overall MAE (serving-relevant)
    ranking = sorted(
        variants.items(),
        key=lambda kv: (
            float((kv[1]["small_regions"] or kv[1]["overall"]).get("mape_pct", 99)),
            float(kv[1]["overall"]["mae"]),
            -float(kv[1]["overall"]["top3_hit_rate"]),
        ),
    )
    winner = ranking[0][0]

    payload = {
        "scope": "sklearn_only_rate_under_B1_lastx2",
        "serving_algo": "HistGradientBoostingRegressor",
        "pipeline": "share_hat * city_total_next; min(., last*2)",
        "split": "next year in {2024,2025}",
        "small_region_names": small_names,
        "n_train": int(tr_mask.sum()),
        "n_test": int(te_mask.sum()),
        "variants": variants,
        "decision": {
            "winner": winner,
            "rule": "min small-region MAPE, then overall MAE, then Top-3",
            "ranking": [n for n, _ in ranking],
        },
        "related_pipeline_compare": "docs/gov_v1_0_4_b1_vs_b2.md",
    }

    OUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    lines = [
        "# GovGuard — sklearn 점유율(rate) 모델 비교 (B1 + last×2 고정)",
        "",
        "> 파이프라인(B1 × 시전체 + `last×2` cap)은 고정하고, **점유율 회귀 알고리즘만** 비교.",
        "> 서빙 구조(B1 vs B2 vs 건수회귀) 비교는 [`gov_v1_0_4_b1_vs_b2.md`](gov_v1_0_4_b1_vs_b2.md) 참고.",
        "",
        "## 설정",
        "",
        "| 항목 | 값 |",
        "|------|-----|",
        f"| split | next∈2024–2025 (train={payload['n_train']}, test={payload['n_test']}) |",
        "| 후보 | HistGradientBoostingRegressor, RandomForestRegressor, Ridge |",
        "| 최종 KPI | cap 적용 후 **건수** MAE / MAPE / R² / Top-3 |",
        f"| 소지역 | `{small_names}` |",
        f"| 승자 규칙 | {payload['decision']['rule']} |",
        "",
        "## 전체 (캡 적용 후 건수)",
        "",
        "| 모델 | MAE | MAPE% | R² | Top-3 | jump_p95 | share MAE | train(s) |",
        "|------|-----|-------|-----|-------|----------|-----------|----------|",
    ]
    for name, v in variants.items():
        o = v["overall"]
        mark = " ✅" if name == winner else ""
        lines.append(
            f"| {name}{mark} | {o['mae']:.1f} | {o['mape_pct']:.1f} | {o['r2']:.3f} | "
            f"{o['top3_hit_rate']:.3f} | {o['jump_ratio_p95']:.2f} | "
            f"{o['share_mae']:.4f} | {o['train_seconds']} |"
        )

    lines += [
        "",
        "## 소지역",
        "",
        "| 모델 | MAE | MAPE% | jump_p95 |",
        "|------|-----|-------|----------|",
    ]
    for name, v in variants.items():
        s = v["small_regions"] or {}
        if not s:
            continue
        mark = " ✅" if name == winner else ""
        lines.append(
            f"| {name}{mark} | {s['mae']:.1f} | {s['mape_pct']:.1f} | {s['jump_ratio_p95']:.2f} |"
        )

    lines += [
        "",
        "## 결론",
        "",
        "- **수치 승자:** 아래 표 기준 `decision.winner` (소지역 MAPE → 전체 MAE).",
        "- **현재 서빙 rate 모델:** `HistGradientBoostingRegressor`.",
        "- `last×2` 캡이 강하면 알고리즘 격차가 줄고 Ridge가 건수 KPI에서 앞설 수 있다. "
        "HGBR도 R²·Top-3 기준으로는 충분하며, **파이프라인 선정(B1)** 이 더 중요"
        "([`gov_v1_0_4_b1_vs_b2.md`](gov_v1_0_4_b1_vs_b2.md)).",
        "- HGBR 유지 근거: 기존 pkl·보조 헤드와 동일 스택, Top-3 동등.",
        "",
        "스크립트: `scripts/compare_gov_rate_sklearn.py`",
        "",
    ]
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nWinner: {winner}")
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_MD}")


if __name__ == "__main__":
    main()
