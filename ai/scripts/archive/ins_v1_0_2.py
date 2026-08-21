# -*- coding: utf-8 -*-
"""
InsureGuard AI v1.0.2
보험 인수·요율 참고용 교통사고 위험 예측 모델

입력(4): 성별, 연령대, 차종, 지역
교차 피처 + 경중 불균형 보정 가중치 → 위험점수 / 법규위반 Top3 / 사고경중 비율

※ 빈도 반영은 v1.0.3 (`scripts/archive/ins_v1_0_3.py`)·현재 서빙은 v1.0.4 (`scripts/ins_v1_0_4.py`) 참고.
"""

from __future__ import annotations

import pickle
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
ROOT = Path(__file__).resolve().parents[2]  # scripts/archive -> ai
DATA_PATH = ROOT / "data" / "raw" / "사고분석_2016~2025_원본합본.csv"
MODEL_DIR = ROOT / "models"
FIG_DIR = ROOT / "docs" / "figures" / "insureguard_v1_0_2"

MODEL_NAME = "InsureGuard AI"
MODEL_VERSION = "1.0.2"
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

# 타깃 합성 비율: 심각도(EPDO) vs 중대사고율 (빈도 미반영 — v1.0.2)
SEVERITY_BLEND = 0.72
GROUP_BLEND = 0.28


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


def compute_risk_target(df: pd.DataFrame) -> pd.DataFrame:
    """
    개별 사고 EPDO가 아니라 '동일 프로파일의 기대 위험'을 타깃으로 둔다.

    입력(성별·연령·차종·지역)만으로는 개별 사고 경중을 맞출 수 없고,
    보험 인수 점수는 프로파일 기대위험이 맞다.
    경상 쏠림은 (1) 강한 EPDO 가중 (2) 중대사고율 블렌드 (3) 희소 그룹
    Empirical Bayes 스무딩으로 보정한다.
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

    prior_strength = 40.0
    global_epdo = float(out["epdo"].mean())
    global_severe = float(out["중대사고"].mean())

    g = out.groupby(key, sort=False)
    n = g["epdo"].transform("size").astype(float)
    sum_epdo = g["epdo"].transform("sum")
    sum_sev = g["중대사고"].transform("sum")

    smooth_epdo = (sum_epdo + prior_strength * global_epdo) / (n + prior_strength)
    smooth_sev = (sum_sev + prior_strength * global_severe) / (n + prior_strength)

    sev_component = np.log1p(smooth_epdo)
    profile_score = SEVERITY_BLEND * sev_component + GROUP_BLEND * (smooth_sev * 10.0)
    uniq = (
        pd.DataFrame({"key": key, "score": profile_score})
        .drop_duplicates("key")
        .set_index("key")["score"]
    )
    ranks = uniq.rank(method="average", pct=True)
    out["위험점수"] = key.map(ranks).astype(float) * 100.0
    out["smooth_epdo"] = smooth_epdo
    out["smooth_severe_rate"] = smooth_sev
    return out


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
    df = compute_risk_target(df)
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
        },
        "metrics": {
            "r2": float(r2),
            "rmse": float(rmse),
            "mae": float(mae),
            "violation_accuracy": float(vio_acc),
            "severity_accuracy": float(sev_acc),
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

    print("\n2. 교차 변수·가중 위험점수 설계...")
    print(f"   입력 피처: {INPUT_FEATURES}")
    print(f"   교차 피처: {[n for _, _, n in CROSS_SPECS]}")
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
