# -*- coding: utf-8 -*-
"""
GovGuard B1 vs B2 (+ A cap) 비교 실험

공통: v1.0.3과 동일 패널·피처·time split (next∈2024–2025)
- B1: 점유율 예측 → share × 기준분기 시전체건수
- B2: log1p(next_사고건수) 회귀 (가중 √n) → expm1
- A:  min(primary, max(last_count * 1.5, share_count * 1.25))
- 베이스라인: v1.0.3식 선형 건수 회귀 (count-weighted)

출력:
  docs/gov_compare_b1_b2_v1_0_4.json
  docs/gov_compare_b1_b2_v1_0_4.md
  docs/figures/gov_v1_0_4_compare/*.png
"""

from __future__ import annotations

import importlib.util
import json
import sys
import warnings
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score

warnings.filterwarnings("ignore", category=UserWarning)

ROOT = Path(__file__).resolve().parent.parent
SCRIPT_V103 = ROOT / "scripts" / "archive" / "gov_v1_0_3.py"
OUT_JSON = ROOT / "docs" / "gov_compare_b1_b2_v1_0_4.json"
OUT_MD = ROOT / "docs" / "gov_compare_b1_b2_v1_0_4.md"
FIG_DIR = ROOT / "docs" / "figures" / "gov_v1_0_4_compare"

# 소지역 점프·과대추정 게이트 (판정표)
JUMP_P95_PASS = 2.0
OVER_2X_LABEL = "pred > 2 * last_count"

CASE_REGIONS = ["군위군", "중구", "달성군", "달서구", "수성구"]


def _load_v103():
    """실험 베이스라인용 — 서빙 경로와 무관. v1.0.3 재현 스크립트만 로드."""
    spec = importlib.util.spec_from_file_location("gov_v1_0_3", SCRIPT_V103)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    # Allow running without registering as package member of scripts
    sys.modules["gov_v1_0_3"] = mod
    spec.loader.exec_module(mod)
    return mod


def apply_cap_a(
    primary: np.ndarray,
    last_count: np.ndarray,
    share_count: np.ndarray,
) -> np.ndarray:
    """A: min(primary, max(last*1.5, share*1.25))."""
    ceiling = np.maximum(last_count * 1.5, share_count * 1.25)
    return np.minimum(primary, ceiling)


def _mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    denom = np.maximum(np.abs(y_true), 1.0)
    return float(np.mean(np.abs(y_true - y_pred) / denom) * 100.0)


def _count_space_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return {
        "r2": float(r2_score(y_true, y_pred)),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "mape_pct": _mape(y_true, y_pred),
    }


def _jump_stats(pred: np.ndarray, last_count: np.ndarray) -> dict:
    last = np.maximum(np.asarray(last_count, dtype=float), 1.0)
    pred = np.asarray(pred, dtype=float)
    ratio = pred / last
    return {
        "jump_mean": float(np.mean(np.abs(ratio - 1.0))),
        "jump_ratio_p95": float(np.quantile(ratio, 0.95)),
        "over_2x_rate": float(np.mean(pred > 2.0 * last)),
    }


def _fit_hgb(
    X_tr,
    y_tr,
    *,
    sample_weight=None,
    clip: tuple[float, float] | None = None,
):
    model = HistGradientBoostingRegressor(
        max_depth=6,
        learning_rate=0.08,
        max_iter=300,
        min_samples_leaf=8,
        l2_regularization=0.1,
        random_state=42,
    )
    model.fit(X_tr, y_tr, sample_weight=sample_weight)
    return model


def predict_clipped(model, X, clip: tuple[float, float] | None):
    pred = model.predict(X)
    if clip is not None:
        pred = np.clip(pred, clip[0], clip[1])
    return pred


def evaluate_variant(
    name: str,
    y_true: np.ndarray,
    y_pred: np.ndarray,
    last_count: np.ndarray,
    work_te: pd.DataFrame,
    small_mask: np.ndarray,
) -> dict:
    overall = _count_space_metrics(y_true, y_pred)
    overall.update(_jump_stats(y_pred, last_count))
    overall["top3_hit_rate"] = float(
        top3_hit_from_arrays(work_te, y_true, y_pred)
    )

    small = {}
    if small_mask.any():
        small = _count_space_metrics(y_true[small_mask], y_pred[small_mask])
        small.update(_jump_stats(y_pred[small_mask], last_count[small_mask]))

    cases = []
    te = work_te.reset_index(drop=True)
    latest_period = te["next_연도분기"].astype(str).max()
    for region in CASE_REGIONS:
        sub = te[
            (te["지역"].astype(str) == region)
            & (te["next_연도분기"].astype(str) == latest_period)
        ]
        if sub.empty:
            sub = te[te["지역"].astype(str) == region].tail(1)
        if sub.empty:
            continue
        pos = int(sub.index[-1])
        last = float(last_count[pos])
        pred = float(y_pred[pos])
        true = float(y_true[pos])
        cases.append(
            {
                "지역": region,
                "기준분기": str(sub.iloc[-1]["연도분기"]),
                "예측분기": str(sub.iloc[-1]["next_연도분기"]),
                "last_count": last,
                "y_true": true,
                "y_pred": pred,
                "pred_over_last": pred / max(last, 1.0),
            }
        )

    return {
        "name": name,
        "overall": overall,
        "small_regions": small,
        "cases": cases,
        "gate_jump_p95_pass": (
            small.get("jump_ratio_p95", overall["jump_ratio_p95"]) <= JUMP_P95_PASS
            if small
            else overall["jump_ratio_p95"] <= JUMP_P95_PASS
        ),
    }


def top3_hit_from_arrays(work_te: pd.DataFrame, y_true, y_pred, k: int = 3) -> float:
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


def plot_case_bars(results: dict, outfile: Path) -> None:
    """군위 등 케이스: variant별 pred vs last/true."""
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    variants = list(results["variants"].keys())
    # pick 군위군 if present
    region = "군위군"
    labels = []
    preds = []
    last = None
    true = None
    for v in variants:
        cases = {c["지역"]: c for c in results["variants"][v]["cases"]}
        if region not in cases:
            continue
        c = cases[region]
        labels.append(v)
        preds.append(c["y_pred"])
        last = c["last_count"]
        true = c["y_true"]
    if not labels:
        return

    x = np.arange(len(labels))
    fig, ax = plt.subplots(figsize=(9, 4.2))
    ax.bar(x, preds, color="#21adc4", label="pred")
    if last is not None:
        ax.axhline(last, color="#F77C34", linestyle="--", label=f"last={last:.0f}")
    if true is not None:
        ax.axhline(true, color="#2E7D32", linestyle=":", label=f"true next={true:.0f}")
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=20, ha="right")
    ax.set_ylabel("사고건수")
    ax.set_title(f"{region} — B1/B2 (+A) vs last/true (검증 최신 구간)")
    ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig(outfile, dpi=140, bbox_inches="tight")
    plt.close()


def decide_winner(variants: dict) -> dict:
    """소지역 jump p95·MAPE 우선, Top-3 허용 범위."""
    ranked = []
    for name, v in variants.items():
        if "+A" not in name:
            continue  # 서비스 후보는 A ON
        small = v.get("small_regions") or v["overall"]
        ranked.append(
            (
                name,
                float(small.get("jump_ratio_p95", 99)),
                float(small.get("mape_pct", 99)),
                float(v["overall"].get("top3_hit_rate", 0)),
                bool(v.get("gate_jump_p95_pass")),
            )
        )
    # lower jump, lower mape, higher top3
    ranked.sort(key=lambda t: (not t[4], t[1], t[2], -t[3]))
    if not ranked:
        return {"winner": None, "reason": "no +A variants"}
    best = ranked[0]
    return {
        "winner": best[0],
        "reason": (
            f"소지역 jump_p95={best[1]:.2f}, MAPE={best[2]:.1f}%, "
            f"Top3={best[3]:.3f}, gate_pass={best[4]}"
        ),
        "ranking_plus_a": [
            {"name": n, "jump_p95": j, "mape": m, "top3": t, "gate": g}
            for n, j, m, t, g in ranked
        ],
    }


def write_md(results: dict, path: Path) -> None:
    lines = [
        "# GovGuard B1 vs B2 (+A) 비교",
        "",
        "## 설정",
        "",
        "- split: next∈2024–2025 (v1.0.3과 동일)",
        "- B1: share × 기준분기 시전체건수",
        "- B2: log1p(건수), 가중 √n",
        "- A: `min(primary, max(last×1.5, share_count×1.25))`",
        "- Baseline: v1.0.3식 선형 건수 회귀 (건수 가중)",
        f"- 소지역: 학습 구간 평균 건수 하위 ~30% → `{results['small_region_names']}`",
        "",
        "## 판정 (A ON 후보)",
        "",
        f"- **승자:** `{results['decision']['winner']}`",
        f"- 이유: {results['decision']['reason']}",
        "",
        "## 전체 (검증)",
        "",
        "| variant | MAE | MAPE% | R² | Top-3 | jump_p95 | over_2x |",
        "|---------|-----|-------|-----|-------|----------|---------|",
    ]
    for name, v in results["variants"].items():
        o = v["overall"]
        lines.append(
            f"| {name} | {o['mae']:.1f} | {o['mape_pct']:.1f} | {o['r2']:.3f} | "
            f"{o['top3_hit_rate']:.3f} | {o['jump_ratio_p95']:.2f} | "
            f"{o['over_2x_rate']:.2f} |"
        )

    lines += [
        "",
        "## 소지역",
        "",
        "| variant | MAE | MAPE% | jump_p95 | over_2x | gate≤2.0 |",
        "|---------|-----|-------|----------|---------|----------|",
    ]
    for name, v in results["variants"].items():
        s = v.get("small_regions") or {}
        if not s:
            lines.append(f"| {name} | - | - | - | - | - |")
            continue
        lines.append(
            f"| {name} | {s['mae']:.1f} | {s['mape_pct']:.1f} | "
            f"{s['jump_ratio_p95']:.2f} | {s['over_2x_rate']:.2f} | "
            f"{'Y' if v['gate_jump_p95_pass'] else 'N'} |"
        )

    lines += ["", "## 케이스 (검증 최신 next 구간)", ""]
    # gather by region
    for region in CASE_REGIONS:
        lines.append(f"### {region}")
        lines.append("")
        lines.append("| variant | last | true | pred | pred/last |")
        lines.append("|---------|------|------|------|-----------|")
        for name, v in results["variants"].items():
            case = next((c for c in v["cases"] if c["지역"] == region), None)
            if not case:
                continue
            lines.append(
                f"| {name} | {case['last_count']:.0f} | {case['y_true']:.0f} | "
                f"{case['y_pred']:.0f} | {case['pred_over_last']:.2f} |"
            )
        lines.append("")

    lines += [
        "## 다음 단계",
        "",
        "1. 승자 로직을 `gov_v1_0_4.py` 정식 학습·pkl로 고정",
        "2. `gov_inference.py` / history forecast 건수에 동일 적용",
        "3. 대시보드 사고경중 예측 막대 재확인 (특히 군위군)",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    print("=== GovGuard B1 vs B2 (+A) experiments ===")
    g = _load_v103()

    raw = g.load_raw()
    panel = g.build_region_quarter_panel(raw)
    panel = g.add_lag_features(panel)
    panel, _le = g.encode_region(panel)
    work = g.prepare_work(panel)

    # 시전체건수: 해당 (기준) 분기의 대구 전체 — panel에 이미 전체건수 있음
    if "전체건수" not in work.columns:
        raise RuntimeError("panel/work에 전체건수 없음")

    tr_mask, te_mask = g.time_split_mask(work, "next_연도분기")
    if te_mask.sum() < 10 or tr_mask.sum() < 20:
        cutoff = work["period_id"].quantile(0.8)
        tr_mask = work["period_id"] < cutoff
        te_mask = ~tr_mask

    feats = g.FEATURE_COLS
    X_tr = work.loc[tr_mask, feats]
    X_te = work.loc[te_mask, feats]
    work_te = work.loc[te_mask].copy()

    y_count_tr = work.loc[tr_mask, "next_사고건수"].to_numpy(dtype=float)
    y_count_te = work.loc[te_mask, "next_사고건수"].to_numpy(dtype=float)
    y_share_tr = work.loc[tr_mask, "next_사고율"].to_numpy(dtype=float)
    y_share_te = work.loc[te_mask, "next_사고율"].to_numpy(dtype=float)

    last_tr = work.loc[tr_mask, "사고건수"].to_numpy(dtype=float)
    last_te = work.loc[te_mask, "사고건수"].to_numpy(dtype=float)
    city_te = work.loc[te_mask, "전체건수"].to_numpy(dtype=float)

    # 소지역: train 구간 지역별 평균 건수 하위 30%
    train_avg = (
        work.loc[tr_mask]
        .groupby("지역")["사고건수"]
        .mean()
        .sort_values()
    )
    n_small = max(1, int(np.ceil(len(train_avg) * 0.3)))
    small_regions = set(train_avg.head(n_small).index.astype(str))
    small_mask = work_te["지역"].astype(str).isin(small_regions).to_numpy()

    print(f"n_train={len(X_tr)} n_test={len(X_te)}")
    print(f"small_regions ({len(small_regions)}): {sorted(small_regions)}")

    w_count_tr = g._count_weights(y_count_tr)
    w_sqrt_tr = np.sqrt(np.clip(y_count_tr, 1.0, None))
    w_sqrt_tr = w_sqrt_tr / w_sqrt_tr.mean()

    # --- Baseline: linear count (v1.0.3 style) ---
    print("\n[Baseline] count regression (count-weighted)...")
    base_model = _fit_hgb(X_tr, y_count_tr, sample_weight=w_count_tr)
    pred_base = predict_clipped(base_model, X_te, (0.0, 1e9))

    # --- B1: share ---
    print("[B1] share rate (count-weighted)...")
    share_model = _fit_hgb(X_tr, y_share_tr, sample_weight=w_count_tr)
    share_hat = predict_clipped(share_model, X_te, (0.0, 1.0))
    pred_b1 = share_hat * city_te

    # share_count for A (same as B1 raw for B1; for B2 use this)
    share_count_te = pred_b1.copy()

    # --- B2: log1p count ---
    print("[B2] log1p(count) (sqrt-n weight)...")
    y_log_tr = np.log1p(y_count_tr)
    log_model = _fit_hgb(X_tr, y_log_tr, sample_weight=w_sqrt_tr)
    pred_b2 = np.expm1(predict_clipped(log_model, X_te, None))
    pred_b2 = np.clip(pred_b2, 0.0, None)

    # A caps
    pred_base_a = apply_cap_a(pred_base, last_te, share_count_te)
    pred_b1_a = apply_cap_a(pred_b1, last_te, share_count_te)
    pred_b2_a = apply_cap_a(pred_b2, last_te, share_count_te)

    variants_pred = {
        "baseline_count": pred_base,
        "baseline_count+A": pred_base_a,
        "B1_share": pred_b1,
        "B1_share+A": pred_b1_a,
        "B2_logcount": pred_b2,
        "B2_logcount+A": pred_b2_a,
    }

    variants = {}
    for name, pred in variants_pred.items():
        print(f"  eval {name}...")
        variants[name] = evaluate_variant(
            name,
            y_count_te,
            pred,
            last_te,
            work_te,
            small_mask,
        )

    results = {
        "split": "next_year in {2024,2025}",
        "cap_a": "min(primary, max(last*1.5, share_count*1.25))",
        "small_region_names": sorted(small_regions),
        "n_train": int(tr_mask.sum()),
        "n_test": int(te_mask.sum()),
        "variants": variants,
        "decision": decide_winner(variants),
    }

    FIG_DIR.mkdir(parents=True, exist_ok=True)
    plot_case_bars(results, FIG_DIR / "gunwi_pred_compare.png")

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    write_md(results, OUT_MD)

    print(f"\nJSON: {OUT_JSON}")
    print(f"MD:   {OUT_MD}")
    print(f"FIG:  {FIG_DIR / 'gunwi_pred_compare.png'}")
    print(f"Winner: {results['decision']['winner']} - {results['decision']['reason']}")
    print("=== done ===")


if __name__ == "__main__":
    main()
