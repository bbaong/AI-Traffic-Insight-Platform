"""추론 — InsureGuard AI v1.0.4 (ins_model_v1.0.4.pkl)."""

from __future__ import annotations

import argparse
import json
import pickle
from functools import lru_cache
from typing import Any

import numpy as np
import pandas as pd

from src.ins_coverage_rules import recommend_coverages

from src import MODEL_DIR

MODEL_PATH = MODEL_DIR / "ins_model_v1.0.4.pkl"


@lru_cache(maxsize=1)
def load_model() -> dict[str, Any]:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"모델 파일이 없습니다: {MODEL_PATH}")
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def risk_level_from_score(score: float) -> str:
    if score >= 75:
        return "CRITICAL"
    if score >= 50:
        return "HIGH"
    if score >= 30:
        return "MODERATE"
    return "LOW"


def _encode_input_row(
    data_input: dict[str, str], package: dict[str, Any]
) -> pd.DataFrame:
    row = {k: data_input[k] for k in package["input_features"]}
    for a, b, name in package["cross_specs"]:
        row[name] = f"{row[a]}|{row[b]}"
    frame = pd.DataFrame([row])

    encoders = package["label_encoders"]
    cols: dict[str, list[float]] = {}
    for col in package["features"]:
        le = encoders[col]
        val = str(frame[col].iloc[0])
        if val not in set(le.classes_):
            val = str(le.classes_[0])
        cols[col] = [float(le.transform([val])[0])]
    return pd.DataFrame(cols)[package["features"]]


def predict_from_input(
    구군: str,
    연령대: str,
    성별: str,
    차종: str,
    **_ignored: Any,
) -> dict:
    """입력 4개: 지역(구군), 연령대, 성별, 차종."""
    package = load_model()
    data_input = {
        "가해운전자 성별": 성별,
        "가해운전자 연령대": 연령대,
        "가해운전자 차종": 차종,
        "지역": 구군,
    }
    X = _encode_input_row(data_input, package)

    risk = float(package["regressor"].predict(X)[0])
    risk = float(np.clip(risk, 0.0, 100.0))

    vio_enc = package["label_encoders"]["법규위반"]
    vio_clf = package.get("violation_classifier") or package["classifier"]
    vio_probs = vio_clf.predict_proba(X)[0]
    ranked = sorted(
        zip(vio_enc.classes_, vio_probs),
        key=lambda x: x[1],
        reverse=True,
    )
    top3 = {str(name): round(float(p), 4) for name, p in ranked[:3]}
    all_vio = {str(name): float(p) for name, p in zip(vio_enc.classes_, vio_probs)}

    sev_enc = package["label_encoders"]["사고내용"]
    sev_clf = package["severity_classifier"]
    sev_probs = sev_clf.predict_proba(X)[0]
    severity = {
        str(name): round(float(p), 4)
        for name, p in zip(sev_enc.classes_, sev_probs)
    }
    order = ["사망사고", "중상사고", "경상사고", "부상신고사고"]
    severity = {k: severity[k] for k in order if k in severity} | {
        k: v for k, v in severity.items() if k not in order
    }

    return {
    "버전": f"{package.get('name', 'InsureGuard AI')} v{package.get('version', '1.0.4')}",
    "variant": "ins_v1.0.4",
    "예측등급": risk_level_from_score(risk),
    "위험도": round(risk, 1),
    "등급확률": top3,
    "사고경중비율": severity,
    "담보추천": recommend_coverages(
        grade=risk_level_from_score(risk),
        age=연령대,
        violation_probs=all_vio,
    ),
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--구군", default="달서구")
    parser.add_argument("--연령대", default="51-60세")
    parser.add_argument("--성별", default="남")
    parser.add_argument("--차종", default="승용")
    args = parser.parse_args()
    print(json.dumps(predict_from_input(**vars(args)), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
