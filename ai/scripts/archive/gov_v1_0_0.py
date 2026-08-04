# -*- coding: utf-8 -*-
"""
GovGuard AI v1.0.0
지자체용 지역별 다음 분기 사고율 예측 모델

- 학습 데이터: data/raw/사고분석_2016~2025_원본합본.csv
- 사용자 인구통계 입력 없음 (성별·연령·차종 등 X)
- 지역×분기 시계열로 집계 후, 다음 분기 사고율(지역 점유율) 예측

사고율 정의:
  rate_{지역, t} = 해당 분기 지역 사고건수 / 동일 분기 대구 전체 사고건수
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

# ---------------------------------------------------------------------------
# 경로 · 메타
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[2]  # scripts/archive -> ai
DATA_PATH = ROOT / "data" / "raw" / "사고분석_2016~2025_원본합본.csv"
MODEL_DIR = ROOT / "models"
FIG_DIR = ROOT / "docs" / "figures" / "gov_v1_0_0"

MODEL_NAME = "GovGuard AI"
MODEL_VERSION = "1.0.0"
MODEL_FILENAME = f"gov_model_v{MODEL_VERSION}.pkl"

# 모델이 쓰는 피처 (사용자 입력이 아님 — 시계열에서 자동 생성)
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
]


# ---------------------------------------------------------------------------
# 전처리 · 패널 구성
# ---------------------------------------------------------------------------
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
    df = df.dropna(subset=["지역", "연도", "분기"])
    df = df[df["지역"].astype(str).str.len() > 0]
    return df.reset_index(drop=True)


def build_region_quarter_panel(df: pd.DataFrame) -> pd.DataFrame:
    """지역 × 분기 사고건수·사고율 패널."""
    g = (
        df.groupby(["지역", "연도", "분기", "연도분기", "period_id"], as_index=False)
        .size()
        .rename(columns={"size": "사고건수"})
    )
    totals = (
        g.groupby("period_id", as_index=False)["사고건수"]
        .sum()
        .rename(columns={"사고건수": "전체건수"})
    )
    panel = g.merge(totals, on="period_id", how="left")
    panel["사고율"] = panel["사고건수"] / panel["전체건수"].clip(lower=1)
    panel = panel.sort_values(["지역", "period_id"]).reset_index(drop=True)
    return panel


def add_lag_features(panel: pd.DataFrame) -> pd.DataFrame:
    out = panel.copy()
    out["연도_idx"] = out["연도"] - int(out["연도"].min())
    out["rate_t"] = out["사고율"]
    out["count_t"] = out["사고건수"].astype(float)
    for lag in (1, 2, 3, 4):
        out[f"rate_lag{lag}"] = out.groupby("지역")["사고율"].shift(lag)
        out[f"count_lag{lag}"] = out.groupby("지역")["사고건수"].shift(lag)

    def _roll_rate(s: pd.Series) -> pd.Series:
        return s.shift(1).rolling(4, min_periods=2).mean()

    def _roll_count(s: pd.Series) -> pd.Series:
        return s.shift(1).rolling(4, min_periods=2).mean()

    out["rate_roll4"] = out.groupby("지역")["사고율"].transform(_roll_rate)
    out["count_roll4"] = out.groupby("지역")["사고건수"].transform(_roll_count)

    out["next_사고율"] = out.groupby("지역")["사고율"].shift(-1)
    out["next_사고건수"] = out.groupby("지역")["사고건수"].shift(-1)
    out["next_연도분기"] = out.groupby("지역")["연도분기"].shift(-1)
    out["next_period_id"] = out.groupby("지역")["period_id"].shift(-1)
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


# ---------------------------------------------------------------------------
# 학습 · 예측
# ---------------------------------------------------------------------------
def prepare_xy(panel: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray, pd.DataFrame]:
    """lag가 채워지고 next 타깃이 있는 행만 학습에 사용."""
    need = FEATURE_COLS + ["next_사고율", "지역", "연도분기", "next_연도분기"]
    work = panel.dropna(subset=need).copy()
    X = work[FEATURE_COLS]
    y = work["next_사고율"].to_numpy(dtype=float)
    return X, y, work


def time_split_mask(work: pd.DataFrame, test_years: set[int] | None = None):
    test_years = test_years or {2024, 2025}
    # next 타깃이 test 연도에 속하면 test
    next_year = work["next_연도분기"].astype(str).str.slice(0, 4).astype(int)
    is_test = next_year.isin(test_years)
    return ~is_test, is_test


def train_models(df: pd.DataFrame | None = None) -> dict:
    raw = df if df is not None else load_raw()
    panel = build_region_quarter_panel(raw)
    panel = add_lag_features(panel)
    panel, region_le = encode_region(panel)
    X, y, work = prepare_xy(panel)

    tr_mask, te_mask = time_split_mask(work)
    # fallback: if too few test rows, use last 20% by period
    if te_mask.sum() < 10 or tr_mask.sum() < 20:
        cutoff = work["period_id"].quantile(0.8)
        tr_mask = work["period_id"] < cutoff
        te_mask = ~tr_mask

    X_tr, X_te = X.loc[tr_mask], X.loc[te_mask]
    y_tr, y_te = y[tr_mask.to_numpy()], y[te_mask.to_numpy()]

    print("\n모델 학습 (다음 분기 사고율)...")
    print(f"   regions={list(region_le.classes_)}")
    print(f"   n_train={len(X_tr):,}  n_test={len(X_te):,}")

    regressor = HistGradientBoostingRegressor(
        max_depth=6,
        learning_rate=0.08,
        max_iter=300,
        min_samples_leaf=8,
        l2_regularization=0.1,
        random_state=42,
    )
    regressor.fit(X_tr, y_tr)
    pred = np.clip(regressor.predict(X_te), 0.0, 1.0)
    r2 = r2_score(y_te, pred)
    rmse = root_mean_squared_error(y_te, pred)
    mae = mean_absolute_error(y_te, pred)
    # 퍼센트 포인트 스케일 MAE도 함께
    mae_pp = mae * 100.0
    print(f"   [Rate Regressor] R²={r2:.4f}  RMSE={rmse:.4f}  MAE={mae:.4f} ({mae_pp:.2f}%p)")

    package = {
        "name": MODEL_NAME,
        "version": MODEL_VERSION,
        "task": "region_next_quarter_accident_rate",
        "rate_definition": "region_count / city_total_same_quarter",
        "regressor": regressor,
        "region_encoder": region_le,
        "features": FEATURE_COLS,
        "input_features": [],  # 사용자 인구통계 입력 없음
        "panel_meta": {
            "regions": list(region_le.classes_),
            "n_panel_rows": int(len(panel)),
            "n_train": int(len(X_tr)),
            "n_test": int(len(X_te)),
            "year_min": int(panel["연도"].min()),
            "year_max": int(panel["연도"].max()),
        },
        "metrics": {
            "r2": float(r2),
            "rmse": float(rmse),
            "mae": float(mae),
            "mae_percent_points": float(mae_pp),
        },
        # 추론용 최신 패널 (lag 생성에 필요)
        "latest_panel": panel[
            [
                "지역",
                "연도",
                "분기",
                "연도분기",
                "period_id",
                "사고건수",
                "전체건수",
                "사고율",
            ]
        ].copy(),
    }
    return package


def _next_period(year: int, quarter: int) -> tuple[int, int, str, int]:
    if quarter == 4:
        ny, nq = year + 1, 1
    else:
        ny, nq = year, quarter + 1
    return ny, nq, f"{ny}Q{nq}", ny * 4 + (nq - 1)


def predict_next_quarter(
    package: dict,
    지역: str | None = None,
    as_of_연도분기: str | None = None,
) -> list[dict] | dict:
    """
    사용자 인구통계 입력 없이, 저장된 패널 시계열로 다음 분기 사고율 예측.

    - 지역=None: 전 지역 예측 리스트
    - as_of_연도분기: 기준 분기 (기본=데이터 최신 분기). 이 분기 다음을 예측.
    """
    panel = package["latest_panel"].copy()
    le: LabelEncoder = package["region_encoder"]
    reg = package["regressor"]

    if as_of_연도분기 is None:
        as_of_연도분기 = str(panel["연도분기"].iloc[panel["period_id"].argmax()])

    base = panel[panel["연도분기"] == as_of_연도분기].copy()
    if base.empty:
        raise ValueError(f"기준 분기 없음: {as_of_연도분기}")

    year = int(base["연도"].iloc[0])
    quarter = int(base["분기"].iloc[0])
    ny, nq, nlabel, _ = _next_period(year, quarter)

    # lag용 전체 히스토리
    hist = panel.sort_values(["지역", "period_id"])
    rows = []
    regions = [지역] if 지역 else list(le.classes_)
    for region in regions:
        rh = hist[hist["지역"] == region].sort_values("period_id")
        if rh.empty or as_of_연도분기 not in set(rh["연도분기"]):
            continue
        cur = rh[rh["연도분기"] == as_of_연도분기].iloc[0]
        rates = rh["사고율"].tolist()
        counts = rh["사고건수"].astype(float).tolist()
        idx = list(rh.index).index(cur.name)

        def at(offset: int, series: list[float]) -> float:
            pos = idx + offset
            return float(series[pos]) if 0 <= pos < len(series) else float("nan")

        # training row t: rate_t=t, rate_lag1=t-1, ... → predict t+1
        feat = {
            "지역_code": int(le.transform([str(region)])[0])
            if str(region) in set(le.classes_)
            else 0,
            "분기": int(cur["분기"]),
            "연도_idx": int(cur["연도"]) - int(panel["연도"].min()),
            "rate_t": at(0, rates),
            "rate_lag1": at(-1, rates),
            "rate_lag2": at(-2, rates),
            "rate_lag3": at(-3, rates),
            "rate_lag4": at(-4, rates),
            "count_t": at(0, counts),
            "count_lag1": at(-1, counts),
            "count_lag2": at(-2, counts),
        }
        hist_rates = [at(-k, rates) for k in range(1, 5)]
        hist_rates = [v for v in hist_rates if not np.isnan(v)]
        hist_counts = [at(-k, counts) for k in range(1, 5)]
        hist_counts = [v for v in hist_counts if not np.isnan(v)]
        feat["rate_roll4"] = float(np.mean(hist_rates)) if hist_rates else float("nan")
        feat["count_roll4"] = float(np.mean(hist_counts)) if hist_counts else float("nan")

        if any(np.isnan(feat[c]) for c in package["features"]):
            continue

        X = pd.DataFrame([feat])[package["features"]]
        rate = float(np.clip(reg.predict(X)[0], 0.0, 1.0))
        city_total = float(cur["전체건수"])
        rows.append(
            {
                "모델": package["name"],
                "버전": package["version"],
                "지역": region,
                "기준분기": as_of_연도분기,
                "예측분기": nlabel,
                "예측사고율": round(rate, 4),
                "예측사고율_퍼센트": round(rate * 100, 2),
                "참고_기준분기사고건수": int(cur["사고건수"]),
                "참고_기준분기사고율_퍼센트": round(float(cur["사고율"]) * 100, 2),
                "추정_다음분기사고건수": int(round(rate * city_total)),
            }
        )

    if 지역 is not None:
        if not rows:
            raise ValueError(f"예측 불가: 지역={지역}, as_of={as_of_연도분기}")
        return rows[0]
    rows.sort(key=lambda r: r["예측사고율"], reverse=True)
    return rows


def save_package(package: dict) -> Path:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    path = MODEL_DIR / MODEL_FILENAME
    # DataFrame in pickle is fine for local serving
    with open(path, "wb") as f:
        pickle.dump(package, f)
    return path


# ---------------------------------------------------------------------------
# 시각화
# ---------------------------------------------------------------------------
def _setup_font() -> None:
    plt.rcParams["font.family"] = "Malgun Gothic"
    plt.rcParams["axes.unicode_minus"] = False


def plot_region_rates(panel: pd.DataFrame, outfile: Path) -> None:
    _setup_font()
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    pivot = panel.pivot_table(
        index="연도분기", columns="지역", values="사고율", aggfunc="first"
    )
    # order periods
    pivot = pivot.reindex(
        sorted(pivot.index, key=lambda s: (int(s[:4]), int(s[-1])))
    )
    fig, ax = plt.subplots(figsize=(12, 5.5))
    for col in pivot.columns:
        ax.plot(pivot.index, pivot[col] * 100, marker="o", markersize=2, label=col)
    ax.set_title("지역별 분기 사고율(%) — 대구 전체 대비 점유율")
    ax.set_ylabel("사고율 (%)")
    ax.set_xlabel("연도분기")
    ax.legend(ncol=3, fontsize=8)
    plt.xticks(rotation=45, ha="right", fontsize=7)
    fig.tight_layout()
    fig.savefig(outfile, dpi=140, bbox_inches="tight")
    plt.close()


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def main() -> None:
    print(f"=== {MODEL_NAME} v{MODEL_VERSION} 학습 시작 ===")
    print("1. 데이터 로드 및 지역×분기 패널 구성...")
    raw = load_raw()
    print(f"   raw rows: {len(raw):,}")
    panel = build_region_quarter_panel(raw)
    print(f"   panel rows: {len(panel):,}  regions: {sorted(panel['지역'].unique())}")

    print("\n2. 시계열 그래프...")
    plot_region_rates(panel, FIG_DIR / "region_quarter_rate.png")
    print(f"   saved {FIG_DIR / 'region_quarter_rate.png'}")

    print("\n3. 모델 학습...")
    package = train_models(raw)
    path = save_package(package)
    print(f"\n4. 저장: {path}")
    print(f"   metrics: {package['metrics']}")

    print("\n5. 추론 시뮬레이션 (최신 분기 → 다음 분기, 전 지역)...")
    preds = predict_next_quarter(package)
    assert isinstance(preds, list)
    for row in preds[:5]:
        print(
            f"   {row['지역']}: {row['기준분기']}→{row['예측분기']} "
            f"율 {row['예측사고율_퍼센트']}% (건수추정 {row['추정_다음분기사고건수']})"
        )
    if len(preds) > 5:
        print(f"   ... 외 {len(preds) - 5}개 지역")
    print(f"\n=== {MODEL_NAME} v{MODEL_VERSION} 완료 ===")


if __name__ == "__main__":
    main()
