"""ins_model_v1.0.4.pkl 로컬 스모크."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.ins_inference import predict_from_input


def main() -> None:
    result = predict_from_input(
        구군="북구",
        연령대="21-30세",
        성별="남",
        차종="승용",
    )
    print("=====================================")
    print(f"AI 분석 결과 ({result['예측등급']})")
    print("=====================================")
    print(f"모델: {result['버전']} / {result['variant']}")
    print(f"위험 점수: {result['위험도']} / 100")
    print("-------------------------------------")
    print("법규위반 Top3:")
    for i, (cause, prob) in enumerate(result["등급확률"].items(), 1):
        print(f" {i}. {cause} : {prob * 100:.1f}%")
    print("-------------------------------------")
    print("사고경중 비율:")
    for name, prob in result["사고경중비율"].items():
        print(f" - {name}: {prob * 100:.1f}%")
    print("=====================================")


if __name__ == "__main__":
    main()
