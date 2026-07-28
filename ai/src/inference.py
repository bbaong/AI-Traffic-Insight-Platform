"""추론(Inference) 로직."""

from __future__ import annotations

import argparse
import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline

from src import MODEL_DIR
from src.preprocess import FEATURE_COLS, RISK_SCORE

VARIANTS = {
    "unweighted": {
        "model": MODEL_DIR / "best_risk_model_unweighted.pkl",
        "meta": MODEL_DIR / "best_risk_model_unweighted_meta.json",
        "label": "샘플가중치 없음",
    },
    "weighted": {
        "model": MODEL_DIR / "best_risk_model_weighted.pkl",
        "meta": MODEL_DIR / "best_risk_model_weighted_meta.json",
        "label": "샘플가중치 적용",
    },
}


def predict_risk_score(model: Pipeline, X: pd.DataFrame) -> np.ndarray:
    """등급 확률 × 위험점수로 0~100 위험도를 산출합니다."""
    proba = model.predict_proba(X)
    classes = list(model.named_steps["clf"].classes_)
    weights = np.array([RISK_SCORE[c] for c in classes])
    return proba @ weights


def load_model(variant: str = "weighted") -> Pipeline:
    """저장된 모델을 로드합니다."""
    if variant not in VARIANTS:
        raise ValueError(f"variant는 {list(VARIANTS)} 중 하나여야 합니다.")
    model_path = VARIANTS[variant]["model"]
    if not model_path.exists():
        raise FileNotFoundError(f"모델 파일이 없습니다: {model_path}")
    with open(model_path, "rb") as f:
        return pickle.load(f)


def predict_from_input(
    구군: str,
    연령대: str,
    성별: str,
    차종: str,
    주야: str = "주간",
    variant: str = "weighted",
) -> dict:
    """저장된 모델로 위험도(100점)를 예측합니다."""
    model = load_model(variant)
    row = pd.DataFrame(
        [
            {
                "구군": 구군,
                "가해운전자 연령대": 연령대,
                "가해운전자 성별": 성별,
                "가해운전자 차종": 차종,
                "주야": 주야,
            }
        ]
    )
    grade = model.predict(row)[0]
    score = float(predict_risk_score(model, row)[0])
    proba = dict(zip(model.named_steps["clf"].classes_, model.predict_proba(row)[0]))
    return {
        "버전": VARIANTS[variant]["label"],
        "variant": variant,
        "예측등급": grade,
        "위험도": round(score, 1),
        "등급확률": {k: round(float(v), 4) for k, v in proba.items()},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="교통사고 위험도(100점) 예측")
    parser.add_argument("--구군", default="달서구")
    parser.add_argument("--연령대", default="51-60세")
    parser.add_argument("--성별", default="남")
    parser.add_argument("--차종", default="승용")
    parser.add_argument("--주야", default="주간")
    parser.add_argument(
        "--variant",
        choices=["unweighted", "weighted", "both"],
        default="both",
        help="unweighted=가중치없음, weighted=가중치적용, both=둘 다",
    )
    args = parser.parse_args()

    variants = (
        ["unweighted", "weighted"] if args.variant == "both" else [args.variant]
    )
    results = [
        predict_from_input(
            구군=args.구군,
            연령대=args.연령대,
            성별=args.성별,
            차종=args.차종,
            주야=args.주야,
            variant=v,
        )
        for v in variants
    ]
    print(
        json.dumps(
            results if len(results) > 1 else results[0],
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
