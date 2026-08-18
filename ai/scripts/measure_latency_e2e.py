# -*- coding: utf-8 -*-
"""E2E latency: AI direct + Backend proxy (+ Frontend HTML ping)."""

from __future__ import annotations

import json
import statistics
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "docs" / "measure_latency_e2e.json"
OUT_MD = ROOT / "docs" / "measure_latency_e2e.md"

AI = "http://127.0.0.1:8000"
BE = "http://127.0.0.1:5000"
FE_CANDIDATES = ("http://localhost:5173", "http://127.0.0.1:5173", "http://[::1]:5173")

INS_BODY = {
    "구군": "달서구",
    "연령대": "51-60세",
    "성별": "남",
    "차종": "승용",
}
GOV_BODY = {"freq": "Q"}
GOV_HIST = {"지역": "수성구", "n_history": 4}


def pct(xs: list[float], p: float) -> float:
    s = sorted(xs)
    if not s:
        return float("nan")
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
        "min_ms": round(min(ms), 3),
        "max_ms": round(max(ms), 3),
    }


def http(
    url: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
    timeout: float = 60.0,
) -> tuple[int, float, int]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"} if data else {},
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read()
        code = resp.status
    return code, (time.perf_counter() - t0) * 1000.0, len(body)


def bench(
    label: str,
    url: str,
    *,
    method: str = "POST",
    payload: dict | None = None,
    warmup: int = 2,
    runs: int = 15,
) -> dict:
    print(f"  [{label}] {method} {url}")
    first_ms = None
    for i in range(warmup):
        code, ms, _ = http(url, method=method, payload=payload)
        if i == 0:
            first_ms = ms
        if code >= 400:
            raise RuntimeError(f"{label} HTTP {code}")
    samples: list[float] = []
    for _ in range(runs):
        code, ms, nbytes = http(url, method=method, payload=payload)
        if code >= 400:
            raise RuntimeError(f"{label} HTTP {code}")
        samples.append(ms)
    out = summarize(samples)
    out["first_after_or_incl_warmup_ms"] = round(first_ms or 0.0, 3)
    out["last_bytes"] = nbytes
    return out


def probe_fe() -> dict:
    for base in FE_CANDIDATES:
        try:
            code, ms, nbytes = http(base + "/", method="GET", timeout=5)
            return {"url": base, "status": code, "html_ms": round(ms, 3), "bytes": nbytes}
        except Exception as exc:
            last = str(exc)
    return {"available": False, "error": last}


def main() -> None:
    report: dict = {
        "stack": "Frontend(page) + Backend proxy + AI direct",
        "note": (
            "Prediction E2E that the browser uses is Backend→AI. "
            "Frontend row is HTML document fetch only (not XHR timing)."
        ),
    }

    # health
    for name, url in (("ai", f"{AI}/health"),):
        code, ms, _ = http(url, method="GET")
        report[f"health_{name}_ms"] = round(ms, 3)

    print("Measuring AI direct...")
    report["ai_direct"] = {
        "POST /predict (ins)": bench(
            "AI ins", f"{AI}/predict", payload=INS_BODY, warmup=3, runs=20
        ),
        "POST /predict/gov (all)": bench(
            "AI gov all", f"{AI}/predict/gov", payload=GOV_BODY, warmup=2, runs=12
        ),
        "POST /predict/gov/history": bench(
            "AI gov hist",
            f"{AI}/predict/gov/history",
            payload=GOV_HIST,
            warmup=2,
            runs=12,
        ),
    }

    print("Measuring Backend proxy (Frontend API base)...")
    report["backend_proxy"] = {
        "POST /api/prediction/predict-ins": bench(
            "BE ins",
            f"{BE}/api/prediction/predict-ins",
            payload=INS_BODY,
            warmup=3,
            runs=20,
        ),
        "POST /api/prediction/predict-gov": bench(
            "BE gov",
            f"{BE}/api/prediction/predict-gov",
            payload=GOV_BODY,
            warmup=2,
            runs=12,
        ),
        "POST /api/prediction/predict-gov-history": bench(
            "BE gov hist",
            f"{BE}/api/prediction/predict-gov-history",
            payload=GOV_HIST,
            warmup=2,
            runs=12,
        ),
    }

    # hotspots GET may be slow / external API — 3 runs only
    try:
        print("Measuring hotspots (may call KOROAD)...")
        report["backend_proxy"]["GET /api/prediction/predict-gov-hotspots"] = bench(
            "BE hotspots",
            f"{BE}/api/prediction/predict-gov-hotspots",
            method="GET",
            payload=None,
            warmup=1,
            runs=3,
        )
    except Exception as exc:
        report["backend_proxy"]["hotspots_error"] = str(exc)

    print("Probing Frontend...")
    report["frontend"] = probe_fe()

    # overhead: BE p50 - AI p50
    try:
        ins_ai = report["ai_direct"]["POST /predict (ins)"]["p50_ms"]
        ins_be = report["backend_proxy"]["POST /api/prediction/predict-ins"]["p50_ms"]
        gov_ai = report["ai_direct"]["POST /predict/gov (all)"]["p50_ms"]
        gov_be = report["backend_proxy"]["POST /api/prediction/predict-gov"]["p50_ms"]
        report["proxy_overhead_p50_ms"] = {
            "ins": round(ins_be - ins_ai, 3),
            "gov_all": round(gov_be - gov_ai, 3),
        }
    except Exception:
        pass

    OUT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    def row(name: str, s: dict) -> str:
        return (
            f"| {name} | {s['p50_ms']:.0f} | {s['p95_ms']:.0f} | "
            f"{s['mean_ms']:.0f} | {s.get('first_after_or_incl_warmup_ms', 0):.0f} |"
        )

    lines = [
        "# 예측 응답 시간 — 전체 스택 (E2E)",
        "",
        "AI 직접 호출 vs Backend 프록시(프론트가 쓰는 경로). Frontend는 HTML 로드만.",
        "",
        f"- AI: `{AI}`",
        f"- Backend: `{BE}`",
        f"- Frontend: `{report['frontend']}`",
        "",
        "## 요약 표 (ms)",
        "",
        "| 경로 | p50 | p95 | mean | first(warmup 포함) |",
        "|------|-----|-----|------|-------------------|",
    ]
    for k, v in report["ai_direct"].items():
        lines.append(row(f"AI `{k}`", v))
    for k, v in report["backend_proxy"].items():
        if isinstance(v, dict) and "p50_ms" in v:
            lines.append(row(f"BE `{k}`", v))
    if report.get("proxy_overhead_p50_ms"):
        o = report["proxy_overhead_p50_ms"]
        lines += [
            "",
            "## Backend 오버헤드 (p50 BE − p50 AI)",
            "",
            f"- Ins: **{o.get('ins')} ms**",
            f"- Gov 전체: **{o.get('gov_all')} ms**",
            "",
        ]
    lines += [
        "## 해석",
        "",
        "- 프론트 대시보드의 예측 XHR 지연 ≈ **Backend 프록시** 행.",
        "- Backend 오버헤드가 작으면 Express 중계 비용은 무시할 수준.",
        "- 첫 요청은 콜드/연결 때문에 더 길 수 있음.",
        "",
        "재측정: `python scripts/measure_latency_e2e.py`",
        "",
    ]
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\nWrote {OUT_JSON}")
    print(f"Wrote {OUT_MD}")


if __name__ == "__main__":
    main()
