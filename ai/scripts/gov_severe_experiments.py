# -*- coding: utf-8 -*-
"""
GovGuard — 중대사고율 개선 실험
1) EB 스무딩 타깃
2) 반기(H1/H2) 집계

결과: docs/gov_severe_experiments.md / .json
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from sklearn.preprocessing import LabelEncoder

warnings.filterwarnings("ignore", category=UserWarning)

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "raw" / "사고분석_2016~2025_원본합본.csv"
OUT_JSON = ROOT / "docs" / "gov_severe_experiments.json"
OUT_MD = ROOT / "docs" / "gov_severe_experiments.md"
FIG_DIR = ROOT / "docs" / "figures" / "gov_severe_experiments"

SEVERITY_ORDER = ["사망사고", "중상사고", "경상사고", "부상신고사고"]
ALPHA = 40.0  # EB prior strength


def load_raw() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, encoding="utf-8-sig")
    df["지역"] = df["시군구"].astype(str).str.replace(r"^대구광역시\s*", "", regex=True)
    text = df["발생년월"].astype(str).str.replace(" ", "", regex=False)
    year = text.str.extract(r"(\d{4})년")[0].astype(int)
    month = text.str.extract(r"년(\d{1,2})월")[0].astype(int)
    quarter = ((month - 1) // 3) + 1
    df["연도"] = year
    df["분기"] = quarter
    df["반기"] = np.where(quarter <= 2, 1, 2)
    df["연도분기"] = year.astype(str) + "Q" + quarter.astype(str)
    df["연도반기"] = year.astype(str) + "H" + df["반기"].astype(str)
    df["period_q"] = year * 4 + (quarter - 1)
    df["period_h"] = year * 2 + (df["반기"] - 1)
    df = df.dropna(subset=["지역", "연도", "사고내용"])
    df = df[df["사고내용"].isin(SEVERITY_ORDER)]
    return df.reset_index(drop=True)


def build_panel(df: pd.DataFrame, *, freq: str) -> pd.DataFrame:
    """freq: 'Q' or 'H'."""
    if freq == "Q":
        keys = ["지역", "연도", "분기", "연도분기", "period_q"]
        period_col = "period_q"
        label_col = "연도분기"
    else:
        keys = ["지역", "연도", "반기", "연도반기", "period_h"]
        period_col = "period_h"
        label_col = "연도반기"

    g = df.groupby(keys, as_index=False).size().rename(columns={"size": "사고건수"})
    totals = (
        g.groupby(period_col, as_index=False)["사고건수"]
        .sum()
        .rename(columns={"사고건수": "전체건수"})
    )
    panel = g.merge(totals, on=period_col, how="left")
    panel["사고율"] = panel["사고건수"] / panel["전체건수"].clip(lower=1)

    sev = (
        df.groupby(keys + ["사고내용"], as_index=False)
        .size()
        .rename(columns={"size": "경중건수"})
    )
    piv = (
        sev.pivot_table(index=keys, columns="사고내용", values="경중건수", aggfunc="sum", fill_value=0)
        .reset_index()
    )
    for c in SEVERITY_ORDER:
        if c not in piv.columns:
            piv[c] = 0
    panel = panel.merge(piv, on=keys, how="left")
    for c in SEVERITY_ORDER:
        panel[c] = panel[c].fillna(0).astype(int)

    panel["중대건수"] = panel["사망사고"] + panel["중상사고"]
    panel["중대사고율_raw"] = panel["중대건수"] / panel["사고건수"].clip(lower=1)

    # EB: citywide prior (all rows)
    p_bar = float(panel["중대건수"].sum() / max(panel["사고건수"].sum(), 1))
    panel["중대사고율_eb"] = (panel["중대건수"] + ALPHA * p_bar) / (
        panel["사고건수"] + ALPHA
    )
    panel["period_id"] = panel[period_col]
    panel["period_label"] = panel[label_col]
    panel["freq"] = freq
    panel["season"] = panel["분기"] if freq == "Q" else panel["반기"]
    return panel.sort_values(["지역", "period_id"]).reset_index(drop=True)


def add_features(panel: pd.DataFrame, *, severe_col: str, max_lag: int) -> pd.DataFrame:
    out = panel.copy()
    out["연도_idx"] = out["연도"] - int(out["연도"].min())
    out["rate_t"] = out["사고율"]
    out["count_t"] = out["사고건수"].astype(float)
    out["severe_t"] = out[severe_col]

    for lag in range(1, max_lag + 1):
        out[f"rate_lag{lag}"] = out.groupby("지역")["사고율"].shift(lag)
        out[f"count_lag{lag}"] = out.groupby("지역")["사고건수"].shift(lag)
        out[f"severe_lag{lag}"] = out.groupby("지역")[severe_col].shift(lag)

    def _roll(s: pd.Series) -> pd.Series:
        return s.shift(1).rolling(max_lag, min_periods=2).mean()

    out["rate_roll"] = out.groupby("지역")["사고율"].transform(_roll)
    out["count_roll"] = out.groupby("지역")["사고건수"].transform(_roll)
    out["severe_roll"] = out.groupby("지역")[severe_col].transform(_roll)

    out["next_severe_raw"] = out.groupby("지역")["중대사고율_raw"].shift(-1)
    out["next_severe_eb"] = out.groupby("지역")["중대사고율_eb"].shift(-1)
    out["next_period_label"] = out.groupby("지역")["period_label"].shift(-1)
    return out


def feature_list(max_lag: int) -> list[str]:
    cols = [
        "지역_code",
        "season",
        "연도_idx",
        "rate_t",
        "count_t",
        "severe_t",
        "rate_roll",
        "count_roll",
        "severe_roll",
    ]
    for lag in range(1, max_lag + 1):
        cols += [f"rate_lag{lag}", f"count_lag{lag}", f"severe_lag{lag}"]
    return cols


def run_one(
    panel: pd.DataFrame,
    *,
    name: str,
    train_target: str,
    eval_target: str,
    max_lag: int,
    test_years: set[int],
) -> dict:
    le = LabelEncoder()
    work = panel.copy()
    work["지역_code"] = le.fit_transform(work["지역"].astype(str))
    feats = feature_list(max_lag)
    need = feats + [train_target, eval_target, "next_period_label", "period_id"]
    work = work.dropna(subset=need).copy()

    next_year = work["next_period_label"].astype(str).str.slice(0, 4).astype(int)
    te = next_year.isin(test_years)
    tr = ~te
    if te.sum() < 8 or tr.sum() < 20:
        cut = work["period_id"].quantile(0.8)
        tr = work["period_id"] < cut
        te = ~tr

    X_tr = work.loc[tr, feats]
    X_te = work.loc[te, feats]
    y_tr = work.loc[tr, train_target].to_numpy()
    y_te_train_scale = work.loc[te, train_target].to_numpy()
    y_te_eval = work.loc[te, eval_target].to_numpy()

    model = HistGradientBoostingRegressor(
        max_depth=6,
        learning_rate=0.08,
        max_iter=300,
        min_samples_leaf=8,
        l2_regularization=0.1,
        random_state=42,
    )
    model.fit(X_tr, y_tr)
    pred = np.clip(model.predict(X_te), 0.0, 1.0)

    def pack(y_true, tag: str) -> dict:
        return {
            "tag": tag,
            "r2": float(r2_score(y_true, pred)),
            "rmse": float(root_mean_squared_error(y_true, pred)),
            "mae": float(mean_absolute_error(y_true, pred)),
            "mae_pp": float(mean_absolute_error(y_true, pred) * 100),
        }

    # ranking: region mean predicted vs actual on test
    tmp = work.loc[te, ["지역"]].copy()
    tmp["pred"] = pred
    tmp["actual"] = y_te_eval
    rank = tmp.groupby("지역")[["pred", "actual"]].mean()
    spearman = float(rank["pred"].corr(rank["actual"], method="spearman")) if len(rank) > 2 else None

    return {
        "name": name,
        "n_train": int(tr.sum()),
        "n_test": int(te.sum()),
        "n_regions": int(work["지역"].nunique()),
        "train_target": train_target,
        "metrics_vs_train_target": pack(y_te_train_scale, "vs_train_target"),
        "metrics_vs_raw": pack(y_te_eval if eval_target.endswith("raw") else y_te_eval, "vs_eval_target"),
        "spearman_region_rank": spearman,
    }


def plot_results(results: list[dict]) -> None:
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    plt.rcParams["font.family"] = "Malgun Gothic"
    plt.rcParams["axes.unicode_minus"] = False

    labels = [r["name"] for r in results]
    # Prefer vs_raw for fair comparison when available
    r2s = []
    maes = []
    for r in results:
        m = r["metrics_vs_raw"]
        # for EB-trained models evaluated on raw
        r2s.append(m["r2"])
        maes.append(m["mae_pp"])

    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
    colors = ["#4C78A8", "#72B7B2", "#F58518", "#E45756", "#54A24B", "#B279A2"]
    axes[0].bar(labels, r2s, color=colors[: len(labels)])
    axes[0].set_title("중대사고율 R² (평가=raw next)")
    axes[0].tick_params(axis="x", rotation=20)
    axes[0].axhline(0, color="#333", lw=0.8)
    for i, v in enumerate(r2s):
        axes[0].text(i, v + 0.01, f"{v:.3f}", ha="center", fontsize=8)

    axes[1].bar(labels, maes, color=colors[: len(labels)])
    axes[1].set_title("MAE (%p, 평가=raw next)")
    axes[1].tick_params(axis="x", rotation=20)
    for i, v in enumerate(maes):
        axes[1].text(i, v + 0.05, f"{v:.2f}", ha="center", fontsize=8)

    fig.suptitle("GovGuard 중대율 개선 실험: EB 스무딩 / 반기 집계", fontsize=13)
    fig.tight_layout()
    fig.savefig(FIG_DIR / "severe_r2_mae.png", dpi=140, bbox_inches="tight")
    plt.close()


def write_md(results: list[dict]) -> None:
    lines = [
        "# GovGuard 중대사고율 개선 실험",
        "",
        f"EB prior strength α = {ALPHA}",
        "",
        "## 결과 (평가 타깃 = **raw** next 중대사고율)",
        "",
        "| 실험 | n_train | n_test | R² | RMSE | MAE(%p) | 지역순위 Spearman |",
        "|------|---------|--------|----|------|---------|-------------------|",
    ]
    for r in results:
        m = r["metrics_vs_raw"]
        sp = r["spearman_region_rank"]
        sp_s = f"{sp:.3f}" if sp is not None else "-"
        lines.append(
            f"| {r['name']} | {r['n_train']} | {r['n_test']} | "
            f"{m['r2']:.4f} | {m['rmse']:.4f} | {m['mae_pp']:.2f} | {sp_s} |"
        )

    lines += [
        "",
        "## 참고: train 타깃 스케일에서의 지표",
        "",
        "| 실험 | train 타깃 | R² | MAE(%p) |",
        "|------|------------|----|---------|",
    ]
    for r in results:
        m = r["metrics_vs_train_target"]
        lines.append(
            f"| {r['name']} | {r['train_target']} | {m['r2']:.4f} | {m['mae_pp']:.2f} |"
        )

    lines += [
        "",
        "## 실험 설명",
        "",
        "- **Q_raw**: 분기 집계, 중대율 raw 타깃 (v1.0.1과 동일 계열)",
        "- **Q_eb**: 분기 집계, 중대율 EB 스무딩 타깃으로 학습 → raw로 평가",
        "- **H_raw**: 반기 집계, raw 타깃",
        "- **H_eb**: 반기 집계, EB 타깃 학습 → raw로 평가",
        "",
        "실무 판단은 **vs raw** 지표를 우선합니다.",
        "",
        f"그래프: `docs/figures/gov_severe_experiments/severe_r2_mae.png`",
        "",
    ]
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    print("=== Gov severe-rate experiments ===")
    raw = load_raw()
    print(f"raw rows: {len(raw):,}")

    q = build_panel(raw, freq="Q")
    h = build_panel(raw, freq="H")

    experiments = []

    # Quarter raw
    pq = add_features(q, severe_col="중대사고율_raw", max_lag=4)
    experiments.append(
        run_one(
            pq,
            name="Q_raw",
            train_target="next_severe_raw",
            eval_target="next_severe_raw",
            max_lag=4,
            test_years={2024, 2025},
        )
    )

    # Quarter EB train, eval raw
    pq_eb = add_features(q, severe_col="중대사고율_eb", max_lag=4)
    experiments.append(
        run_one(
            pq_eb,
            name="Q_eb",
            train_target="next_severe_eb",
            eval_target="next_severe_raw",
            max_lag=4,
            test_years={2024, 2025},
        )
    )

    # Quarter EB features, raw target (hybrid)
    pq_hyb = add_features(q, severe_col="중대사고율_eb", max_lag=4)
    experiments.append(
        run_one(
            pq_hyb,
            name="Q_ebFeat_rawY",
            train_target="next_severe_raw",
            eval_target="next_severe_raw",
            max_lag=4,
            test_years={2024, 2025},
        )
    )

    # Half-year raw (lag 2 = 1 year)
    ph = add_features(h, severe_col="중대사고율_raw", max_lag=2)
    experiments.append(
        run_one(
            ph,
            name="H_raw",
            train_target="next_severe_raw",
            eval_target="next_severe_raw",
            max_lag=2,
            test_years={2024, 2025},
        )
    )

    # Half-year EB
    ph_eb = add_features(h, severe_col="중대사고율_eb", max_lag=2)
    experiments.append(
        run_one(
            ph_eb,
            name="H_eb",
            train_target="next_severe_eb",
            eval_target="next_severe_raw",
            max_lag=2,
            test_years={2024, 2025},
        )
    )

    for r in experiments:
        m = r["metrics_vs_raw"]
        print(
            f"{r['name']}: R2={m['r2']:.4f} MAE={m['mae_pp']:.2f}%p "
            f"spearman={r['spearman_region_rank']}"
        )

    plot_results(experiments)
    payload = {"alpha": ALPHA, "results": experiments}
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_md(experiments)
    print(f"wrote {OUT_MD}")
    print(f"wrote {OUT_JSON}")

    # pick best by R2 vs raw
    best = max(experiments, key=lambda r: r["metrics_vs_raw"]["r2"])
    print(f"BEST vs raw: {best['name']} R2={best['metrics_vs_raw']['r2']:.4f}")


if __name__ == "__main__":
    main()
