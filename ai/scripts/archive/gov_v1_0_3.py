# -*- coding: utf-8 -*-
"""
GovGuard AI v1.0.3 — 보관·재현용

현재 서빙/학습 단위는 scripts/gov_v1_0_4.py 입니다.
이 파일은 v1.0.3(건수 회귀 메인) 재현·실험 비교용으로 남깁니다.
"""

from __future__ import annotations

import pickle
import warnings
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from sklearn.preprocessing import LabelEncoder

warnings.filterwarnings("ignore", category=UserWarning)

ROOT = Path(__file__).resolve().parents[2]  # scripts/archive -> ai
DATA_PATH = ROOT / "data" / "raw" / "사고분석_2016~2025_원본합본.csv"
MODEL_DIR = ROOT / "models"
FIG_DIR = ROOT / "docs" / "figures" / "gov_v1_0_3"

MODEL_NAME = "GovGuard AI"
MODEL_VERSION = "1.0.3"
MODEL_FILENAME = f"gov_model_v{MODEL_VERSION}.pkl"
COUNT_WEIGHT_POWER = 1.0  # w = n^power (1.0=건수, 0.5=sqrt)

SEVERITY_ORDER = ["사망사고", "중상사고", "경상사고", "부상신고사고"]
EB_ALPHA = 40.0

FEATURE_COLS = [
    "지역_code",
    "분기",
    "연도_idx",
    "rate_t",
    "rate_lag1",
    "rate_lag2",
    "rate_lag3",
    "rate_lag4",
    "count_t",
    "count_lag1",
    "count_lag2",
    "rate_roll4",
    "count_roll4",
    "severe_t",
    "severe_lag1",
    "severe_lag2",
    "severe_lag3",
    "severe_lag4",
    "severe_roll4",
    "death_share_t",
    "serious_share_t",
]

HALF_FEATURE_COLS = [
    "지역_code",
    "반기",
    "연도_idx",
    "rate_t",
    "rate_lag1",
    "rate_lag2",
    "count_t",
    "count_lag1",
    "count_lag2",
    "rate_roll2",
    "count_roll2",
    "severe_t",
    "severe_lag1",
    "severe_lag2",
    "severe_roll2",
    "death_share_t",
    "serious_share_t",
]


def parse_year_quarter(series: pd.Series) -> pd.DataFrame:
    text = series.astype(str).str.replace(" ", "", regex=False)
    year = text.str.extract(r"(\d{4})년")[0].astype(int)
    month = text.str.extract(r"년(\d{1,2})월")[0].astype(int)
    quarter = ((month - 1) // 3) + 1
    return pd.DataFrame(
        {
            "연도": year,
            "분기": quarter,
            "연도분기": year.astype(str) + "Q" + quarter.astype(str),
            "period_id": year * 4 + (quarter - 1),
        }
    )


def load_raw(path: Path = DATA_PATH) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="utf-8-sig")
    df["지역"] = df["시군구"].astype(str).str.replace(
        r"^대구광역시\s*", "", regex=True
    )
    yq = parse_year_quarter(df["발생년월"])
    df = pd.concat([df, yq], axis=1)
    df["반기"] = np.where(df["분기"] <= 2, 1, 2)
    df["연도반기"] = df["연도"].astype(str) + "H" + df["반기"].astype(str)
    df["period_h"] = df["연도"] * 2 + (df["반기"] - 1)
    df = df.dropna(subset=["지역", "연도", "분기", "사고내용"])
    df = df[df["지역"].astype(str).str.len() > 0]
    df = df[df["사고내용"].isin(SEVERITY_ORDER)]
    return df.reset_index(drop=True)


def _apply_eb_rates(panel: pd.DataFrame) -> pd.DataFrame:
    """중대율·경중 비율에 EB 스무딩 적용."""
    out = panel.copy()
    out["중대사고율_raw"] = out["중대건수"] / out["사고건수"].clip(lower=1)
    p_bar = float(out["중대건수"].sum() / max(out["사고건수"].sum(), 1))
    out["중대사고율"] = (out["중대건수"] + EB_ALPHA * p_bar) / (
        out["사고건수"] + EB_ALPHA
    )
    for col in SEVERITY_ORDER:
        raw = out[col] / out["사고건수"].clip(lower=1)
        out[f"{col}_비율_raw"] = raw
        p_c = float(out[col].sum() / max(out["사고건수"].sum(), 1))
        out[f"{col}_비율"] = (out[col] + EB_ALPHA * p_c) / (out["사고건수"] + EB_ALPHA)
    return out


def build_region_quarter_panel(df: pd.DataFrame) -> pd.DataFrame:
    """지역 × 분기: 건수·점유율·중대사고율·경중 구성 (+EB)."""
    keys = ["지역", "연도", "분기", "연도분기", "period_id"]
    g = df.groupby(keys, as_index=False).size().rename(columns={"size": "사고건수"})
    totals = (
        g.groupby("period_id", as_index=False)["사고건수"]
        .sum()
        .rename(columns={"사고건수": "전체건수"})
    )
    panel = g.merge(totals, on="period_id", how="left")
    panel["사고율"] = panel["사고건수"] / panel["전체건수"].clip(lower=1)

    sev = (
        df.groupby(keys + ["사고내용"], as_index=False)
        .size()
        .rename(columns={"size": "경중건수"})
    )
    sev_pivot = (
        sev.pivot_table(
            index=keys, columns="사고내용", values="경중건수", aggfunc="sum", fill_value=0
        )
        .reset_index()
    )
    for col in SEVERITY_ORDER:
        if col not in sev_pivot.columns:
            sev_pivot[col] = 0

    panel = panel.merge(sev_pivot, on=keys, how="left")
    for col in SEVERITY_ORDER:
        panel[col] = panel[col].fillna(0).astype(int)

    panel["중대건수"] = panel["사망사고"] + panel["중상사고"]
    panel = _apply_eb_rates(panel)
    return panel.sort_values(["지역", "period_id"]).reset_index(drop=True)


def build_region_halfyear_panel(df: pd.DataFrame) -> pd.DataFrame:
    """지역 × 반기 패널 (+EB)."""
    keys = ["지역", "연도", "반기", "연도반기", "period_h"]
    g = df.groupby(keys, as_index=False).size().rename(columns={"size": "사고건수"})
    totals = (
        g.groupby("period_h", as_index=False)["사고건수"]
        .sum()
        .rename(columns={"사고건수": "전체건수"})
    )
    panel = g.merge(totals, on="period_h", how="left")
    panel["사고율"] = panel["사고건수"] / panel["전체건수"].clip(lower=1)
    panel["period_id"] = panel["period_h"]

    sev = (
        df.groupby(keys + ["사고내용"], as_index=False)
        .size()
        .rename(columns={"size": "경중건수"})
    )
    sev_pivot = (
        sev.pivot_table(
            index=keys, columns="사고내용", values="경중건수", aggfunc="sum", fill_value=0
        )
        .reset_index()
    )
    for col in SEVERITY_ORDER:
        if col not in sev_pivot.columns:
            sev_pivot[col] = 0
    panel = panel.merge(sev_pivot, on=keys, how="left")
    for col in SEVERITY_ORDER:
        panel[col] = panel[col].fillna(0).astype(int)
    panel["중대건수"] = panel["사망사고"] + panel["중상사고"]
    panel = _apply_eb_rates(panel)
    return panel.sort_values(["지역", "period_id"]).reset_index(drop=True)


def add_lag_features(panel: pd.DataFrame) -> pd.DataFrame:
    """분기 패널: lag/roll + next 타깃 (중대·경중은 EB 컬럼 기준)."""
    out = panel.copy()
    out["연도_idx"] = out["연도"] - int(out["연도"].min())
    out["rate_t"] = out["사고율"]
    out["count_t"] = out["사고건수"].astype(float)
    out["severe_t"] = out["중대사고율"]
    out["death_share_t"] = out["사망사고_비율"]
    out["serious_share_t"] = out["중상사고_비율"]

    for lag in (1, 2, 3, 4):
        out[f"rate_lag{lag}"] = out.groupby("지역")["사고율"].shift(lag)
        out[f"count_lag{lag}"] = out.groupby("지역")["사고건수"].shift(lag)
        out[f"severe_lag{lag}"] = out.groupby("지역")["중대사고율"].shift(lag)

    def _roll(s: pd.Series) -> pd.Series:
        return s.shift(1).rolling(4, min_periods=2).mean()

    out["rate_roll4"] = out.groupby("지역")["사고율"].transform(_roll)
    out["count_roll4"] = out.groupby("지역")["사고건수"].transform(_roll)
    out["severe_roll4"] = out.groupby("지역")["중대사고율"].transform(_roll)

    out["next_사고율"] = out.groupby("지역")["사고율"].shift(-1)
    out["next_사고건수"] = out.groupby("지역")["사고건수"].shift(-1)
    out["next_중대사고율"] = out.groupby("지역")["중대사고율"].shift(-1)
    out["next_중대사고율_raw"] = out.groupby("지역")["중대사고율_raw"].shift(-1)
    out["next_연도분기"] = out.groupby("지역")["연도분기"].shift(-1)
    for col in SEVERITY_ORDER:
        out[f"next_{col}_비율"] = out.groupby("지역")[f"{col}_비율"].shift(-1)
    return out


def add_lag_features_half(panel: pd.DataFrame) -> pd.DataFrame:
    """반기 패널: lag/roll + next 중대율 (순위 보조 모델용)."""
    out = panel.copy()
    out["연도_idx"] = out["연도"] - int(out["연도"].min())
    out["rate_t"] = out["사고율"]
    out["count_t"] = out["사고건수"].astype(float)
    out["severe_t"] = out["중대사고율"]
    out["death_share_t"] = out["사망사고_비율"]
    out["serious_share_t"] = out["중상사고_비율"]

    for lag in (1, 2):
        out[f"rate_lag{lag}"] = out.groupby("지역")["사고율"].shift(lag)
        out[f"count_lag{lag}"] = out.groupby("지역")["사고건수"].shift(lag)
        out[f"severe_lag{lag}"] = out.groupby("지역")["중대사고율"].shift(lag)

    def _roll2(s: pd.Series) -> pd.Series:
        return s.shift(1).rolling(2, min_periods=1).mean()

    out["rate_roll2"] = out.groupby("지역")["사고율"].transform(_roll2)
    out["count_roll2"] = out.groupby("지역")["사고건수"].transform(_roll2)
    out["severe_roll2"] = out.groupby("지역")["중대사고율"].transform(_roll2)

    out["next_중대사고율"] = out.groupby("지역")["중대사고율"].shift(-1)
    out["next_중대사고율_raw"] = out.groupby("지역")["중대사고율_raw"].shift(-1)
    out["next_연도반기"] = out.groupby("지역")["연도반기"].shift(-1)
    return out


def encode_region(panel: pd.DataFrame, le: LabelEncoder | None = None):
    fitted = le is None
    le = LabelEncoder() if le is None else le
    out = panel.copy()
    if fitted:
        out["지역_code"] = le.fit_transform(out["지역"].astype(str))
    else:
        known = set(le.classes_)
        vals = out["지역"].astype(str).tolist()
        fallback = str(le.classes_[0])
        safe = [v if v in known else fallback for v in vals]
        out["지역_code"] = le.transform(safe)
    return out, le


def prepare_work(panel: pd.DataFrame) -> pd.DataFrame:
    need = FEATURE_COLS + [
        "next_사고율",
        "next_사고건수",
        "next_중대사고율",
        "지역",
        "연도분기",
        "next_연도분기",
    ] + [f"next_{c}_비율" for c in SEVERITY_ORDER]
    return panel.dropna(subset=need).copy()


def prepare_work_half(panel: pd.DataFrame) -> pd.DataFrame:
    need = HALF_FEATURE_COLS + [
        "next_중대사고율",
        "지역",
        "연도반기",
        "next_연도반기",
    ]
    return panel.dropna(subset=need).copy()


def time_split_mask(
    work: pd.DataFrame,
    next_label_col: str = "next_연도분기",
    test_years: set[int] | None = None,
):
    test_years = test_years or {2024, 2025}
    next_year = work[next_label_col].astype(str).str.slice(0, 4).astype(int)
    is_test = next_year.isin(test_years)
    return ~is_test, is_test


def _count_weights(counts: np.ndarray) -> np.ndarray:
    w = np.asarray(counts, dtype=float).clip(min=1.0) ** COUNT_WEIGHT_POWER
    return w / w.mean()


def _metrics(y_true, y_pred, *, sample_weight=None, as_percent: bool = False) -> dict:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    sw = sample_weight
    out = {
        "r2": float(r2_score(y_true, y_pred, sample_weight=sw)),
        "rmse": float(root_mean_squared_error(y_true, y_pred, sample_weight=sw)),
        "mae": float(mean_absolute_error(y_true, y_pred, sample_weight=sw)),
    }
    if as_percent:
        out["mae_percent_points"] = out["mae"] * 100
    return out


def _top_k_hit_rate(
    work: pd.DataFrame,
    te_mask: pd.Series,
    y_true: np.ndarray,
    y_pred: np.ndarray,
    *,
    k: int = 3,
    period_col: str = "next_연도분기",
) -> float:
    """기간별 true/pred Top-k 지역 집합 Jaccard 평균."""
    te = work.loc[te_mask].copy()
    te = te.assign(_y=y_true, _p=y_pred)
    scores = []
    for _, g in te.groupby(period_col):
        if len(g) < k:
            continue
        true_top = set(g.nlargest(k, "_y")["지역"].astype(str))
        pred_top = set(g.nlargest(k, "_p")["지역"].astype(str))
        scores.append(len(true_top & pred_top) / k)
    return float(np.mean(scores)) if scores else float("nan")


def _fit_regressor(
    X_tr,
    y_tr,
    X_te,
    y_te,
    name: str,
    *,
    sample_weight=None,
    clip: tuple[float, float] | None = (0.0, 1.0),
    as_percent: bool = True,
    eval_weight=None,
) -> tuple:
    model = HistGradientBoostingRegressor(
        max_depth=6,
        learning_rate=0.08,
        max_iter=300,
        min_samples_leaf=8,
        l2_regularization=0.1,
        random_state=42,
    )
    model.fit(X_tr, y_tr, sample_weight=sample_weight)
    pred = model.predict(X_te)
    if clip is not None:
        lo, hi = clip
        pred = np.clip(pred, lo, hi)
    metrics = _metrics(y_te, pred, sample_weight=None, as_percent=as_percent)
    w_metrics = None
    if eval_weight is not None:
        w_metrics = _metrics(y_te, pred, sample_weight=eval_weight, as_percent=as_percent)
        metrics["weighted"] = w_metrics
    extra = ""
    if as_percent and "mae_percent_points" in metrics:
        extra = f" ({metrics['mae_percent_points']:.2f}%p)"
    print(
        f"   [{name}] R²={metrics['r2']:.4f}  RMSE={metrics['rmse']:.4f}  "
        f"MAE={metrics['mae']:.4f}{extra}"
    )
    if w_metrics is not None:
        wextra = (
            f" ({w_metrics['mae_percent_points']:.2f}%p)"
            if as_percent and "mae_percent_points" in w_metrics
            else ""
        )
        print(
            f"           weighted R²={w_metrics['r2']:.4f}  "
            f"MAE={w_metrics['mae']:.4f}{wextra}"
        )
    return model, metrics, pred


def train_models(df: pd.DataFrame | None = None) -> dict:
    raw = df if df is not None else load_raw()

    # --- 분기 (지도·대응 메인) ---
    panel = build_region_quarter_panel(raw)
    panel = add_lag_features(panel)
    panel, region_le = encode_region(panel)
    work = prepare_work(panel)

    tr_mask, te_mask = time_split_mask(work, "next_연도분기")
    if te_mask.sum() < 10 or tr_mask.sum() < 20:
        cutoff = work["period_id"].quantile(0.8)
        tr_mask = work["period_id"] < cutoff
        te_mask = ~tr_mask

    X_tr = work.loc[tr_mask, FEATURE_COLS]
    X_te = work.loc[te_mask, FEATURE_COLS]
    w_tr = _count_weights(work.loc[tr_mask, "next_사고건수"].to_numpy())
    w_te = _count_weights(work.loc[te_mask, "next_사고건수"].to_numpy())

    print("\n모델 학습 (분기 Q - 건수 가중 점유율 + 건수 회귀)...")
    print(f"   regions={list(region_le.classes_)}")
    print(f"   n_train={len(X_tr):,}  n_test={len(X_te):,}")
    print(f"   sample_weight = next_사고건수^{COUNT_WEIGHT_POWER} (mean-normalized)")

    rate_reg, rate_m, rate_pred = _fit_regressor(
        X_tr,
        work.loc[tr_mask, "next_사고율"].to_numpy(),
        X_te,
        work.loc[te_mask, "next_사고율"].to_numpy(),
        "Share Rate (count-weighted)",
        sample_weight=w_tr,
        eval_weight=w_te,
        clip=(0.0, 1.0),
        as_percent=True,
    )
    rate_m["top3_hit_rate"] = _top_k_hit_rate(
        work,
        te_mask,
        work.loc[te_mask, "next_사고율"].to_numpy(),
        rate_pred,
        k=3,
    )
    print(f"   [Share Top-3 hit] {rate_m['top3_hit_rate']:.3f}")

    y_count_tr = work.loc[tr_mask, "next_사고건수"].to_numpy(dtype=float)
    y_count_te = work.loc[te_mask, "next_사고건수"].to_numpy(dtype=float)
    count_reg, count_m, count_pred = _fit_regressor(
        X_tr,
        y_count_tr,
        X_te,
        y_count_te,
        "Accident Count",
        sample_weight=w_tr,
        eval_weight=w_te,
        clip=(0.0, 1e9),
        as_percent=False,
    )
    count_m["top3_hit_rate"] = _top_k_hit_rate(
        work, te_mask, y_count_te, count_pred, k=3
    )
    print(f"   [Count Top-3 hit] {count_m['top3_hit_rate']:.3f}")

    severe_reg, severe_m, severe_pred = _fit_regressor(
        X_tr,
        work.loc[tr_mask, "next_중대사고율"].to_numpy(),
        X_te,
        work.loc[te_mask, "next_중대사고율"].to_numpy(),
        "Severe Rate (EB, aux)",
        clip=(0.0, 1.0),
        as_percent=True,
    )
    severe_vs_raw = _metrics(
        work.loc[te_mask, "next_중대사고율_raw"].to_numpy(), severe_pred
    )
    print(
        f"   [Severe vs raw] R²={severe_vs_raw['r2']:.4f}  "
        f"MAE={severe_vs_raw['mae'] * 100:.2f}%p"
    )

    severity_regs: dict[str, object] = {}
    severity_metrics: dict[str, dict] = {}
    for col in SEVERITY_ORDER:
        ycol = f"next_{col}_비율"
        m, met, _ = _fit_regressor(
            X_tr,
            work.loc[tr_mask, ycol].to_numpy(),
            X_te,
            work.loc[te_mask, ycol].to_numpy(),
            f"Sev {col} (EB, aux)",
            clip=(0.0, 1.0),
            as_percent=True,
        )
        severity_regs[col] = m
        severity_metrics[col] = met

    # --- 반기 (중대 순위 보조) ---
    h_panel = build_region_halfyear_panel(raw)
    h_panel = add_lag_features_half(h_panel)
    h_panel, _ = encode_region(h_panel, region_le)
    h_work = prepare_work_half(h_panel)
    h_tr, h_te = time_split_mask(h_work, "next_연도반기")
    if h_te.sum() < 5 or h_tr.sum() < 10:
        cutoff = h_work["period_id"].quantile(0.8)
        h_tr = h_work["period_id"] < cutoff
        h_te = ~h_tr

    Xh_tr = h_work.loc[h_tr, HALF_FEATURE_COLS]
    Xh_te = h_work.loc[h_te, HALF_FEATURE_COLS]
    print(f"\n모델 학습 (반기 H, EB 중대 보조)...")
    print(f"   n_train={len(Xh_tr):,}  n_test={len(Xh_te):,}")
    severe_h_reg, severe_h_m, severe_h_pred = _fit_regressor(
        Xh_tr,
        h_work.loc[h_tr, "next_중대사고율"].to_numpy(),
        Xh_te,
        h_work.loc[h_te, "next_중대사고율"].to_numpy(),
        "Severe Rate H (EB)",
        clip=(0.0, 1.0),
        as_percent=True,
    )
    severe_h_vs_raw = _metrics(
        h_work.loc[h_te, "next_중대사고율_raw"].to_numpy(), severe_h_pred
    )
    print(
        f"   [Severe H vs raw] R²={severe_h_vs_raw['r2']:.4f}  "
        f"MAE={severe_h_vs_raw['mae'] * 100:.2f}%p"
    )

    panel_cols = [
        "지역",
        "연도",
        "분기",
        "연도분기",
        "period_id",
        "사고건수",
        "전체건수",
        "사고율",
        "중대사고율",
        "중대사고율_raw",
        "사망사고",
        "중상사고",
        "경상사고",
        "부상신고사고",
        "사망사고_비율",
        "중상사고_비율",
        "경상사고_비율",
        "부상신고사고_비율",
    ]
    h_panel_cols = [
        "지역",
        "연도",
        "반기",
        "연도반기",
        "period_id",
        "사고건수",
        "전체건수",
        "사고율",
        "중대사고율",
        "중대사고율_raw",
        "사망사고_비율",
        "중상사고_비율",
    ]

    return {
        "name": MODEL_NAME,
        "version": MODEL_VERSION,
        "task": "region_next_quarter_volume_for_map_staffing",
        "primary_metric": "predicted_accident_count",
        "eb_alpha": EB_ALPHA,
        "count_weight_power": COUNT_WEIGHT_POWER,
        "rate_definition": "region_count / city_total_same_quarter",
        "severe_definition": "EB((death+serious)/region_count), alpha=40 (auxiliary)",
        "regressor": rate_reg,
        "rate_regressor": rate_reg,
        "count_regressor": count_reg,
        "severe_regressor": severe_reg,
        "severe_regressor_half": severe_h_reg,
        "severity_regressors": severity_regs,
        "region_encoder": region_le,
        "features": FEATURE_COLS,
        "features_half": HALF_FEATURE_COLS,
        "input_features": [],
        "severity_order": SEVERITY_ORDER,
        "panel_meta": {
            "regions": list(region_le.classes_),
            "n_panel_rows": int(len(panel)),
            "n_train": int(len(X_tr)),
            "n_test": int(len(X_te)),
            "n_half_train": int(len(Xh_tr)),
            "n_half_test": int(len(Xh_te)),
            "year_min": int(panel["연도"].min()),
            "year_max": int(panel["연도"].max()),
        },
        "metrics": {
            "share_rate": rate_m,
            "accident_count": count_m,
            "severe_rate": severe_m,
            "severe_rate_vs_raw": severe_vs_raw,
            "severe_rate_half": severe_h_m,
            "severe_rate_half_vs_raw": severe_h_vs_raw,
            "severity_shares": severity_metrics,
        },
        "latest_panel": panel[panel_cols].copy(),
        "latest_panel_half": h_panel[h_panel_cols].copy(),
    }


def _next_period(year: int, quarter: int) -> tuple[int, int, str, int]:
    if quarter == 4:
        ny, nq = year + 1, 1
    else:
        ny, nq = year, quarter + 1
    return ny, nq, f"{ny}Q{nq}", ny * 4 + (nq - 1)


def _next_half(year: int, half: int) -> tuple[int, int, str, int]:
    if half == 2:
        ny, nh = year + 1, 1
    else:
        ny, nh = year, 2
    return ny, nh, f"{ny}H{nh}", ny * 2 + (nh - 1)


def severe_level(severe_rate: float) -> str:
    if severe_rate >= 0.35:
        return "CRITICAL"
    if severe_rate >= 0.28:
        return "HIGH"
    if severe_rate >= 0.22:
        return "MODERATE"
    return "LOW"


def _build_feature_row(
    rh: pd.DataFrame, cur: pd.Series, package: dict, panel: pd.DataFrame
) -> dict | None:
    le = package["region_encoder"]
    region = str(cur["지역"])
    rates = rh["사고율"].tolist()
    counts = rh["사고건수"].astype(float).tolist()
    severes = rh["중대사고율"].tolist()
    deaths = rh["사망사고_비율"].tolist()
    serious = rh["중상사고_비율"].tolist()
    idx = list(rh.index).index(cur.name)

    def at(series: list[float], offset: int) -> float:
        pos = idx + offset
        return float(series[pos]) if 0 <= pos < len(series) else float("nan")

    feat = {
        "지역_code": int(le.transform([region])[0])
        if region in set(le.classes_)
        else 0,
        "분기": int(cur["분기"]),
        "연도_idx": int(cur["연도"]) - int(panel["연도"].min()),
        "rate_t": at(rates, 0),
        "rate_lag1": at(rates, -1),
        "rate_lag2": at(rates, -2),
        "rate_lag3": at(rates, -3),
        "rate_lag4": at(rates, -4),
        "count_t": at(counts, 0),
        "count_lag1": at(counts, -1),
        "count_lag2": at(counts, -2),
        "severe_t": at(severes, 0),
        "severe_lag1": at(severes, -1),
        "severe_lag2": at(severes, -2),
        "severe_lag3": at(severes, -3),
        "severe_lag4": at(severes, -4),
        "death_share_t": at(deaths, 0),
        "serious_share_t": at(serious, 0),
    }
    hist_r = [v for v in (at(rates, -k) for k in range(1, 5)) if not np.isnan(v)]
    hist_c = [v for v in (at(counts, -k) for k in range(1, 5)) if not np.isnan(v)]
    hist_s = [v for v in (at(severes, -k) for k in range(1, 5)) if not np.isnan(v)]
    feat["rate_roll4"] = float(np.mean(hist_r)) if hist_r else float("nan")
    feat["count_roll4"] = float(np.mean(hist_c)) if hist_c else float("nan")
    feat["severe_roll4"] = float(np.mean(hist_s)) if hist_s else float("nan")
    if any(np.isnan(feat[c]) for c in package["features"]):
        return None
    return feat


def _build_feature_row_half(
    rh: pd.DataFrame, cur: pd.Series, package: dict, panel: pd.DataFrame
) -> dict | None:
    le = package["region_encoder"]
    region = str(cur["지역"])
    rates = rh["사고율"].tolist()
    counts = rh["사고건수"].astype(float).tolist()
    severes = rh["중대사고율"].tolist()
    deaths = rh["사망사고_비율"].tolist()
    serious = rh["중상사고_비율"].tolist()
    idx = list(rh.index).index(cur.name)
    feats = package["features_half"]

    def at(series: list[float], offset: int) -> float:
        pos = idx + offset
        return float(series[pos]) if 0 <= pos < len(series) else float("nan")

    feat = {
        "지역_code": int(le.transform([region])[0])
        if region in set(le.classes_)
        else 0,
        "반기": int(cur["반기"]),
        "연도_idx": int(cur["연도"]) - int(panel["연도"].min()),
        "rate_t": at(rates, 0),
        "rate_lag1": at(rates, -1),
        "rate_lag2": at(rates, -2),
        "count_t": at(counts, 0),
        "count_lag1": at(counts, -1),
        "count_lag2": at(counts, -2),
        "severe_t": at(severes, 0),
        "severe_lag1": at(severes, -1),
        "severe_lag2": at(severes, -2),
        "death_share_t": at(deaths, 0),
        "serious_share_t": at(serious, 0),
    }
    hist_r = [v for v in (at(rates, -k) for k in range(1, 3)) if not np.isnan(v)]
    hist_c = [v for v in (at(counts, -k) for k in range(1, 3)) if not np.isnan(v)]
    hist_s = [v for v in (at(severes, -k) for k in range(1, 3)) if not np.isnan(v)]
    feat["rate_roll2"] = float(np.mean(hist_r)) if hist_r else float("nan")
    feat["count_roll2"] = float(np.mean(hist_c)) if hist_c else float("nan")
    feat["severe_roll2"] = float(np.mean(hist_s)) if hist_s else float("nan")
    if any(np.isnan(feat[c]) for c in feats):
        return None
    return feat


def predict_next_quarter(
    package: dict,
    지역: str | None = None,
    as_of_연도분기: str | None = None,
) -> list[dict] | dict:
    """기본 추론: 다음 분기 예상 건수(메인) + 점유율 + EB 중대(보조)."""
    panel = package["latest_panel"].copy()
    if as_of_연도분기 is None:
        as_of_연도분기 = str(panel["연도분기"].iloc[panel["period_id"].argmax()])

    base = panel[panel["연도분기"] == as_of_연도분기]
    if base.empty:
        raise ValueError(f"기준 분기 없음: {as_of_연도분기}")

    year = int(base["연도"].iloc[0])
    quarter = int(base["분기"].iloc[0])
    _, _, nlabel, _ = _next_period(year, quarter)

    rate_reg = package.get("rate_regressor") or package["regressor"]
    count_reg = package.get("count_regressor")
    severe_reg = package["severe_regressor"]
    sev_regs = package["severity_regressors"]
    le = package["region_encoder"]
    hist = panel.sort_values(["지역", "period_id"])
    regions = [지역] if 지역 else list(le.classes_)
    rows: list[dict] = []

    for region in regions:
        rh = hist[hist["지역"] == region].sort_values("period_id")
        if rh.empty or as_of_연도분기 not in set(rh["연도분기"].astype(str)):
            continue
        cur = rh[rh["연도분기"] == as_of_연도분기].iloc[0]
        feat = _build_feature_row(rh, cur, package, panel)
        if feat is None:
            continue
        X = pd.DataFrame([feat])[package["features"]]
        share = float(np.clip(rate_reg.predict(X)[0], 0.0, 1.0))
        severe = float(np.clip(severe_reg.predict(X)[0], 0.0, 1.0))
        sev_shares = {
            col: float(np.clip(sev_regs[col].predict(X)[0], 0.0, 1.0))
            for col in package["severity_order"]
        }
        ssum = sum(sev_shares.values()) or 1.0
        sev_shares = {k: v / ssum for k, v in sev_shares.items()}

        city_total = float(cur["전체건수"])
        share_count = int(round(share * city_total))
        if count_reg is not None:
            pred_count = int(round(float(np.clip(count_reg.predict(X)[0], 0.0, None))))
        else:
            pred_count = share_count
        pred_severe_count = int(round(pred_count * severe))
        raw_ref = float(cur.get("중대사고율_raw", cur["중대사고율"]))

        rows.append(
            {
                "모델": package["name"],
                "버전": package["version"],
                "주기": "Q",
                "지역": region,
                "기준분기": as_of_연도분기,
                "예측분기": nlabel,
                # 메인 (지도·대응)
                "예측사고건수": pred_count,
                "예측사고율": round(share, 4),
                "예측사고율_퍼센트": round(share * 100, 2),
                "추정_다음분기사고건수": pred_count,
                "추정_점유율기반사고건수": share_count,
                # 보조 (중대 레이어)
                "예측중대사고율": round(severe, 4),
                "예측중대사고율_퍼센트": round(severe * 100, 2),
                "중대사고등급": severe_level(severe),
                "예측사고경중비율": {
                    k: round(v, 4) for k, v in sev_shares.items()
                },
                "예측사고경중_퍼센트": {
                    k: round(v * 100, 2) for k, v in sev_shares.items()
                },
                "추정_다음분기중대사고건수": pred_severe_count,
                "참고_기준분기사고건수": int(cur["사고건수"]),
                "참고_기준분기사고율_퍼센트": round(float(cur["사고율"]) * 100, 2),
                "참고_기준분기중대사고율_퍼센트": round(
                    float(cur["중대사고율"]) * 100, 2
                ),
                "참고_기준분기중대사고율_raw_퍼센트": round(raw_ref * 100, 2),
            }
        )

    if 지역 is not None:
        if not rows:
            raise ValueError(f"예측 불가: 지역={지역}, as_of={as_of_연도분기}")
        return rows[0]
    rows.sort(key=lambda r: r["예측사고건수"], reverse=True)
    return rows

def predict_quarter_history(
    package: dict,
    지역: str,
    n_history: int = 3,
    as_of_연도분기: str | None = None,
) -> dict:
    """직전 n_history분기 실적 + 다음 분기 예측 (누적막대용 경중 포함)."""
    panel = package["latest_panel"].copy()
    rh = panel[panel["지역"] == 지역].sort_values("period_id")
    if rh.empty:
        raise ValueError(f"지역 없음: {지역}")

    if as_of_연도분기 is None:
        as_of_연도분기 = str(rh["연도분기"].iloc[-1])
    rh = rh[rh["period_id"] <= rh.loc[rh["연도분기"] == as_of_연도분기, "period_id"].iloc[0]]
    past = rh.tail(n_history)

    history = []
    for _, cur in past.iterrows():
        history.append({
            "분기": str(cur["연도분기"]),
            "사고건수": int(cur["사고건수"]),
            "중대사고율_퍼센트": round(float(cur["중대사고율"]) * 100, 2),
            "경중_건수": {col: int(cur[col]) for col in SEVERITY_ORDER},
            "경중_퍼센트": {
                col: round(float(cur[f"{col}_비율"]) * 100, 2)
                for col in SEVERITY_ORDER
            },
            "kind": "actual",
        })

    forecast_row = predict_next_quarter(
        package, 지역=지역, as_of_연도분기=as_of_연도분기
    )
    # forecast_row는 dict (지역 지정 시)
    pred_count = int(forecast_row["예측사고건수"])
    sev_pct = forecast_row["예측사고경중_퍼센트"]
    forecast = {
        "분기": forecast_row["예측분기"],
        "사고건수": pred_count,
        "중대사고율_퍼센트": forecast_row["예측중대사고율_퍼센트"],
        "경중_건수": {
            k: int(round(pred_count * (v / 100.0)))
            for k, v in sev_pct.items()
        },
        "경중_퍼센트": sev_pct,
        "kind": "forecast",
        "기준분기": forecast_row["기준분기"],
    }
    return {
        "지역": 지역,
        "history": history,
        "forecast": forecast,
    }

def predict_next_half(
    package: dict,
    지역: str | None = None,
    as_of_연도반기: str | None = None,
) -> list[dict] | dict:
    """보조 추론: 다음 반기 EB 중대사고율 (순위용)."""
    panel = package["latest_panel_half"].copy()
    if as_of_연도반기 is None:
        as_of_연도반기 = str(panel["연도반기"].iloc[panel["period_id"].argmax()])

    base = panel[panel["연도반기"] == as_of_연도반기]
    if base.empty:
        raise ValueError(f"기준 반기 없음: {as_of_연도반기}")

    year = int(base["연도"].iloc[0])
    half = int(base["반기"].iloc[0])
    _, _, nlabel, _ = _next_half(year, half)

    severe_reg = package["severe_regressor_half"]
    le = package["region_encoder"]
    hist = panel.sort_values(["지역", "period_id"])
    regions = [지역] if 지역 else list(le.classes_)
    rows: list[dict] = []

    for region in regions:
        rh = hist[hist["지역"] == region].sort_values("period_id")
        if rh.empty or as_of_연도반기 not in set(rh["연도반기"].astype(str)):
            continue
        cur = rh[rh["연도반기"] == as_of_연도반기].iloc[0]
        feat = _build_feature_row_half(rh, cur, package, panel)
        if feat is None:
            continue
        X = pd.DataFrame([feat])[package["features_half"]]
        severe = float(np.clip(severe_reg.predict(X)[0], 0.0, 1.0))
        raw_ref = float(cur.get("중대사고율_raw", cur["중대사고율"]))
        rows.append(
            {
                "모델": package["name"],
                "버전": package["version"],
                "주기": "H",
                "지역": region,
                "기준반기": as_of_연도반기,
                "예측반기": nlabel,
                "예측중대사고율": round(severe, 4),
                "예측중대사고율_퍼센트": round(severe * 100, 2),
                "중대사고등급": severe_level(severe),
                "참고_기준반기사고건수": int(cur["사고건수"]),
                "참고_기준반기중대사고율_퍼센트": round(
                    float(cur["중대사고율"]) * 100, 2
                ),
                "참고_기준반기중대사고율_raw_퍼센트": round(raw_ref * 100, 2),
            }
        )

    if 지역 is not None:
        if not rows:
            raise ValueError(f"예측 불가: 지역={지역}, as_of={as_of_연도반기}")
        return rows[0]
    rows.sort(key=lambda r: r["예측중대사고율"], reverse=True)
    return rows


def predict_next(
    package: dict,
    *,
    freq: str = "Q",
    지역: str | None = None,
    as_of: str | None = None,
) -> list[dict] | dict:
    """freq='Q' 분기(기본) / 'H' 반기(중대율 순위)."""
    if freq.upper() == "H":
        return predict_next_half(package, 지역=지역, as_of_연도반기=as_of)
    return predict_next_quarter(package, 지역=지역, as_of_연도분기=as_of)

def save_package(package: dict) -> Path:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    path = MODEL_DIR / MODEL_FILENAME
    with open(path, "wb") as f:
        pickle.dump(package, f)
    return path


def _setup_font() -> None:
    plt.rcParams["font.family"] = "Malgun Gothic"
    plt.rcParams["axes.unicode_minus"] = False


def plot_region_severe(panel: pd.DataFrame, outfile: Path) -> None:
    _setup_font()
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    pivot = panel.pivot_table(
        index="연도분기", columns="지역", values="중대사고율", aggfunc="first"
    )
    pivot = pivot.reindex(sorted(pivot.index, key=lambda s: (int(s[:4]), int(s[-1]))))
    fig, ax = plt.subplots(figsize=(12, 5.5))
    for col in pivot.columns:
        ax.plot(pivot.index, pivot[col] * 100, marker="o", markersize=2, label=col)
    ax.set_title("지역별 분기 중대사고율 EB(%) — 보조 레이어")
    ax.set_ylabel("중대사고율 EB (%)")
    ax.legend(ncol=3, fontsize=8)
    plt.xticks(rotation=45, ha="right", fontsize=7)
    fig.tight_layout()
    fig.savefig(outfile, dpi=140, bbox_inches="tight")
    plt.close()


def plot_region_counts(panel: pd.DataFrame, outfile: Path) -> None:
    _setup_font()
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    pivot = panel.pivot_table(
        index="연도분기", columns="지역", values="사고건수", aggfunc="first"
    )
    pivot = pivot.reindex(sorted(pivot.index, key=lambda s: (int(s[:4]), int(s[-1]))))
    fig, ax = plt.subplots(figsize=(12, 5.5))
    for col in pivot.columns:
        ax.plot(pivot.index, pivot[col], marker="o", markersize=2, label=col)
    ax.set_title("지역별 분기 사고건수 — 지도·대응 인력용 볼륨")
    ax.set_ylabel("사고건수")
    ax.legend(ncol=3, fontsize=8)
    plt.xticks(rotation=45, ha="right", fontsize=7)
    fig.tight_layout()
    fig.savefig(outfile, dpi=140, bbox_inches="tight")
    plt.close()


def main() -> None:
    print(f"=== {MODEL_NAME} v{MODEL_VERSION} 학습 시작 ===")
    raw = load_raw()
    print(f"1. raw rows: {len(raw):,}")
    panel = build_region_quarter_panel(raw)
    print(f"   panel rows: {len(panel):,}")
    plot_region_counts(panel, FIG_DIR / "region_quarter_accident_count.png")
    plot_region_severe(panel, FIG_DIR / "region_quarter_severe_rate.png")
    print(f"2. graphs: {FIG_DIR}")

    package = train_models(raw)
    path = save_package(package)
    print(f"3. saved: {path}")
    print(f"   metrics.share={package['metrics']['share_rate']}")
    print(f"   metrics.count={package['metrics']['accident_count']}")
    print(f"   metrics.severe(EB aux)={package['metrics']['severe_rate']}")
    print(f"   metrics.severe_vs_raw={package['metrics']['severe_rate_vs_raw']}")

    print("\n4. 분기 추론 (예상 건수 높은 순 — 지도·대응용)...")
    preds = predict_next_quarter(package)
    assert isinstance(preds, list)
    print(
        f"{'지역':<8} {'예상건수':>8} {'점유%':>7} {'중대건수':>8} "
        f"{'중대EB%':>8} {'등급':<10}"
    )
    print("-" * 62)
    for r in preds:
        print(
            f"{r['지역']:<8} {r['예측사고건수']:>8} "
            f"{r['예측사고율_퍼센트']:>7.2f} "
            f"{r['추정_다음분기중대사고건수']:>8} "
            f"{r['예측중대사고율_퍼센트']:>8.2f} {r['중대사고등급']:<10}"
        )

    print("\n5. 반기 중대 보조 (레이어2)...")
    hpreds = predict_next_half(package)
    assert isinstance(hpreds, list)
    print(f"{'지역':<8} {'중대EB%':>8} {'등급':<10}")
    print("-" * 30)
    for r in hpreds:
        print(
            f"{r['지역']:<8} {r['예측중대사고율_퍼센트']:>8.2f} {r['중대사고등급']:<10}"
        )
    print(f"\n=== {MODEL_NAME} v{MODEL_VERSION} 완료 ===")


if __name__ == "__main__":
    main()
