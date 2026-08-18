"""모델 학습 스크립트."""

from __future__ import annotations

import json
import pickle

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingClassifier,
    HistGradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.utils.class_weight import compute_sample_weight

from src import MODEL_DIR
from src.evaluate import evaluate_classifier, measure_inference_latency, print_evaluation
from src.inference import predict_risk_score, VARIANTS
from src.preprocess import FEATURE_COLS, prepare_training_data, TARGET_COL


def make_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                FEATURE_COLS,
            )
        ]
    )


def build_models(*, balanced: bool) -> dict[str, Pipeline]:
    """balanced=True면 LR/RF에 class_weight 적용 (샘플 가중치 버전용)."""
    lr_kw = {"max_iter": 2000, "random_state": 42}
    rf_kw = {"n_estimators": 200, "max_depth": 16, "random_state": 42, "n_jobs": -1}
    if balanced:
        lr_kw["class_weight"] = "balanced"
        rf_kw["class_weight"] = "balanced_subsample"

    return {
        "LogisticRegression": Pipeline(
            [("pre", make_preprocessor()), ("clf", LogisticRegression(**lr_kw))]
        ),
        "RandomForest": Pipeline(
            [("pre", make_preprocessor()), ("clf", RandomForestClassifier(**rf_kw))]
        ),
        "HistGradientBoosting": Pipeline(
            [
                ("pre", make_preprocessor()),
                (
                    "clf",
                    HistGradientBoostingClassifier(
                        max_depth=8,
                        learning_rate=0.08,
                        max_iter=200,
                        random_state=42,
                    ),
                ),
            ]
        ),
        "GradientBoosting": Pipeline(
            [
                ("pre", make_preprocessor()),
                (
                    "clf",
                    GradientBoostingClassifier(
                        n_estimators=150,
                        max_depth=4,
                        learning_rate=0.08,
                        random_state=42,
                    ),
                ),
            ]
        ),
    }


def train_variant(
    variant: str,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
) -> dict:
    """한 버전(unweighted/weighted)을 학습·저장 후 메타를 반환합니다."""
    use_weight = variant == "weighted"
    info = VARIANTS[variant]
    print("=" * 60)
    print(f"[{info['label']}] 학습 시작")
    print("=" * 60)

    models = build_models(balanced=use_weight)
    sample_weight = (
        compute_sample_weight("balanced", y_train) if use_weight else None
    )

    results = []
    fitted = {}

    for name, pipe in models.items():
        print(f"학습 중: {name} ...")
        if use_weight and name in {
            "HistGradientBoosting",
            "GradientBoosting",
            "RandomForest",
        }:
            pipe.fit(X_train, y_train, clf__sample_weight=sample_weight)
        else:
            pipe.fit(X_train, y_train)

        metrics = evaluate_classifier(pipe, X_test, y_test)
        latency = measure_inference_latency(pipe, X_test)
        results.append(
            {
                "model": name,
                "accuracy": metrics["accuracy"],
                "balanced_accuracy": metrics["balanced_accuracy"],
                "macro_f1": metrics["macro_f1"],
                "latency_mean_ms": latency["mean_ms"],
            }
        )
        fitted[name] = pipe
        print_evaluation(name, metrics, latency)

    result_df = pd.DataFrame(results).sort_values("accuracy", ascending=False)
    best_name = result_df.iloc[0]["model"]
    best_model = fitted[best_name]

    print("-" * 60)
    print(f"[{info['label']}] 모델 비교 (accuracy 내림차순)")
    print(result_df.to_string(index=False))
    print(f"선정 모델: {best_name}")
    best_metrics = evaluate_classifier(best_model, X_test, y_test)
    print(best_metrics["classification_report"])

    sample = X_test.head(5).copy()
    sample["예측등급"] = best_model.predict(sample[FEATURE_COLS])
    sample["위험도"] = predict_risk_score(best_model, sample[FEATURE_COLS]).round(1)
    print("[테스트 샘플 위험도]")
    print(sample.to_string(index=False))

    MODEL_DIR.mkdir(exist_ok=True)
    with open(info["model"], "wb") as f:
        pickle.dump(best_model, f, protocol=pickle.HIGHEST_PROTOCOL)

    from src.preprocess import RISK_SCORE

    meta = {
        "variant": variant,
        "label": info["label"],
        "use_sample_weight": use_weight,
        "best_model": best_name,
        "feature_cols": FEATURE_COLS,
        "risk_score_map": RISK_SCORE,
        "comparison": result_df.to_dict(orient="records"),
        "test_accuracy": float(result_df.iloc[0]["accuracy"]),
        "test_balanced_accuracy": float(result_df.iloc[0]["balanced_accuracy"]),
        "test_macro_f1": float(result_df.iloc[0]["macro_f1"]),
        "note": "위험도 = Σ(등급확률 × 점수). 부상신고20 / 경상40 / 중상75 / 사망100",
    }
    info["meta"].write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"모델 저장: {info['model']}")
    print(f"메타 저장: {info['meta']}\n")
    return meta


def main() -> None:
    data = prepare_training_data()
    X = data[FEATURE_COLS]
    y = data[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"학습 데이터: {len(X_train):,} / 테스트: {len(X_test):,}")
    print(f"특징: {FEATURE_COLS}\n")

    summaries = []
    for variant in ("unweighted", "weighted"):
        meta = train_variant(variant, X_train, X_test, y_train, y_test)
        summaries.append(
            {
                "variant": variant,
                "label": meta["label"],
                "best_model": meta["best_model"],
                "accuracy": meta["test_accuracy"],
                "balanced_accuracy": meta["test_balanced_accuracy"],
                "macro_f1": meta["test_macro_f1"],
            }
        )

    print("=" * 60)
    print("두 버전 요약")
    print(pd.DataFrame(summaries).to_string(index=False))


if __name__ == "__main__":
    main()
