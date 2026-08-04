> ⚠️ **보관 문서** — 레거시 `traffic_accident_model.pkl` / `new_model` 기준입니다. 현재 서빙 모델과 무관합니다.  
> 설치·추론: [../README.md](../README.md) · 문서 목차: [README.md](README.md)

# traffic_accident_model.pkl 테스트 및 사용 가이드

본 문서는 `new_model.py`를 통해 생성된 학습 모델 패키지 파일(`traffic_accident_model.pkl`)을 로드하여 실제 개발 환경이나 테스트 환경에서 활용하는 방법을 설명합니다.

---

## 1. 모델 패키지 구조 (.pkl)

`traffic_accident_model.pkl` 파일은 Python의 `pickle` 모듈을 사용해 바이너리로 저장되어 있습니다. 저장된 딕셔너리의 내부 구조는 다음과 같습니다:

```python
{
    'regressor': RandomForestRegressor,       # 위험 점수(0~100점) 예측 모델
    'classifier': RandomForestClassifier,     # 주 사고 원인(법규위반) 분류 모델
    'label_encoders': {                       # 각 피처 컬럼별 LabelEncoder 딕셔너리
        '가해운전자 연령대': LabelEncoder,
        '가해운전자 성별': LabelEncoder,
        '가해운전자 차종': LabelEncoder,
        '지역': LabelEncoder,
        '주야': LabelEncoder,
        '노면상태': LabelEncoder,
        '법규위반': LabelEncoder
    },
    'features': ['가해운전자 연령대', '가해운전자 성별', '가해운전자 차종', '지역', '주야', '노면상태'] # 입력 피처 순서 리스트
}
```

---

## 2. 모델 사용법 및 코드 예시

다음 코드는 피클 파일을 불러와 새로운 입력 데이터에 대해 **위험 점수**와 **주요 사고 원인 Top 3**를 예측하는 핵심 파이썬 스크립트입니다.

### 💻 실행 및 연동 코드
```python
import pickle
import numpy as np

# 1. 모델 패키지 로드
with open('traffic_accident_model.pkl', 'rb') as f:
    model_package = pickle.load(f)

# 2. 예측에 사용할 신규 입력 데이터 정의
# (주의: 학습에 정의된 문자열 형태를 그대로 지정해야 인코더가 올바르게 작동합니다.)
new_customer_data = {
    '가해운전자 연령대': '21-30세',
    '가해운전자 성별': '남',
    '가해운전자 차종': '승용',
    '지역': '북구',
    '주야': '야간',
    '노면상태': '젖음/습윤'
}

def predict_accident_risk(data_input, package):
    reg = package['regressor']
    clf = package['classifier']
    encoders = package['label_encoders']
    feature_names = package['features']
    
    # 입력 범주형 데이터를 학습 데이터 기준의 수치로 인코딩 변환
    encoded_input = []
    for col in feature_names:
        val = data_input[col]
        le = encoders[col]
        
        # 학습에 없던 신규 카테고리가 입력된 경우의 예외 처리
        if val not in le.classes_:
            print(f"[Warning] '{col}' 피처의 '{val}' 값은 학습되지 않은 라벨입니다. 기본값으로 변환합니다.")
            encoded_val = le.transform([le.classes_[0]])[0]
        else:
            encoded_val = le.transform([val])[0]
            
        encoded_input.append(encoded_val)
        
    # 2D Array 형태로 입력값 가공
    input_arr = np.array([encoded_input])
    
    # [1] 위험도 점수 예측 (Regressor)
    risk_score = reg.predict(input_arr)[0]
    
    # [2] 주요 사고 요인 Top 3 확률 도출 (Classifier)
    violation_encoder = encoders['법규위반']
    clf_probs = clf.predict_proba(input_arr)[0]
    
    # 클래스 라벨과 해당 확률 매핑 후 내림차순 정렬
    probs_with_labels = sorted(
        zip(violation_encoder.classes_, clf_probs), 
        key=lambda x: x[1], 
        reverse=True
    )
    
    # Top 3 추출
    top3_causes = probs_with_labels[:3]
    
    return risk_score, top3_causes

# 3. 예측 수행
risk, top3 = predict_accident_risk(new_customer_data, model_package)

# 4. 결과 출력
risk_level = "High" if risk >= 70 else ("Medium" if risk >= 40 else "Low")
print(f"=====================================")
print(f"🚘 AI 분석 결과 요약 ({risk_level})")
print(f"=====================================")
print(f"위험 점수: {risk:.1f} / 100")
print(f"-------------------------------------")
print(f"주요 사고 유형 비율 Top 3:")
for i, (cause, prob) in enumerate(top3, 1):
    print(f" {i}. {cause} : {prob * 100:.1f}%")
print(f"=====================================")
```

---

## 3. 테스트(검증) 방법

로컬에서 모델이 정상 가동하는지 빠르고 쉽게 검증하기 위해 CLI(Command Line Interface) 환경에서 임시 테스트 스크립트를 작성하여 구동할 수 있습니다.

1. 위의 코드를 복사하여 `test_model.py` 파일로 저장합니다.
2. 터미널/PowerShell 창에서 아래 명령어를 실행하여 올바른 예측값이 출력되는지 테스트합니다:
   ```bash
   python test_model.py
   ```
3. `new_customer_data` 딕셔너리의 내부 값을 변경하여 다양한 시나리오(예: '65세 이상', '여', '노면상태: 건조' 등)의 조건별 예측 거동 변화를 확인해봅니다.
