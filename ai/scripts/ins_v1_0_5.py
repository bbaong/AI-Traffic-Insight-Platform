# -*- coding: utf-8 -*-
"""
InsureGuard AI v1.0.5
보험 인수·요율 참고용 교통사고 위험 예측 모델

입력(4): 성별, 연령대, 차종, 지역
교차 피처 + 기대손실 타깃 → 위험점수 / 발생·심도 참고 / 법규위반 Top3 / 사고경중

v1.0.4 대비:
- 빈도 순위 30% 블렌드 폐지
- 위험점수 = 인구대비 발생률 × 건당 심도 (기대손실) 의 프로파일 백분위
- 발생·심도 점수는 pkl lookup 으로 서빙 (학습 스크립트 재실행 없음)

서빙은 src/inference.py 만 사용한다. 이 파일은 학습·pkl 생성 전용.
"""

from __future__ import annotations

import pickle
import re
import sys
import warnings
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import (
    HistGradientBoostingRegressor,
    RandomForestClassifier,
)
from sklearn.metrics import (
    accuracy_score,
    mean_absolute_error,
    r2_score,
    root_mean_squared_error,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.utils.class_weight import compute_sample_weight

warnings.filterwarnings("ignore", category=UserWarning)

# ---------------------------------------------------------------------------
# 경로 · 메타
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "raw" / "사고분석_2016~2025_원본합본.csv"
POP_PATH = ROOT / "data" / "raw" / "대구_연령별인구현황_2016~2025_합본(in).csv"
MODEL_DIR = ROOT / "models"
FIG_DIR = ROOT / "docs" / "figures" / "insureguard_v1_0_5"

MODEL_NAME = "InsureGuard AI"
MODEL_VERSION = "1.0.5"
MODEL_FILENAME = f"ins_model_v{MODEL_VERSION}.pkl"

INPUT_FEATURES = [
    "가해운전자 성별",
    "가해운전자 연령대",
    "가해운전자 차종",
    "지역",
]

# 교차 변수 (상관 가능성이 큰 조합)
CROSS_SPECS = [
    ("가해운전자 성별", "가해운전자 연령대", "교차_성별_연령"),
    ("가해운전자 연령대", "가해운전자 차종", "교차_연령_차종"),
    ("가해운전자 성별", "가해운전자 차종", "교차_성별_차종"),
    ("지역", "가해운전자 차종", "교차_지역_차종"),
    ("지역", "가해운전자 연령대", "교차_지역_연령"),
    ("가해운전자 성별", "지역", "교차_성별_지역"),
]

# EPDO 계열 — v1 대비 사망·중상 격차를 키워 경상 쏠림을 완화
ACCIDENT_TYPE_WEIGHTS = {
    "사망사고": 48.0,
    "중상사고": 12.0,
    "경상사고": 3.0,
    "부상신고사고": 1.0,
}
VICTIM_INJURY_WEIGHTS = {
    "사망": 48.0,
    "중상": 12.0,
    "경상": 3.0,
    "부상신고": 1.0,
    "상해없음": 0.0,
    "기타불명": 0.0,
}
# 인원수 EPDO
CASUALTY_WEIGHTS = {"사망자수": 48.0, "중상자수": 12.0, "경상자수": 3.0}

# 심도 raw: EPDO vs 중대율 내부 비율 (발생률과 별개)
SEVERITY_BLEND = 0.72
GROUP_BLEND = 0.28
PRIOR_STRENGTH = 40.0
# 60~69세 인구 → 61-64세(4년) / 65세 이상(5년)
SPLIT_60_69_TO_61_64 = 4.0 / 9.0


# ---------------------------------------------------------------------------
# 전처리 · 피처
# ---------------------------------------------------------------------------
def load_and_clean(path: Path = DATA_PATH) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="utf-8-sig")
    df["지역"] = df["시군구"].astype(str).str.replace(
        r"^대구광역시\s*", "", regex=True
    )

    need = INPUT_FEATURES + [
        "사고내용",
        "법규위반",
        "사망자수",
        "중상자수",
        "경상자수",
        "피해운전자 상해정도",
        "발생년월",
    ]
    df = df.dropna(subset=[c for c in need if c in df.columns]).copy()
    df = df.drop_duplicates()

    # 학습 노이즈 제거
    for col in INPUT_FEATURES:
        df = df[~df[col].astype(str).str.contains("기타불명", na=False)]
    df = df[df["사고내용"].isin(ACCIDENT_TYPE_WEIGHTS.keys())]
    df = df[df["법규위반"].astype(str).str.len() > 0]
    return df.reset_index(drop=True)


def parse_year_quarter(series: pd.Series) -> pd.DataFrame:
    """'2016년 1월' → year, quarter, year_quarter."""
    text = series.astype(str).str.replace(" ", "", regex=False)
    year = text.str.extract(r"(\d{4})년")[0].astype(int)
    month = text.str.extract(r"년(\d{1,2})월")[0].astype(int)
    quarter = ((month - 1) // 3) + 1
    return pd.DataFrame(
        {
            "연도": year,
            "분기": quarter,
            "연도분기": year.astype(str) + "Q" + quarter.astype(str),
        }
    )


def add_cross_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for a, b, name in CROSS_SPECS:
        out[name] = out[a].astype(str) + "|" + out[b].astype(str)
    return out


def model_feature_names() -> list[str]:
    return INPUT_FEATURES + [name for _, _, name in CROSS_SPECS]


def _profile_key(df: pd.DataFrame) -> pd.Series:
    """입력 4개로 정의되는 보험 프로파일 키."""
    return (
        df["가해운전자 성별"].astype(str)
        + "|"
        + df["가해운전자 연령대"].astype(str)
        + "|"
        + df["가해운전자 차종"].astype(str)
        + "|"
        + df["지역"].astype(str)
    )


def _district_from_admin(name: str) -> str:
    text = str(name)
    text = re.sub(r"\s*\(\d+\)\s*$", "", text)
    text = re.sub(r"^대구광역시\s*", "", text).strip()
    return text


def _pop_band_targets(band: str) -> list[tuple[str, float]]:
    """주민등록 10세 구간 → 사고 연령대 (가중치 합=1). 0~9세는 운전 노출에서 제외."""
    b = str(band).replace(" ", "")
    mapping: dict[str, list[tuple[str, float]]] = {
        "10~19세": [("20세 이하", 1.0)],
        "20~29세": [("21-30세", 1.0)],
        "30~39세": [("31-40세", 1.0)],
        "40~49세": [("41-50세", 1.0)],
        "50~59세": [("51-60세", 1.0)],
        "60~69세": [
            ("61-64세", SPLIT_60_69_TO_61_64),
            ("65세 이상", 1.0 - SPLIT_60_69_TO_61_64),
        ],
        "70~79세": [("65세 이상", 1.0)],
        "80~89세": [("65세 이상", 1.0)],
        "90~99세": [("65세 이상", 1.0)],
        "100세이상": [("65세 이상", 1.0)],
    }
    return mapping.get(b, [])


def load_profile_exposure(path: Path = POP_PATH) -> pd.DataFrame:
    """구군×사고연령대×성별 평균 인구 (2016-01~2025-12 월평균)."""
    if not path.exists():
        raise FileNotFoundError(f"인구 CSV가 없습니다: {path}")

    raw = pd.read_csv(path, encoding="utf-8-sig")
    district_col = raw.columns[0]
    rows: list[dict] = []
    col_re = re.compile(r"^(\d{4}년\d{2}월)_(남|여)_(.+)$")

    for _, rec in raw.iterrows():
        district = _district_from_admin(rec[district_col])
        if not district or district in {"합계", "대구광역시"}:
            continue
        for col in raw.columns[1:]:
            m = col_re.match(str(col))
            if not m:
                continue
            period, sex, band = m.group(1), m.group(2), m.group(3)
            targets = _pop_band_targets(band)
            if not targets:
                continue
            val = pd.to_numeric(rec[col], errors="coerce")
            if pd.isna(val) or float(val) < 0:
                continue
            for age, w in targets:
                rows.append(
                    {
                        "기간": period,
                        "지역": district,
                        "연령대": age,
                        "성별": sex,
                        "인구": float(val) * w,
                    }
                )

    if not rows:
        raise ValueError(f"인구 행을 파싱하지 못했습니다: {path}")

    long = pd.DataFrame(rows)
    monthly = (
        long.groupby(["기간", "지역", "연령대", "성별"], as_index=False)["인구"].sum()
    )
    out = (
        monthly.groupby(["지역", "연령대", "성별"], as_index=False)["인구"]
        .mean()
        .rename(columns={"인구": "노출인구"})
    )
    return out


def compute_risk_target(
    df: pd.DataFrame, exposure: pd.DataFrame | None = None
) -> pd.DataFrame:
    """
    기대손실 타깃.

    발생률 = 프로파일 건수 / (구·연령·성별 평균인구) × 1만
    심도   = EB(EPDO) + EB(중대율)
    기대손실 = EB(발생률) × EB(EPDO)
    위험점수 = 기대손실의 프로파일 백분위 (0~100)
    """
    out = df.copy()
    out["피해자상해가중치"] = (
        out["피해운전자 상해정도"].map(VICTIM_INJURY_WEIGHTS).fillna(0.0)
    )
    out["사고유형가중치"] = out["사고내용"].map(ACCIDENT_TYPE_WEIGHTS).fillna(1.0)

    out["epdo"] = (
        out["사망자수"].fillna(0) * CASUALTY_WEIGHTS["사망자수"]
        + out["중상자수"].fillna(0) * CASUALTY_WEIGHTS["중상자수"]
        + out["경상자수"].fillna(0) * CASUALTY_WEIGHTS["경상자수"]
        + out["피해자상해가중치"]
        + out["사고유형가중치"]
    )
    out["중대사고"] = out["사고내용"].isin(["사망사고", "중상사고"]).astype(float)

    key = _profile_key(out)
    out["_profile"] = key

    expo = exposure if exposure is not None else load_profile_exposure()
    expo_lookup = expo.set_index(["지역", "연령대", "성별"])["노출인구"]
    expo_median = float(expo["노출인구"].median())
    expo_keys = list(zip(out["지역"], out["가해운전자 연령대"], out["가해운전자 성별"]))
    mapped = expo_lookup.reindex(pd.MultiIndex.from_tuples(expo_keys))
    out["노출인구"] = mapped.to_numpy(dtype=float)
    out["노출인구"] = out["노출인구"].fillna(expo_median).clip(lower=1.0)

    global_epdo = float(out["epdo"].mean())
    global_severe = float(out["중대사고"].mean())

    g = out.groupby(key, sort=False)
    n = g["epdo"].transform("size").astype(float)
    sum_epdo = g["epdo"].transform("sum")
    sum_sev = g["중대사고"].transform("sum")
    exposure_n = out["노출인구"]

    smooth_epdo = (sum_epdo + PRIOR_STRENGTH * global_epdo) / (n + PRIOR_STRENGTH)
    smooth_sev = (sum_sev + PRIOR_STRENGTH * global_severe) / (n + PRIOR_STRENGTH)

    n_years = float(parse_year_quarter(out["발생년월"])["연도"].nunique() or 1.0)
    raw_rate = n / (exposure_n * n_years) * 10_000.0
    # 전역 발생률: 사람 이중집계 없이 구·연령·성별 노출 × 연수
    demo = (
        out[["지역", "가해운전자 연령대", "가해운전자 성별", "노출인구"]]
        .drop_duplicates()
        .rename(columns={"가해운전자 연령대": "연령대", "가해운전자 성별": "성별"})
    )
    city_expo = float(demo["노출인구"].sum())
    global_rate = (len(out) / max(city_expo * n_years, 1.0)) * 10_000.0
    smooth_rate = (n * raw_rate + PRIOR_STRENGTH * global_rate) / (n + PRIOR_STRENGTH)

    sev_raw = SEVERITY_BLEND * np.log1p(smooth_epdo) + GROUP_BLEND * (
        smooth_sev * 10.0
    )
    loss_raw = smooth_rate * smooth_epdo

    uniq = (
        pd.DataFrame(
            {
                "key": key,
                "sev_raw": sev_raw,
                "n": n,
                "노출인구": exposure_n,
                "raw_rate": raw_rate,
                "smooth_rate": smooth_rate,
                "loss_raw": loss_raw,
                "smooth_epdo": smooth_epdo,
                "smooth_sev": smooth_sev,
            }
        )
        .drop_duplicates("key")
        .set_index("key")
    )
    sev_score = uniq["sev_raw"].rank(method="average", pct=True) * 100.0
    occ_score = uniq["smooth_rate"].rank(method="average", pct=True) * 100.0
    final_score = uniq["loss_raw"].rank(method="average", pct=True) * 100.0

    out["위험점수"] = key.map(final_score).astype(float)
    out["smooth_epdo"] = smooth_epdo
    out["smooth_severe_rate"] = smooth_sev
    out["smooth_rate"] = smooth_rate
    out["raw_rate"] = raw_rate
    out["profile_n"] = n
    out["severity_score"] = key.map(sev_score).astype(float)
    out["occ_score"] = key.map(occ_score).astype(float)
    out["freq_score"] = out["occ_score"]  # 하위호환 별칭
    return out


def build_profile_lookup(df: pd.DataFrame) -> tuple[dict, dict]:
    """서빙용 프로파일 통계. 추론 시 학습 스크립트/인구 CSV 없이 조회."""
    cols = [
        "_profile",
        "occ_score",
        "severity_score",
        "smooth_rate",
        "smooth_epdo",
        "smooth_severe_rate",
        "profile_n",
        "노출인구",
        "위험점수",
    ]
    uniq = df[cols].drop_duplicates("_profile")
    lookup: dict[str, dict] = {}
    for rec in uniq.to_dict("records"):
        lookup[str(rec["_profile"])] = {
            "발생점수": round(float(rec["occ_score"]), 4),
            "심도점수": round(float(rec["severity_score"]), 4),
            "발생률_1만명당": round(float(rec["smooth_rate"]), 6),
            "smooth_epdo": round(float(rec["smooth_epdo"]), 6),
            "smooth_중대율": round(float(rec["smooth_severe_rate"]), 6),
            "n": int(rec["profile_n"]),
            "노출인구": round(float(rec["노출인구"]), 2),
            "위험점수": round(float(rec["위험점수"]), 4),
        }
    defaults = {
        "발생점수": float(uniq["occ_score"].median()),
        "심도점수": float(uniq["severity_score"].median()),
        "발생률_1만명당": float(uniq["smooth_rate"].median()),
        "smooth_epdo": float(uniq["smooth_epdo"].median()),
        "smooth_중대율": float(uniq["smooth_severe_rate"].median()),
        "n": 0,
        "노출인구": float(uniq["노출인구"].median()),
        "위험점수": float(uniq["위험점수"].median()),
    }
    return lookup, defaults


def build_sample_weights(df: pd.DataFrame) -> np.ndarray:
    """
    프로파일 빈도 역가중 + 사고내용 역빈도.
    다수 프로파일·경상 사고에 과도하게 맞추는 것을 완화.
    """
    key = df["_profile"] if "_profile" in df.columns else _profile_key(df)
    profile_freq = key.value_counts(normalize=True)
    inv_profile = key.map(lambda k: 1.0 / (profile_freq[k] + 1e-9)).to_numpy()
    inv_profile = inv_profile / (inv_profile.mean() + 1e-9)

    inv_class = compute_sample_weight(class_weight="balanced", y=df["사고내용"])
    w = 0.6 * inv_profile + 0.4 * inv_class
    return w / (w.mean() + 1e-9)


def encode_features(
    df: pd.DataFrame, feature_cols: list[str], encoders: dict | None = None
) -> tuple[pd.DataFrame, dict]:
    fitted = encoders is None
    encoders = {} if encoders is None else encoders
    X = pd.DataFrame(index=df.index)
    for col in feature_cols:
        if fitted:
            le = LabelEncoder()
            X[col] = le.fit_transform(df[col].astype(str))
            encoders[col] = le
        else:
            le = encoders[col]
            vals = df[col].astype(str).tolist()
            known = set(le.classes_)
            fallback = str(le.classes_[0])
            safe = [v if v in known else fallback for v in vals]
            X[col] = le.transform(safe)
    return X, encoders


# ---------------------------------------------------------------------------
# 분기·연도 분석 그래프
# ---------------------------------------------------------------------------
def _setup_korean_font() -> None:
    plt.rcParams["font.family"] = "Malgun Gothic"
    plt.rcParams["axes.unicode_minus"] = False


def plot_quarterly_by_dimension(
    df: pd.DataFrame, dim: str, title: str, outfile: Path
) -> pd.DataFrame:
    """연도×분기별 차원 분포(%) 및 중상+사망 비율 요약 테이블·그래프."""
    _setup_korean_font()
    work = df.copy()
    yq = parse_year_quarter(work["발생년월"])
    work = pd.concat([work, yq], axis=1)
    work["중대사고"] = work["사고내용"].isin(["사망사고", "중상사고"]).astype(int)

    # 연도별 분기 사고건수 (차원 카테고리별)
    counts = (
        work.groupby(["연도", "분기", dim], observed=False)
        .size()
        .reset_index(name="건수")
    )
    totals = counts.groupby(["연도", "분기"])["건수"].transform("sum")
    counts["비율"] = counts["건수"] / totals * 100

    severe = (
        work.groupby(["연도", "분기", dim], observed=False)["중대사고"]
        .mean()
        .reset_index(name="중대사고비율")
    )
    summary = counts.merge(severe, on=["연도", "분기", dim])
    summary["중대사고비율"] = summary["중대사고비율"] * 100

    years = sorted(work["연도"].unique())
    n_years = len(years)
    fig, axes = plt.subplots(
        n_years, 1, figsize=(12, max(3.2 * n_years, 4)), sharex=False
    )
    if n_years == 1:
        axes = [axes]

    top_cats = (
        work[dim].value_counts().head(6).index.tolist()
    )  # 가독성: 상위 카테고리

    for ax, year in zip(axes, years):
        sub = summary[(summary["연도"] == year) & (summary[dim].isin(top_cats))]
        pivot = sub.pivot_table(
            index="분기", columns=dim, values="중대사고비율", aggfunc="mean"
        ).reindex(index=[1, 2, 3, 4])
        pivot.plot(kind="bar", ax=ax, width=0.8)
        ax.set_title(f"{year}년 — {title} (분기별 중대사고 비율 %)")
        ax.set_xlabel("분기")
        ax.set_ylabel("중대사고 비율 (%)")
        ax.legend(title=dim, bbox_to_anchor=(1.02, 1), loc="upper left", fontsize=8)
        ax.set_xticklabels([f"Q{i}" for i in [1, 2, 3, 4]], rotation=0)
        ax.grid(axis="y", alpha=0.3)

    fig.suptitle(f"InsureGuard AI v{MODEL_VERSION} | {title}", fontsize=13, y=1.01)
    fig.tight_layout()
    outfile.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(outfile, dpi=140, bbox_inches="tight")
    plt.close(fig)

    # 연도별 콘솔 요약
    yearly = (
        work.groupby(["연도", dim], observed=False)
        .agg(건수=("사고내용", "size"), 중대사고비율=("중대사고", "mean"))
        .reset_index()
    )
    yearly["중대사고비율"] = (yearly["중대사고비율"] * 100).round(2)
    print(f"\n=== [{title}] 연도별 요약 (상위 카테고리) ===")
    for year in years:
        print(f"\n-- {year}년 --")
        ysub = yearly[(yearly["연도"] == year) & (yearly[dim].isin(top_cats))]
        ysub = ysub.sort_values("건수", ascending=False)
        print(ysub.to_string(index=False))

    csv_path = outfile.with_suffix(".csv")
    summary.to_csv(csv_path, index=False, encoding="utf-8-sig")
    print(f"저장: {outfile}")
    print(f"저장: {csv_path}")
    return summary


def run_exploratory_plots(df: pd.DataFrame) -> None:
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    plot_quarterly_by_dimension(
        df,
        "가해운전자 성별",
        "성별 분기별 중대사고 비율",
        FIG_DIR / "quarterly_gender.png",
    )
    plot_quarterly_by_dimension(
        df,
        "가해운전자 연령대",
        "연령대 분기별 중대사고 비율",
        FIG_DIR / "quarterly_age.png",
    )
    plot_quarterly_by_dimension(
        df,
        "가해운전자 차종",
        "차종 분기별 중대사고 비율",
        FIG_DIR / "quarterly_vehicle.png",
    )


# ---------------------------------------------------------------------------
# 학습 · 예측
# ---------------------------------------------------------------------------
def train_models(df: pd.DataFrame) -> dict:
    feature_cols = model_feature_names()
    df = add_cross_features(df)
    print("   인구 노출 테이블 로딩...")
    exposure = load_profile_exposure()
    print(f"   노출 키: {len(exposure):,} (구×연령×성별)")
    df = compute_risk_target(df, exposure)
    profile_lookup, profile_defaults = build_profile_lookup(df)
    sample_w = build_sample_weights(df)

    X, encoders = encode_features(df, feature_cols)

    le_violation = LabelEncoder()
    y_violation = le_violation.fit_transform(df["법규위반"].astype(str))
    encoders["법규위반"] = le_violation

    le_severity = LabelEncoder()
    y_severity = le_severity.fit_transform(df["사고내용"].astype(str))
    encoders["사고내용"] = le_severity

    y_risk = df["위험점수"].to_numpy()

    (
        X_train,
        X_test,
        y_risk_tr,
        y_risk_te,
        y_vio_tr,
        y_vio_te,
        y_sev_tr,
        y_sev_te,
        w_tr,
        _w_te,
    ) = train_test_split(
        X,
        y_risk,
        y_violation,
        y_severity,
        sample_w,
        test_size=0.2,
        random_state=42,
        stratify=df["사고내용"],
    )

    print("\n5. 모델 학습...")
    regressor = HistGradientBoostingRegressor(
        max_depth=10,
        learning_rate=0.08,
        max_iter=400,
        min_samples_leaf=20,
        l2_regularization=0.05,
        random_state=42,
    )
    regressor.fit(X_train, y_risk_tr, sample_weight=w_tr)
    risk_pred = np.clip(regressor.predict(X_test), 0.0, 100.0)
    r2 = r2_score(y_risk_te, risk_pred)
    rmse = root_mean_squared_error(y_risk_te, risk_pred)
    mae = mean_absolute_error(y_risk_te, risk_pred)
    print(f"   [Regressor] R²={r2:.4f}  RMSE={rmse:.2f}  MAE={mae:.2f}")

    # 확률 보정을 위해 강한 balanced는 쓰지 않음 (희귀 법규가 Top3를 잠식하는 문제 방지)
    # 대신 경중 분류만 mild balanced로 경상 쏠림을 완화
    violation_clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=16,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
    )
    violation_clf.fit(X_train, y_vio_tr)
    vio_acc = accuracy_score(y_vio_te, violation_clf.predict(X_test))
    print(f"   [Violation Clf] accuracy={vio_acc * 100:.2f}%")

    severity_clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=14,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
    )
    severity_clf.fit(X_train, y_sev_tr)
    sev_acc = accuracy_score(y_sev_te, severity_clf.predict(X_test))
    print(f"   [Severity Clf] accuracy={sev_acc * 100:.2f}%")

    package = {
        "name": MODEL_NAME,
        "version": MODEL_VERSION,
        "regressor": regressor,
        "violation_classifier": violation_clf,
        "severity_classifier": severity_clf,
        # 하위호환 alias
        "classifier": violation_clf,
        "label_encoders": encoders,
        "features": feature_cols,
        "input_features": INPUT_FEATURES,
        "cross_specs": CROSS_SPECS,
        "weights": {
            "accident_type": ACCIDENT_TYPE_WEIGHTS,
            "victim_injury": VICTIM_INJURY_WEIGHTS,
            "casualty": CASUALTY_WEIGHTS,
            "severity_blend": SEVERITY_BLEND,
            "group_blend": GROUP_BLEND,
            "prior_strength": PRIOR_STRENGTH,
        },
        "target_mode": "expected_loss",
        "profile_lookup": profile_lookup,
        "profile_defaults": profile_defaults,
        "metrics": {
            "r2": float(r2),
            "rmse": float(rmse),
            "mae": float(mae),
            "violation_accuracy": float(vio_acc),
            "severity_accuracy": float(sev_acc),
            "n_profiles": len(profile_lookup),
            "n_years": float(parse_year_quarter(df["발생년월"])["연도"].nunique()),
        },
    }
    return package


def encode_input_row(data_input: dict, package: dict) -> np.ndarray:
    row = {k: data_input[k] for k in package["input_features"]}
    for a, b, name in package["cross_specs"]:
        row[name] = f"{row[a]}|{row[b]}"
    frame = pd.DataFrame([row])
    X, _ = encode_features(frame, package["features"], package["label_encoders"])
    return X.to_numpy()


def predict_insureguard(data_input: dict, package: dict) -> dict:
    """위험점수 + 법규위반 Top3(%) + 사고경중 비율(%)."""
    arr = encode_input_row(data_input, package)
    risk = float(package["regressor"].predict(arr)[0])
    risk = float(np.clip(risk, 0.0, 100.0))

    vio_enc = package["label_encoders"]["법규위반"]
    vio_probs = package["violation_classifier"].predict_proba(arr)[0]
    top3 = sorted(
        zip(vio_enc.classes_, vio_probs), key=lambda x: x[1], reverse=True
    )[:3]
    top3_pct = {str(name): round(float(p) * 100, 2) for name, p in top3}

    sev_enc = package["label_encoders"]["사고내용"]
    sev_probs = package["severity_classifier"].predict_proba(arr)[0]
    severity_ratio = {
        str(name): round(float(p) * 100, 2)
        for name, p in zip(sev_enc.classes_, sev_probs)
    }
    # 경중 순 정렬 표시용
    order = ["사망사고", "중상사고", "경상사고", "부상신고사고"]
    severity_ratio = {
        k: severity_ratio[k] for k in order if k in severity_ratio
    } | {k: v for k, v in severity_ratio.items() if k not in order}

    if risk >= 75:
        level = "CRITICAL"
    elif risk >= 50:
        level = "HIGH"
    elif risk >= 30:
        level = "MODERATE"
    else:
        level = "LOW"

    return {
        "모델": package["name"],
        "버전": package["version"],
        "위험점수": round(risk, 1),
        "위험등급": level,
        "법규위반_Top3_퍼센트": top3_pct,
        "사고경중_비율_퍼센트": severity_ratio,
    }


def save_package(package: dict) -> Path:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    path = MODEL_DIR / MODEL_FILENAME
    with open(path, "wb") as f:
        pickle.dump(package, f)
    return path


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def main() -> None:
    print(f"=== {MODEL_NAME} v{MODEL_VERSION} 학습 시작 ===")
    print("1. 데이터 불러오기 및 전처리...")
    df = load_and_clean()
    print(f"   사용 행: {len(df):,}")
    print("   사고내용 분포:")
    print(df["사고내용"].value_counts().to_string())

    print("\n2. 교차 변수·기대손실 타깃 설계...")
    print(f"   입력 피처: {INPUT_FEATURES}")
    print(f"   교차 피처: {[n for _, _, n in CROSS_SPECS]}")
    print("   타깃: 발생률(1만명당)×건당EPDO → 백분위")
    print(f"   EPDO 사고유형 가중치: {ACCIDENT_TYPE_WEIGHTS}")

    print("\n3. 성별·연령·차종 — 연도/분기별 중대사고 비율 분석·그래프...")
    run_exploratory_plots(df)

    print("\n4. 피처 인코딩 및 Train/Test 분리...")
    package = train_models(df)

    print("\n6. 모델 패키지 저장...")
    path = save_package(package)
    print(f"   저장 완료: {path}")
    print(f"   metrics: {package['metrics']}")

    print("\n7. 추론 시뮬레이션...")
    demo = {
        "가해운전자 성별": "남",
        "가해운전자 연령대": "21-30세",
        "가해운전자 차종": "승용",
        "지역": "북구",
    }
    result = predict_insureguard(demo, package)
    print(f"   입력: {demo}")
    print(f"   위험점수: {result['위험점수']} ({result['위험등급']})")
    print("   법규위반 Top3:")
    for k, v in result["법규위반_Top3_퍼센트"].items():
        print(f"     - {k}: {v}%")
    print("   사고경중 비율:")
    for k, v in result["사고경중_비율_퍼센트"].items():
        print(f"     - {k}: {v}%")
    print(f"\n=== {MODEL_NAME} v{MODEL_VERSION} 완료 ===")


if __name__ == "__main__":
    main()
