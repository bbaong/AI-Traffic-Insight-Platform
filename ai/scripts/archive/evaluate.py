"""성능 평가 모듈 (Accuracy, Latency 측정)."""

from __future__ import annotations

import time
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    f1_score,
)
from sklearn.pipeline import Pipeline

from src.ins_inference import predict_risk_score


def evaluate_classifier(
    model: Pipeline,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> dict[str, Any]:
    """분류 모델의 정확도·F1 등을 측정합니다."""
    pred = model.predict(X_test)
    return {
        "accuracy": accuracy_score(y_test, pred),
        "balanced_accuracy": balanced_accuracy_score(y_test, pred),
        "macro_f1": f1_score(y_test, pred, average="macro"),
        "classification_report": classification_report(y_test, pred, digits=4),
        "predictions": pred,
    }


def measure_inference_latency(
    model: Pipeline,
    X: pd.DataFrame,
    n_warmup: int = 10,
    n_runs: int = 100,
) -> dict[str, float]:
    """단건 추론 지연 시간(ms)을 측정합니다."""
    sample = X.head(1)

    for _ in range(n_warmup):
        model.predict(sample)
        predict_risk_score(model, sample)

    latencies: list[float] = []
    for _ in range(n_runs):
        start = time.perf_counter()
        predict_risk_score(model, sample)
        latencies.append((time.perf_counter() - start) * 1000)

    arr = np.array(latencies)
    return {
        "mean_ms": float(arr.mean()),
        "p50_ms": float(np.percentile(arr, 50)),
        "p95_ms": float(np.percentile(arr, 95)),
        "p99_ms": float(np.percentile(arr, 99)),
        "n_runs": n_runs,
    }


def print_evaluation(
    model_name: str,
    metrics: dict[str, Any],
    latency: dict[str, float] | None = None,
) -> None:
    """평가 결과를 콘솔에 출력합니다."""
    print(f"  accuracy={metrics['accuracy']:.4f}  "
          f"balanced_acc={metrics['balanced_accuracy']:.4f}  "
          f"macro_f1={metrics['macro_f1']:.4f}")
    if latency:
        print(
            f"  latency: mean={latency['mean_ms']:.2f}ms  "
            f"p95={latency['p95_ms']:.2f}ms"
        )
