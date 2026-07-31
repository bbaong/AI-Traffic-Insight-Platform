"""traffic_accident_model.pkl 로컬 검증용 (0단계)."""
from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np

MODEL_PATH = Path(__file__).resolve().parent / "models" / "traffic_accident_model.pkl"

# 학습에 있는 문자열만 사용 (노면: '젖음/습기' — 가이드의 '젖음/습윤'은 오타)
new_customer_data = {
    "가해운전자 연령대": "21-30세",
    "가해운전자 성별": "남",
    "가해운전자 차종": "승용",
    "지역": "북구",
    "주야": "야간",
    "노면상태": "젖음/습기",
}


def predict_accident_risk(data_input: dict, package: dict):
    reg = package["regressor"]
    clf = package["classifier"]
    encoders = package["label_encoders"]
    feature_names = package["features"]

    encoded_input = []
    for col in feature_names:
        val = data_input[col]
        le = encoders[col]
        if val not in le.classes_:
            print(
                f"[Warning] '{col}'의 '{val}'은 학습 라벨이 아님 → '{le.classes_[0]}' 사용"
            )
            encoded_val = le.transform([le.classes_[0]])[0]
        else:
            encoded_val = le.transform([val])[0]
        encoded_input.append(encoded_val)

    input_arr = np.array([encoded_input])
    risk_score = float(reg.predict(input_arr)[0])

    violation_encoder = encoders["법규위반"]
    clf_probs = clf.predict_proba(input_arr)[0]
    probs_with_labels = sorted(
        zip(violation_encoder.classes_, clf_probs),
        key=lambda x: x[1],
        reverse=True,
    )
    top3_causes = probs_with_labels[:3]
    return risk_score, top3_causes


def main() -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"모델 없음: {MODEL_PATH}")

    with open(MODEL_PATH, "rb") as f:
        model_package = pickle.load(f)

    print("로드 OK:", MODEL_PATH)
    print("features:", model_package["features"])

    risk, top3 = predict_accident_risk(new_customer_data, model_package)
    risk_level = "High" if risk >= 70 else ("Medium" if risk >= 40 else "Low")

    print("=====================================")
    print(f"AI 분석 결과 요약 ({risk_level})")
    print("=====================================")
    print(f"위험 점수: {risk:.1f} / 100")
    print("-------------------------------------")
    print("주요 사고 유형 비율 Top 3:")
    for i, (cause, prob) in enumerate(top3, 1):
        print(f" {i}. {cause} : {prob * 100:.1f}%")
    print("=====================================")


if __name__ == "__main__":
    main()