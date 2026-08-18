"""Test set 성능·Latency·메모리 측정 후 JSON 결과 출력."""

from __future__ import annotations

import json
import pickle
import platform
import sys
import time
import tracemalloc
from pathlib import Path

import numpy as np
import pandas as pd
import psutil
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    f1_score,
)
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[2]  # scripts/archive -> ai
sys.path.insert(0, str(ROOT))

from src.ins_inference import predict_risk_score  # noqa: E402
from src.preprocess import FEATURE_COLS, TARGET_COL, prepare_training_data  # noqa: E402

MODEL_DIR = ROOT / "models"
VARIANTS = {
    "unweighted": MODEL_DIR / "best_risk_model_unweighted.pkl",
    "weighted": MODEL_DIR / "best_risk_model_weighted.pkl",
}


def process_rss_mb() -> float:
    return psutil.Process().memory_info().rss / (1024 * 1024)


def measure_latency(model, X: pd.DataFrame, n_warmup: int = 20, n_runs: int = 200) -> dict:
    sample = X.head(1)
    for _ in range(n_warmup):
        _ = predict_risk_score(model, sample)

    latencies: list[float] = []
    for _ in range(n_runs):
        t0 = time.perf_counter()
        _ = predict_risk_score(model, sample)
        latencies.append((time.perf_counter() - t0) * 1000)

    arr = np.asarray(latencies)
    return {
        "n_warmup": n_warmup,
        "n_runs": n_runs,
        "mean_ms": round(float(arr.mean()), 4),
        "std_ms": round(float(arr.std()), 4),
        "p50_ms": round(float(np.percentile(arr, 50)), 4),
        "p95_ms": round(float(np.percentile(arr, 95)), 4),
        "p99_ms": round(float(np.percentile(arr, 99)), 4),
        "min_ms": round(float(arr.min()), 4),
        "max_ms": round(float(arr.max()), 4),
    }


def measure_memory(model_path: Path, sample: pd.DataFrame) -> dict:
    """모델 로드·1회 추론 전후 RSS / tracemalloc 측정."""
    rss_before = process_rss_mb()
    tracemalloc.start()

    with open(model_path, "rb") as f:
        model = pickle.load(f)
    rss_after_load = process_rss_mb()
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    _ = predict_risk_score(model, sample)
    rss_after_infer = process_rss_mb()

    return {
        "model_file_mb": round(model_path.stat().st_size / (1024 * 1024), 4),
        "rss_before_load_mb": round(rss_before, 2),
        "rss_after_load_mb": round(rss_after_load, 2),
        "rss_delta_load_mb": round(rss_after_load - rss_before, 2),
        "rss_after_infer_mb": round(rss_after_infer, 2),
        "tracemalloc_peak_mb": round(peak / (1024 * 1024), 4),
        "gpu_vram": "N/A (CPU-only sklearn model)",
    }, model


def evaluate(model, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    pred = model.predict(X_test)
    report = classification_report(y_test, pred, digits=4, output_dict=True)
    return {
        "accuracy": round(float(accuracy_score(y_test, pred)), 6),
        "balanced_accuracy": round(float(balanced_accuracy_score(y_test, pred)), 6),
        "macro_f1": round(float(f1_score(y_test, pred, average="macro")), 6),
        "weighted_f1": round(float(f1_score(y_test, pred, average="weighted")), 6),
        "per_class": {
            k: {
                "precision": round(v["precision"], 4),
                "recall": round(v["recall"], 4),
                "f1-score": round(v["f1-score"], 4),
                "support": int(v["support"]),
            }
            for k, v in report.items()
            if isinstance(v, dict) and "precision" in v and k not in {"macro avg", "weighted avg"}
        },
        "n_test": int(len(y_test)),
    }


def main() -> None:
    data = prepare_training_data()
    X = data[FEATURE_COLS]
    y = data[TARGET_COL]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    results = {
        "environment": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "cpu_count": psutil.cpu_count(logical=True),
            "total_ram_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "sklearn": __import__("sklearn").__version__,
            "numpy": np.__version__,
            "pandas": pd.__version__,
        },
        "dataset": {
            "n_total": int(len(data)),
            "n_train": int(len(X_train)),
            "n_test": int(len(X_test)),
            "test_size": 0.2,
            "random_state": 42,
            "feature_cols": FEATURE_COLS,
            "target_col": TARGET_COL,
            "class_distribution_test": {
                str(k): int(v) for k, v in y_test.value_counts().items()
            },
        },
        "variants": {},
    }

    sample = X_test.head(1)
    for name, path in VARIANTS.items():
        if not path.exists():
            raise FileNotFoundError(path)

        mem, model = measure_memory(path, sample)
        metrics = evaluate(model, X_test, y_test)
        latency = measure_latency(model, X_test)

        clf = model.named_steps["clf"]
        results["variants"][name] = {
            "model_path": str(path.name),
            "estimator": type(clf).__name__,
            "metrics": metrics,
            "latency": latency,
            "memory": mem,
        }

    out = ROOT / "docs" / "archive" / "ins_train_weighted_results.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))
    print(f"\nSaved: {out}")


if __name__ == "__main__":
    main()
