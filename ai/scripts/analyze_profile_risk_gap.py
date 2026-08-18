# -*- coding: utf-8 -*-
"""수성구 vs 군위군 동일 프로파일 위험점수 분해 (일회성 분석)."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT))

import ins_v1_0_4 as ins  # noqa: E402
from src.inference import predict_from_input  # noqa: E402

PROFILES = [
    ("수성구", "남|51-60세|승용|수성구"),
    ("군위군", "남|51-60세|승용|군위군"),
]


def main() -> None:
    df = ins.load_and_clean()
    df = ins.compute_risk_target(df)
    uniq = df.drop_duplicates("_profile")

    print("=== 프로파일 분해 (학습 타깃) ===")
    rows = []
    for name, pk in PROFILES:
        g = df[df["_profile"] == pk]
        row = g.iloc[0]
        sev_rate = g["중대사고"].mean() * 100
        target = float(row["위험점수"])
        pct_below = (uniq["위험점수"] < target).mean() * 100
        rows.append(
            {
                "name": name,
                "n": int(row.profile_n),
                "sev_rate": sev_rate,
                "severity_score": float(row.severity_score),
                "freq_score": float(row.freq_score),
                "target": target,
            }
        )
        print(f"\n[{name}] n={int(row.profile_n)}  raw중대율={sev_rate:.1f}%")
        print(
            f"  smooth_epdo={row.smooth_epdo:.2f}  "
            f"smooth_severe={row.smooth_severe_rate * 100:.1f}%"
        )
        print(
            f"  severity_score={row.severity_score:.1f}  "
            f"freq_score={row.freq_score:.1f}"
        )
        print(
            f"  target={target:.1f} = "
            f"{(1 - ins.FREQ_BLEND) * row.severity_score:.1f} + "
            f"{ins.FREQ_BLEND * row.freq_score:.1f}"
        )
        print(
            f"  순위: {len(uniq)} 프로파일 중 상위 {100 - pct_below:.1f}%"
        )

    a, b = rows[0], rows[1]
    print("\n=== 차이 요약 ===")
    print(f"위험점수 Δ = {b['target'] - a['target']:.1f}")
    print(f"  심각도순위 Δ = {b['severity_score'] - a['severity_score']:.1f}")
    print(f"  빈도순위 Δ = {b['freq_score'] - a['freq_score']:.1f}")
    print(f"  raw 중대율 Δ = {b['sev_rate'] - a['sev_rate']:.1f}%p")
    print(f"  건수 Δ = {b['n'] - a['n']}")

    print("\n=== pkl 추론 ===")
    for region in ["수성구", "군위군"]:
        r = predict_from_input(
            구군=region, 연령대="51-60세", 성별="남", 차종="승용"
        )
        print(f"\n[{region}] 위험도={r['위험도']} {r['예측등급']}")
        print("  법규 TOP3:", r["등급확률"])
        sev = {k: round(v * 100, 1) for k, v in r["사고경중비율"].items()}
        print("  경중%:", sev)

    print("\n=== 법규위반별 중대율 (실적, n>=3) ===")
    for name, pk in PROFILES:
        g = df[df["_profile"] == pk]
        v = (
            g.groupby("법규위반")
            .agg(n=("중대사고", "size"), sev=("중대사고", "mean"))
            .reset_index()
        )
        v = v[v["n"] >= 3].sort_values("sev", ascending=False)
        print(f"\n[{name}]")
        for _, r in v.head(8).iterrows():
            print(f"  {r['법규위반']}: n={int(r['n'])} 중대율={r['sev'] * 100:.1f}%")


if __name__ == "__main__":
    main()
