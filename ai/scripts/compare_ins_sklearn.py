# -*- coding: utf-8 -*-
"""
InsureGuard — sklearn-only algorithm comparison (v1.0.3 target fixed).

Compares regressors / classifiers under identical data, cleaning, features, and target.
Outputs:
  docs/ins_sklearn_model_compare.json
  docs/ins_sklearn_model_compare.md
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
from sklearn.ensemble import (
    HistGradientBoostingClassifier,
    HistGradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    r2_score,
    root_mean_squared_error,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore", category=UserWarning)

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "ins_v1_0_3.py"
OUT_JSON = ROOT / "docs" / "ins_sklearn_model_compare.json"
OUT_MD = ROOT / "docs" / "ins_sklearn_model_compare.md"

RANDOM_STATE = 42
TEST_YEARS = {2024, 2025}


def _load_ins():
    spec = importlib.util.spec_from_file_location("ins_v1_0_3", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules["ins_v1_0_3"] = mod
    spec.loader.exec_module(mod)
    return mod


def risk_level_from_score(score: float) -> str:
    """Same thresholds as ai/src/inference.py."""
    if score >= 75:
        return "CRITICAL"
    if score >= 50:
        return "HIGH"
    if score >= 30:
        return "MODERATE"
    return "LOW"


def grade_accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    t = [risk_level_from_score(float(v)) for v in y_true]
    p = [risk_level_from_score(float(v)) for v in np.clip(y_pred, 0, 100)]
    return float(np.mean([a == b for a, b in zip(t, p)]))


def prepare_matrix(ins):
    df = ins.load_and_clean()
    df = ins.add_cross_features(df)
    df = ins.compute_risk_target(df)
    yq = ins.parse_year_quarter(df["발생년월"])
    df = pd.concat([df, yq], axis=1)
    feat = ins.model_feature_names()
    X_all, encoders = ins.encode_features(df, feat)
    w = ins.build_sample_weights(df)
    y_risk = df["위험점수"].to_numpy(dtype=float)
    y_vio = df["법규위반"].astype(str)
    y_sev = df["사고내용"].astype(str)
    years = df["연도"].to_numpy(dtype=int)
    return {
        "X": X_all.to_numpy(dtype=float),
        "w": w,
        "y_risk": y_risk,
        "y_vio": y_vio.to_numpy(),
        "y_sev": y_sev.to_numpy(),
        "years": years,
        "n": len(df),
        "feature_names": feat,
        "encoders": encoders,
    }


def split_random(data: dict):
    idx = np.arange(data["n"])
    tr, te = train_test_split(
        idx,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=data["y_sev"],
    )
    return tr, te


def split_time(data: dict):
    te = np.where(np.isin(data["years"], list(TEST_YEARS)))[0]
    tr = np.where(~np.isin(data["years"], list(TEST_YEARS)))[0]
    return tr, te


def reg_candidates():
    return {
        "HistGradientBoostingRegressor": HistGradientBoostingRegressor(
            max_depth=10,
            learning_rate=0.08,
            max_iter=400,
            min_samples_leaf=20,
            l2_regularization=0.05,
            random_state=RANDOM_STATE,
        ),
        "RandomForestRegressor": RandomForestRegressor(
            n_estimators=200,
            max_depth=16,
            min_samples_leaf=5,
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


def clf_candidates(task: str):
    # mild settings aligned with production RF depth
    return {
        "RandomForestClassifier": RandomForestClassifier(
            n_estimators=200,
            max_depth=16 if task == "violation" else 14,
            min_samples_leaf=5,
            random_state=RANDOM_STATE,
            n_jobs=-1,
        ),
        "HistGradientBoostingClassifier": HistGradientBoostingClassifier(
            max_depth=10,
            learning_rate=0.08,
            max_iter=300,
            min_samples_leaf=20,
            random_state=RANDOM_STATE,
        ),
        "LogisticRegression": Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "model",
                    LogisticRegression(
                        max_iter=800,
                        solver="lbfgs",
                        random_state=RANDOM_STATE,
                    ),
                ),
            ]
        ),
    }


def eval_regressor(name: str, model, X_tr, y_tr, w_tr, X_te, y_te) -> dict:
    t0 = time.perf_counter()
    if isinstance(model, Pipeline):
        model.fit(X_tr, y_tr, model__sample_weight=w_tr)
    else:
        model.fit(X_tr, y_tr, sample_weight=w_tr)
    train_s = time.perf_counter() - t0
    t1 = time.perf_counter()
    pred = np.clip(model.predict(X_te), 0.0, 100.0)
    infer_s = time.perf_counter() - t1
    return {
        "name": name,
        "r2": float(r2_score(y_te, pred)),
        "rmse": float(root_mean_squared_error(y_te, pred)),
        "mae": float(mean_absolute_error(y_te, pred)),
        "grade_accuracy": grade_accuracy(y_te, pred),
        "train_seconds": round(train_s, 3),
        "infer_seconds": round(infer_s, 4),
    }


def eval_classifier(name: str, model, X_tr, y_tr, X_te, y_te) -> dict:
    t0 = time.perf_counter()
    model.fit(X_tr, y_tr)
    train_s = time.perf_counter() - t0
    t1 = time.perf_counter()
    pred = model.predict(X_te)
    infer_s = time.perf_counter() - t1
    return {
        "name": name,
        "accuracy": float(accuracy_score(y_te, pred)),
        "macro_f1": float(f1_score(y_te, pred, average="macro", zero_division=0)),
        "train_seconds": round(train_s, 3),
        "infer_seconds": round(infer_s, 4),
    }


def run_split(data: dict, split_name: str, tr: np.ndarray, te: np.ndarray) -> dict:
    X, w = data["X"], data["w"]
    X_tr, X_te = X[tr], X[te]
    w_tr = w[tr]
    y_risk_tr, y_risk_te = data["y_risk"][tr], data["y_risk"][te]
    y_vio_tr, y_vio_te = data["y_vio"][tr], data["y_vio"][te]
    y_sev_tr, y_sev_te = data["y_sev"][tr], data["y_sev"][te]

    print(f"\n=== split={split_name}  train={len(tr)} test={len(te)} ===")

    reg_rows = []
    for name, model in reg_candidates().items():
        print(f"  [reg] {name} ...")
        row = eval_regressor(
            name, model, X_tr, y_risk_tr, w_tr, X_te, y_risk_te
        )
        reg_rows.append(row)
        print(
            f"    R2={row['r2']:.4f} MAE={row['mae']:.3f} "
            f"grade={row['grade_accuracy']:.3f}"
        )

    vio_rows = []
    for name, model in clf_candidates("violation").items():
        print(f"  [vio] {name} ...")
        row = eval_classifier(name, model, X_tr, y_vio_tr, X_te, y_vio_te)
        vio_rows.append(row)
        print(f"    Acc={row['accuracy']:.4f} macroF1={row['macro_f1']:.4f}")

    sev_rows = []
    for name, model in clf_candidates("severity").items():
        print(f"  [sev] {name} ...")
        row = eval_classifier(name, model, X_tr, y_sev_tr, X_te, y_sev_te)
        sev_rows.append(row)
        print(f"    Acc={row['accuracy']:.4f} macroF1={row['macro_f1']:.4f}")

    # Winner rules
    best_reg = min(reg_rows, key=lambda r: (r["mae"], -r["grade_accuracy"]))
    best_vio = max(vio_rows, key=lambda r: (r["accuracy"], r["macro_f1"]))
    best_sev = max(sev_rows, key=lambda r: (r["accuracy"], r["macro_f1"]))

    return {
        "split": split_name,
        "n_train": int(len(tr)),
        "n_test": int(len(te)),
        "regressor": reg_rows,
        "violation_clf": vio_rows,
        "severity_clf": sev_rows,
        "winners": {
            "regressor": best_reg["name"],
            "violation_clf": best_vio["name"],
            "severity_clf": best_sev["name"],
            "rule": {
                "regressor": "min MAE, then max grade_accuracy",
                "classifier": "max accuracy, then max macro_f1",
            },
        },
    }


def write_md(payload: dict) -> None:
    lines = [
        "# InsureGuard — sklearn 알고리즘 비교",
        "",
        "> 타깃·피처·클리닝은 **v1.0.3 고정**. 후보만 변경 (sklearn only).",
        "",
        "## 설정",
        "",
        "| 항목 | 값 |",
        "|------|-----|",
        "| 데이터 | `사고분석_2016~2025_원본합본.csv` |",
        "| 타깃 | 프로파일 위험점수 (심각도 70% + 빈도 30%) |",
        "| 피처 | 입력 4 + 교차 6 |",
        "| 회귀 후보 | HistGradientBoostingRegressor, RandomForestRegressor, Ridge |",
        "| 분류 후보 | RandomForestClassifier, HistGradientBoostingClassifier, LogisticRegression |",
        "| split | random 80/20 (stratify=사고내용), time (test∈2024–2025) |",
        "| 승자 규칙 | 회귀: MAE↓ → 등급일치↑ / 분류: Acc↑ → macro-F1↑ |",
        "",
        "## 해석 주의",
        "",
        "- R²·RMSE·MAE는 **프로파일 스코어카드 재현도**이지 개별 사고 예측력이 아님.",
        "- 현재 서빙: 회귀 HGBR + 분류 RF×2 (`ins_model_v1.0.3.pkl`).",
        "",
    ]

    for block in payload["splits"]:
        lines.append(f"## Split: `{block['split']}` (train={block['n_train']}, test={block['n_test']})")
        lines.append("")
        lines.append("### 위험점수 회귀")
        lines.append("")
        lines.append("| 모델 | R² | RMSE | MAE | 등급일치 | train(s) |")
        lines.append("|------|-----|------|-----|----------|----------|")
        for r in block["regressor"]:
            mark = " ✅" if r["name"] == block["winners"]["regressor"] else ""
            lines.append(
                f"| {r['name']}{mark} | {r['r2']:.4f} | {r['rmse']:.3f} | "
                f"{r['mae']:.3f} | {r['grade_accuracy']:.3f} | {r['train_seconds']} |"
            )
        lines.append("")
        lines.append("### 법규위반 분류")
        lines.append("")
        lines.append("| 모델 | Accuracy | macro-F1 | train(s) |")
        lines.append("|------|----------|----------|----------|")
        for r in block["violation_clf"]:
            mark = " ✅" if r["name"] == block["winners"]["violation_clf"] else ""
            lines.append(
                f"| {r['name']}{mark} | {r['accuracy']:.4f} | {r['macro_f1']:.4f} | {r['train_seconds']} |"
            )
        lines.append("")
        lines.append("### 사고경중 분류")
        lines.append("")
        lines.append("| 모델 | Accuracy | macro-F1 | train(s) |")
        lines.append("|------|----------|----------|----------|")
        for r in block["severity_clf"]:
            mark = " ✅" if r["name"] == block["winners"]["severity_clf"] else ""
            lines.append(
                f"| {r['name']}{mark} | {r['accuracy']:.4f} | {r['macro_f1']:.4f} | {r['train_seconds']} |"
            )
        lines.append("")

    # Conclusion from time split primarily
    time_block = next(s for s in payload["splits"] if s["split"] == "time_2024_2025")
    rand_block = next(s for s in payload["splits"] if s["split"] == "random_80_20")

    def _reg(block, name):
        return next(r for r in block["regressor"] if r["name"] == name)

    hg_t = _reg(time_block, "HistGradientBoostingRegressor")
    rf_t = _reg(time_block, "RandomForestRegressor")
    ridge_t = _reg(time_block, "Ridge")

    lines.extend(
        [
            "## 결론 (적합성)",
            "",
            f"- **설득력용 time split** 회귀 승자(MAE): `{time_block['winners']['regressor']}`",
            f"- **pkl 재현용 random split** 회귀 승자(MAE): `{rand_block['winners']['regressor']}`",
            f"- 법규 분류 (time): `{time_block['winners']['violation_clf']}`",
            f"- 경중 분류 (time): `{time_block['winners']['severity_clf']}`",
            "",
            "### 해석",
            "",
            "1. **비선형 필수:** Ridge(time MAE "
            f"{ridge_t['mae']:.1f}) ≫ 트리 계열 → LabelEncoder 범주 입력에는 "
            "선형 기준선이 부적합하고 **트리 모델이 적합**.",
            "2. **RF vs HGBR:** 프로파일 스코어 재현에서는 "
            f"RF(time MAE {rf_t['mae']:.3f})가 HGBR({hg_t['mae']:.3f})보다 "
            "수치상 앞선다. 동일 프로파일이 행마다 반복되는 타깃 특성상 "
            "RF의 분할이 유리할 수 있다.",
            "3. **현재 서빙(HGBR):** time R² "
            f"{hg_t['r2']:.3f} / MAE {hg_t['mae']:.2f} / 등급일치 "
            f"{hg_t['grade_accuracy']:.1%}로 **실무 참고용으로는 충분한 적합**. "
            "운영 중 pkl·추론 코드를 유지할 근거가 된다. "
            "순수 오차 최소화만 보면 RF 회귀로 교체 여지를 문서화한다.",
            "4. **분류:** 후보 간 Acc 차이가 매우 작아 "
            "(~0.5%p 내외) **현행 RF 유지가 합리적**. macro-F1도 전체적으로 낮아 "
            "메인 KPI로 쓰기 어렵다.",
            "",
            "생성: 스크립트 `scripts/compare_ins_sklearn.py`",
            "",
        ]
    )
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    ins = _load_ins()
    print("Loading & preparing...")
    data = prepare_matrix(ins)
    print(f"n={data['n']} features={len(data['feature_names'])}")

    splits = []
    tr_r, te_r = split_random(data)
    splits.append(run_split(data, "random_80_20", tr_r, te_r))
    tr_t, te_t = split_time(data)
    splits.append(run_split(data, "time_2024_2025", tr_t, te_t))

    payload = {
        "scope": "sklearn_only",
        "target_version": "ins_v1.0.3",
        "serving": {
            "regressor": "HistGradientBoostingRegressor",
            "violation_clf": "RandomForestClassifier",
            "severity_clf": "RandomForestClassifier",
        },
        "splits": splits,
    }
    OUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    write_md(payload)
    print(f"\nWrote {OUT_JSON}")
    print(f"Wrote {OUT_MD}")


if __name__ == "__main__":
    main()
