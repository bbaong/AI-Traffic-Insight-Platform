"""InsureGuard AI — 추론 전용 헬퍼 (v1.0.2~v1.0.4 패키지 호환)."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder


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


def encode_input_row(data_input: dict, package: dict) -> pd.DataFrame:
    row = {k: data_input[k] for k in package["input_features"]}
    for a, b, name in package["cross_specs"]:
        row[name] = f"{row[a]}|{row[b]}"
    frame = pd.DataFrame([row])
    X, _ = encode_features(frame, package["features"], package["label_encoders"])
    return X


def risk_level_from_score(score: float) -> str:
    """위험등급 임계값: 75 / 50 / 30."""
    if score >= 75:
        return "CRITICAL"
    if score >= 50:
        return "HIGH"
    if score >= 30:
        return "MODERATE"
    return "LOW"


def predict_insureguard(data_input: dict, package: dict) -> dict[str, Any]:
    """위험점수 + 법규위반 Top3(%) + 사고경중 비율(%)."""
    X = encode_input_row(data_input, package)
    risk = float(package["regressor"].predict(X)[0])
    risk = float(np.clip(risk, 0.0, 100.0))

    vio_enc = package["label_encoders"]["법규위반"]
    vio_probs = package["violation_classifier"].predict_proba(X)[0]
    top3 = sorted(
        zip(vio_enc.classes_, vio_probs), key=lambda x: x[1], reverse=True
    )[:3]
    top3_pct = {str(name): round(float(p) * 100, 2) for name, p in top3}

    sev_enc = package["label_encoders"]["사고내용"]
    sev_probs = package["severity_classifier"].predict_proba(X)[0]
    severity_ratio = {
        str(name): round(float(p) * 100, 2)
        for name, p in zip(sev_enc.classes_, sev_probs)
    }
    order = ["사망사고", "중상사고", "경상사고", "부상신고사고"]
    severity_ratio = {
        k: severity_ratio[k] for k in order if k in severity_ratio
    } | {k: v for k, v in severity_ratio.items() if k not in order}

    return {
        "모델": package.get("name", "InsureGuard AI"),
        "버전": package.get("version", "1.0.4"),
        "위험점수": round(risk, 1),
        "위험등급": risk_level_from_score(risk),
        "법규위반_Top3_퍼센트": top3_pct,
        "사고경중_비율_퍼센트": severity_ratio,
    }
