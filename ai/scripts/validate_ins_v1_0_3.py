# -*- coding: utf-8 -*-
"""
InsureGuard AI v1.0.3 — 엄격 검증 (A~C)

A) 연도 Time-based split
B) 프로파일 통계를 train에서만 집계 후 test에 적용
C) 개별 EPDO를 타깃으로 둔 baseline

사용:
  python -m scripts.validate_ins_v1_0_3
  # 또는
  python scripts/validate_ins_v1_0_3.py
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

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

ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "docs" / "validation_v1_0_3_results.json"
OUT_MD = ROOT / "docs" / "validation_v1_0_3.md"
TEST_YEARS = {2024, 2025}  # A/B time split: 이 연도들을 test


def _load_ins():
    path = ROOT / "scripts" / "ins_v1_0_3.py"
    spec = importlib.util.spec_from_file_location("ins_v1_0_3", path)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def add_year(df: pd.DataFrame, ins) -> pd.DataFrame:
    out = df.copy()
    yq = ins.parse_year_quarter(out["발생년월"])
    out["연도"] = yq["연도"]
    return out


def add_epdo_columns(df: pd.DataFrame, ins) -> pd.DataFrame:
    """프로파일 점수 없이 행 단위 EPDO만 부여."""
    out = df.copy()
    out["피해자상해가중치"] = (
        out["피해운전자 상해정도"].map(ins.VICTIM_INJURY_WEIGHTS).fillna(0.0)
    )
    out["사고유형가중치"] = out["사고내용"].map(ins.ACCIDENT_TYPE_WEIGHTS).fillna(1.0)
    out["epdo"] = (
        out["사망자수"].fillna(0) * ins.CASUALTY_WEIGHTS["사망자수"]
        + out["중상자수"].fillna(0) * ins.CASUALTY_WEIGHTS["중상자수"]
        + out["경상자수"].fillna(0) * ins.CASUALTY_WEIGHTS["경상자수"]
        + out["피해자상해가중치"]
        + out["사고유형가중치"]
    )
    out["_profile"] = ins._profile_key(out)
    return out


def apply_train_profile_scores(
    train_df: pd.DataFrame, test_df: pd.DataFrame, ins
) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """
    B: train에서만 compute_risk_target → test 프로파일에 매핑.
    train에 없는 프로파일은 train 위험점수 평균으로 fallback.
    """
    train_scored = ins.compute_risk_target(train_df.copy())
    score_map = (
        train_scored.drop_duplicates("_profile")
        .set_index("_profile")["위험점수"]
        .to_dict()
    )
    fallback = float(np.mean(list(score_map.values())))

    test_out = add_epdo_columns(test_df, ins)
    test_out["위험점수"] = test_out["_profile"].map(score_map)
    n_missing = int(test_out["위험점수"].isna().sum())
    test_out["위험점수"] = test_out["위험점수"].fillna(fallback)

    meta = {
        "train_profiles": len(score_map),
        "test_rows": len(test_out),
        "test_unseen_profile_rows": n_missing,
        "fallback_score": round(fallback, 2),
    }
    return train_scored, test_out, meta


def _fit_eval(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    ins,
    *,
    y_col: str,
    y_transform: str = "identity",
) -> dict:
    """공통: 피처 인코딩 → HGB 회귀 + RF 분류 학습/평가."""
    feature_cols = ins.model_feature_names()
    train_x = ins.add_cross_features(train_df)
    test_x = ins.add_cross_features(test_df)

    X_tr, encoders = ins.encode_features(train_x, feature_cols)
    X_te, _ = ins.encode_features(test_x, feature_cols, encoders)

    y_tr = train_df[y_col].to_numpy(dtype=float)
    y_te = test_df[y_col].to_numpy(dtype=float)
    if y_transform == "log1p":
        y_tr = np.log1p(y_tr)
        y_te = np.log1p(y_te)

    w_tr = ins.build_sample_weights(train_x if "_profile" in train_x.columns else train_df)

    reg = HistGradientBoostingRegressor(
        max_depth=10,
        learning_rate=0.08,
        max_iter=400,
        min_samples_leaf=20,
        l2_regularization=0.05,
        random_state=42,
    )
    reg.fit(X_tr, y_tr, sample_weight=w_tr)
    pred = reg.predict(X_te)
    if y_transform == "log1p":
        # 지표는 log1p 스케일에서 계산 (개별 EPDO 비교용)
        pass
    else:
        pred = np.clip(pred, 0.0, 100.0)

    metrics = {
        "r2": float(r2_score(y_te, pred)),
        "rmse": float(root_mean_squared_error(y_te, pred)),
        "mae": float(mean_absolute_error(y_te, pred)),
        "n_train": int(len(train_df)),
        "n_test": int(len(test_df)),
        "y_transform": y_transform,
        "y_col": y_col,
    }

    # 분류: train 라벨 공간 기준
    le_v = LabelEncoder()
    y_vio_tr = le_v.fit_transform(train_df["법규위반"].astype(str))
    vio_te = test_df["법규위반"].astype(str)
    known_v = set(le_v.classes_)
    mask_v = vio_te.isin(known_v)
    vio_clf = RandomForestClassifier(
        n_estimators=200, max_depth=16, min_samples_leaf=5, random_state=42, n_jobs=-1
    )
    vio_clf.fit(X_tr, y_vio_tr)
    if mask_v.any():
        y_vio_te = le_v.transform(vio_te[mask_v])
        metrics["violation_accuracy"] = float(
            accuracy_score(y_vio_te, vio_clf.predict(X_te.loc[mask_v]))
        )
        metrics["violation_eval_rows"] = int(mask_v.sum())
    else:
        metrics["violation_accuracy"] = None
        metrics["violation_eval_rows"] = 0

    le_s = LabelEncoder()
    y_sev_tr = le_s.fit_transform(train_df["사고내용"].astype(str))
    sev_te = test_df["사고내용"].astype(str)
    known_s = set(le_s.classes_)
    mask_s = sev_te.isin(known_s)
    sev_clf = RandomForestClassifier(
        n_estimators=200, max_depth=14, min_samples_leaf=5, random_state=42, n_jobs=-1
    )
    sev_clf.fit(X_tr, y_sev_tr)
    if mask_s.any():
        y_sev_te = le_s.transform(sev_te[mask_s])
        metrics["severity_accuracy"] = float(
            accuracy_score(y_sev_te, sev_clf.predict(X_te.loc[mask_s]))
        )
        metrics["severity_eval_rows"] = int(mask_s.sum())
    else:
        metrics["severity_accuracy"] = None
        metrics["severity_eval_rows"] = 0

    return metrics


def run_ref_random_full(df: pd.DataFrame, ins) -> dict:
    """현재 학습과 동일: 전체 타깃 → random split."""
    scored = ins.compute_risk_target(df.copy())
    scored = ins.add_cross_features(scored)
    idx = np.arange(len(scored))
    tr_i, te_i = train_test_split(
        idx,
        test_size=0.2,
        random_state=42,
        stratify=scored["사고내용"],
    )
    train_df = scored.iloc[tr_i].reset_index(drop=True)
    test_df = scored.iloc[te_i].reset_index(drop=True)
    m = _fit_eval(train_df, test_df, ins, y_col="위험점수")
    m["name"] = "ref_random_full_target"
    m["description"] = "현재 방식: 전체 데이터 프로파일 타깃 + random 80/20"
    return m


def run_A_time_full(df: pd.DataFrame, ins) -> dict:
    """A: 연도 split, 타깃은 전체 데이터로 생성(누수 있음 — 시간 일반화만 분리)."""
    scored = ins.compute_risk_target(df.copy())
    scored = add_year(scored, ins)
    train_df = scored[~scored["연도"].isin(TEST_YEARS)].reset_index(drop=True)
    test_df = scored[scored["연도"].isin(TEST_YEARS)].reset_index(drop=True)
    m = _fit_eval(train_df, test_df, ins, y_col="위험점수")
    m["name"] = "A_time_full_target"
    m["description"] = (
        f"Time split train∉{sorted(TEST_YEARS)} / test∈{sorted(TEST_YEARS)}; "
        "타깃은 전체 기간 프로파일 통계(약한 누수)"
    )
    m["train_years"] = sorted(train_df["연도"].dropna().unique().tolist())
    m["test_years"] = sorted(test_df["연도"].dropna().unique().tolist())
    return m


def run_B_time_trainonly(df: pd.DataFrame, ins) -> dict:
    """B(+A): 연도 split + train-only 프로파일 타깃."""
    base = add_year(df.copy(), ins)
    train_raw = base[~base["연도"].isin(TEST_YEARS)].reset_index(drop=True)
    test_raw = base[base["연도"].isin(TEST_YEARS)].reset_index(drop=True)
    train_scored, test_scored, meta = apply_train_profile_scores(
        train_raw, test_raw, ins
    )
    m = _fit_eval(train_scored, test_scored, ins, y_col="위험점수")
    m["name"] = "B_time_trainonly_target"
    m["description"] = (
        f"Time split + 프로파일 통계를 train만 집계 후 test 매핑 "
        f"(test∈{sorted(TEST_YEARS)})"
    )
    m["train_years"] = sorted(train_raw["연도"].dropna().unique().tolist())
    m["test_years"] = sorted(test_raw["연도"].dropna().unique().tolist())
    m["profile_meta"] = meta
    return m


def run_B_random_trainonly(df: pd.DataFrame, ins) -> dict:
    """B only: random split + train-only 타깃 (누수 제거 효과 분리)."""
    base = df.copy()
    idx = np.arange(len(base))
    tr_i, te_i = train_test_split(
        idx, test_size=0.2, random_state=42, stratify=base["사고내용"]
    )
    train_raw = base.iloc[tr_i].reset_index(drop=True)
    test_raw = base.iloc[te_i].reset_index(drop=True)
    train_scored, test_scored, meta = apply_train_profile_scores(
        train_raw, test_raw, ins
    )
    m = _fit_eval(train_scored, test_scored, ins, y_col="위험점수")
    m["name"] = "B_random_trainonly_target"
    m["description"] = "Random 80/20 + 프로파일 통계 train-only (누수 제거)"
    m["profile_meta"] = meta
    return m


def run_C_epdo(df: pd.DataFrame, ins, *, time_split: bool) -> dict:
    """C: 개별 행 EPDO(log1p) 회귀 baseline."""
    base = add_epdo_columns(df.copy(), ins)
    base = add_year(base, ins)
    if time_split:
        train_df = base[~base["연도"].isin(TEST_YEARS)].reset_index(drop=True)
        test_df = base[base["연도"].isin(TEST_YEARS)].reset_index(drop=True)
        name = "C_time_individual_epdo"
        desc = f"Time split; y=log1p(행단위 EPDO); test∈{sorted(TEST_YEARS)}"
    else:
        idx = np.arange(len(base))
        tr_i, te_i = train_test_split(
            idx, test_size=0.2, random_state=42, stratify=base["사고내용"]
        )
        train_df = base.iloc[tr_i].reset_index(drop=True)
        test_df = base.iloc[te_i].reset_index(drop=True)
        name = "C_random_individual_epdo"
        desc = "Random 80/20; y=log1p(행단위 EPDO)"

    m = _fit_eval(train_df, test_df, ins, y_col="epdo", y_transform="log1p")
    m["name"] = name
    m["description"] = desc
    if time_split:
        m["train_years"] = sorted(train_df["연도"].dropna().unique().tolist())
        m["test_years"] = sorted(test_df["연도"].dropna().unique().tolist())
    return m


def _fmt_pct(x) -> str:
    if x is None:
        return "-"
    return f"{x * 100:.1f}%"


def write_markdown(results: list[dict], year_counts: dict) -> None:
    lines = [
        "# InsureGuard AI v1.0.3 — 엄격 검증 결과 (A~C)",
        "",
        "스크립트: `scripts/validate_ins_v1_0_3.py`  ",
        f"Test 연도(A/B time): `{sorted(TEST_YEARS)}`",
        "",
        "## 연도별 행 수",
        "",
        "| 연도 | 건수 |",
        "|------|------|",
    ]
    for y, n in sorted(year_counts.items()):
        tag = " ← test" if y in TEST_YEARS else ""
        lines.append(f"| {y} | {n:,}{tag} |")

    lines += [
        "",
        "## 결과 요약",
        "",
        "| 실험 | Split | 타깃 | R² | RMSE | MAE | 법규 Acc | 경중 Acc | n_train | n_test |",
        "|------|-------|------|----|------|-----|----------|----------|---------|--------|",
    ]
    for m in results:
        split = "time" if "time" in m["name"] else "random"
        if "epdo" in m["name"]:
            target = "log1p(행 EPDO)"
        elif "trainonly" in m["name"]:
            target = "train-only 프로파일"
        else:
            target = "full 프로파일"
        lines.append(
            "| {name} | {split} | {target} | {r2:.4f} | {rmse:.2f} | {mae:.2f} | {vio} | {sev} | {ntr:,} | {nte:,} |".format(
                name=m["name"],
                split=split,
                target=target,
                r2=m["r2"],
                rmse=m["rmse"],
                mae=m["mae"],
                vio=_fmt_pct(m.get("violation_accuracy")),
                sev=_fmt_pct(m.get("severity_accuracy")),
                ntr=m["n_train"],
                nte=m["n_test"],
            )
        )

    lines += [
        "",
        "## 실험 설명",
        "",
    ]
    for m in results:
        lines.append(f"- **{m['name']}**: {m['description']}")
        if "profile_meta" in m:
            pm = m["profile_meta"]
            lines.append(
                f"  - test 미지 프로파일 행: {pm['test_unseen_profile_rows']:,} / "
                f"{pm['test_rows']:,} (fallback={pm['fallback_score']})"
            )

    lines += [
        "",
        "## 해석 가이드",
        "",
        "1. **ref → A**: R²가 크게 떨어지면 연도 변화에 민감(프로파일 점수 매핑의 시간 불안정).",
        "2. **ref → B_random_trainonly**: R² 하락은 전체 데이터 프로파일 통계 **타깃 누수** 기여분.",
        "3. **B_time_trainonly**: 시간 분리 + 누수 제거의 가장 엄격한 조합.",
        "4. **C (개별 EPDO)**: R²가 프로파일 타깃보다 훨씬 낮으면, "
        "입력 4개만으로 **개별 사고 경중**을 맞추기 어렵다는 기존 해석을 지지.",
        "5. 분류 Acc는 프로파일 위험점수와 **별도 과제**이며, R²와 직접 비교하지 말 것.",
        "",
        "## 산출 파일",
        "",
        f"- `{OUT_JSON.relative_to(ROOT)}`",
        f"- `{OUT_MD.relative_to(ROOT)}`",
        "",
    ]
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    print("=== InsureGuard v1.0.3 validation A~C ===")
    ins = _load_ins()
    df = ins.load_and_clean()
    df = add_year(df, ins)
    year_counts = df["연도"].value_counts().sort_index().to_dict()
    year_counts = {int(k): int(v) for k, v in year_counts.items()}
    print("year counts:", year_counts)

    results: list[dict] = []
    experiments = [
        ("ref", lambda: run_ref_random_full(df, ins)),
        ("A", lambda: run_A_time_full(df, ins)),
        ("B_time", lambda: run_B_time_trainonly(df, ins)),
        ("B_random", lambda: run_B_random_trainonly(df, ins)),
        ("C_time", lambda: run_C_epdo(df, ins, time_split=True)),
        ("C_random", lambda: run_C_epdo(df, ins, time_split=False)),
    ]
    for label, fn in experiments:
        print(f"\n--- running {label} ---")
        m = fn()
        print(
            f"  R²={m['r2']:.4f} RMSE={m['rmse']:.2f} MAE={m['mae']:.2f} "
            f"vio={m.get('violation_accuracy')} sev={m.get('severity_accuracy')}"
        )
        results.append(m)

    payload = {
        "model": "InsureGuard AI",
        "version": "1.0.3",
        "test_years": sorted(TEST_YEARS),
        "year_counts": year_counts,
        "results": results,
    }
    OUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    write_markdown(results, year_counts)
    print(f"\nWrote {OUT_JSON}")
    print(f"Wrote {OUT_MD}")
    print("=== done ===")


if __name__ == "__main__":
    # scripts/ 에서 직접 실행해도 ROOT 기준 import 되도록
    sys.path.insert(0, str(ROOT))
    main()
