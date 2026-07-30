"""추론 — traffic_accident_model.pkl (구 best_risk_* 대체)."""

from __future__ import annotations

import argparse
import json
import pickle
from functools import lru_cache
from typing import Any

import numpy as np

from src import MODEL_DIR

MODEL_PATH = MODEL_DIR / "traffic_accident_model.pkl"


@lru_cache(maxsize=1)
def load_model() -> dict[str, Any]:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"모델 파일이 없습니다: {MODEL_PATH}")
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def risk_level_from_score(score: float) -> str:
    if score >= 75:
        return "CRITICAL"
    if score >= 40:
        return "HIGH"
    if score >= 20:
        return "MODERATE"
    return "LOW"


def predict_from_input(
    구군: str,
    연령대: str,
    성별: str,
    차종: str,
    주야: str = "주간",
    노면상태: str = "건조",
    **_ignored: Any,
) -> dict:
    """구군은 모델의 '지역'으로 매핑. variant는 무시."""
    package = load_model()
    data_input = {
        "가해운전자 연령대": 연령대,
        "가해운전자 성별": 성별,
        "가해운전자 차종": 차종,
        "지역": 구군,
        "주야": 주야,
        "노면상태": 노면상태,
    }

    encoders = package["label_encoders"]
    encoded: list[float] = []
    for col in package["features"]:
        val = data_input[col]
        le = encoders[col]
        if val not in le.classes_:
            val = str(le.classes_[0])
        encoded.append(float(le.transform([val])[0]))
    input_arr = np.array([encoded])

    risk = float(package["regressor"].predict(input_arr)[0])
    risk = max(0.0, min(100.0, risk))

    violation_encoder = encoders["법규위반"]
    probs = package["classifier"].predict_proba(input_arr)[0]
    ranked = sorted(
        zip(violation_encoder.classes_, probs),
        key=lambda x: x[1],
        reverse=True,
    )
    top3 = {
        str(name): round(float(p), 4) for name, p in ranked[:3]
    }
    # FE 호환: 등급확률 자리에 Top3 확률, 예측등급에 CRITICAL 등
    return {
        "버전": "traffic_accident_model",
        "variant": "default",
        "예측등급": risk_level_from_score(risk),
        "위험도": round(risk, 1),
        "등급확률": top3,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--구군", default="달서구")
    parser.add_argument("--연령대", default="51-60세")
    parser.add_argument("--성별", default="남")
    parser.add_argument("--차종", default="승용")
    parser.add_argument("--주야", default="주간")
    parser.add_argument("--노면상태", default="건조")
    args = parser.parse_args()
    print(json.dumps(predict_from_input(**vars(args)), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()