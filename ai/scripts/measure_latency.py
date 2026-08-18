# -*- coding: utf-8 -*-
"""Measure Ins / Gov prediction latency (in-process + optional HTTP)."""

from __future__ import annotations

import json
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

OUT = ROOT / "docs" / "measure_latency.json"

N_WARMUP = 5
N_RUNS = 50


def pct(xs: list[float], p: float) -> float:
    if not xs:
        return float("nan")
    s = sorted(xs)
    k = (len(s) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(s) - 1)
    if f == c:
        return s[f]
    return s[f] + (s[c] - s[f]) * (k - f)


def summarize(ms: list[float]) -> dict:
    return {
        "n": len(ms),
        "mean_ms": round(statistics.mean(ms), 3),
        "stdev_ms": round(statistics.stdev(ms), 3) if len(ms) > 1 else 0.0,
        "p50_ms": round(pct(ms, 50), 3),
        "p95_ms": round(pct(ms, 95), 3),
        "p99_ms": round(pct(ms, 99), 3),
        "min_ms": round(min(ms), 3),
        "max_ms": round(max(ms), 3),
    }


def bench(fn, *, warmup: int, runs: int) -> list[float]:
    for _ in range(warmup):
        fn()
    out: list[float] = []
    for _ in range(runs):
        t0 = time.perf_counter()
        fn()
        out.append((time.perf_counter() - t0) * 1000.0)
    return out


def main() -> None:
    report: dict = {
        "note": "In-process Python latency (pkl already in memory after cold load). Not browser→Express E2E.",
        "warmup": N_WARMUP,
        "runs": N_RUNS,
    }

    # --- Ins cold load ---
    t0 = time.perf_counter()
    from src.ins_inference import load_model, predict_from_input

    _ = load_model()
    report["ins_cold_load_ms"] = round((time.perf_counter() - t0) * 1000.0, 3)

    def ins_once():
        return predict_from_input(
            구군="달서구",
            연령대="51-60세",
            성별="남",
            차종="승용",
        )

    ins_ms = bench(ins_once, warmup=N_WARMUP, runs=N_RUNS)
    report["ins_predict_single"] = summarize(ins_ms)
    sample = ins_once()
    report["ins_sample_risk"] = sample.get("위험도")
    report["ins_sample_grade"] = sample.get("예측등급")

    # --- Gov cold load ---
    t0 = time.perf_counter()
    from src.gov_inference import predict_gov_rates, predict_gov_history

    # force load via one call
    _ = predict_gov_rates(지역="수성구", freq="Q")
    report["gov_first_call_includes_load_ms"] = None  # measured separately below

    # re-measure coldish: already warm; report all-district warm latency
    def gov_one():
        return predict_gov_rates(지역="수성구", freq="Q")

    def gov_all():
        return predict_gov_rates(지역=None, freq="Q")

    def gov_hist():
        return predict_gov_history(지역="수성구", n_history=4)

    # dedicated cold for gov: re-import in subprocess would be heavy; measure warm only + one timed first already done
    t0 = time.perf_counter()
    _ = predict_gov_rates(지역=None, freq="Q")
    # first all-district after one-region may still be warm package
    report["gov_all_districts_one_shot_ms"] = round((time.perf_counter() - t0) * 1000.0, 3)

    gov_one_ms = bench(gov_one, warmup=N_WARMUP, runs=N_RUNS)
    gov_all_ms = bench(gov_all, warmup=3, runs=20)
    gov_hist_ms = bench(gov_hist, warmup=3, runs=20)

    report["gov_predict_one_region"] = summarize(gov_one_ms)
    report["gov_predict_all_regions"] = summarize(gov_all_ms)
    report["gov_history_n4"] = summarize(gov_hist_ms)

    # optional HTTP if server up
    try:
        import urllib.request

        def http_json(url: str, payload: dict | None = None, method: str = "POST") -> tuple[int, float]:
            data = None if payload is None else json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={"Content-Type": "application/json"} if data else {},
                method=method,
            )
            t1 = time.perf_counter()
            with urllib.request.urlopen(req, timeout=30) as resp:
                _ = resp.read()
                code = resp.status
            return code, (time.perf_counter() - t1) * 1000.0

        # health
        try:
            code, ms = http_json("http://127.0.0.1:8000/health", method="GET")
            http_ok = code == 200
        except Exception as exc:
            http_ok = False
            report["http"] = {"available": False, "error": str(exc)}

        if http_ok:
            # cold-ish first
            _, first_ins = http_json(
                "http://127.0.0.1:8000/predict",
                {"구군": "달서구", "연령대": "51-60세", "성별": "남", "차종": "승용"},
            )
            ins_http: list[float] = []
            for _ in range(20):
                _, ms = http_json(
                    "http://127.0.0.1:8000/predict",
                    {"구군": "달서구", "연령대": "51-60세", "성별": "남", "차종": "승용"},
                )
                ins_http.append(ms)

            _, first_gov = http_json(
                "http://127.0.0.1:8000/predict/gov",
                {"freq": "Q"},
            )
            gov_http: list[float] = []
            for _ in range(10):
                _, ms = http_json(
                    "http://127.0.0.1:8000/predict/gov",
                    {"freq": "Q"},
                )
                gov_http.append(ms)

            # backend proxy if up
            be = {}
            try:
                _, ms = http_json(
                    "http://127.0.0.1:5000/api/prediction/predict-ins",
                    {"구군": "달서구", "연령대": "51-60세", "성별": "남", "차종": "승용"},
                )
                be_ins = [ms]
                for _ in range(10):
                    _, ms = http_json(
                        "http://127.0.0.1:5000/api/prediction/predict-ins",
                        {"구군": "달서구", "연령대": "51-60세", "성별": "남", "차종": "승용"},
                    )
                    be_ins.append(ms)
                be["predict_ins"] = summarize(be_ins)
            except Exception as exc:
                be["predict_ins_error"] = str(exc)

            report["http"] = {
                "available": True,
                "ins_first_ms": round(first_ins, 3),
                "ins_predict": summarize(ins_http),
                "gov_all_first_ms": round(first_gov, 3),
                "gov_predict_all": summarize(gov_http),
                "backend_proxy": be,
            }
    except Exception as exc:
        report["http"] = {"available": False, "error": str(exc)}

    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\nWrote {OUT}")


if __name__ == "__main__":
    main()
