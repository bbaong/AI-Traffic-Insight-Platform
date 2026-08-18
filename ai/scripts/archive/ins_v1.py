# -*- coding: utf-8 -*-
"""
교통사고 위험 점수 예측 및 다치기 쉬운 사고 항목(Top3) 분류 모델 학습 스크립트
"""

from pathlib import Path

import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_squared_error, accuracy_score

# ins_model_v1/ (scripts/ 상위)
ROOT = Path(__file__).resolve().parents[2]  # scripts/archive -> ai
DATA_DIR = ROOT / "data"
MODEL_DIR = ROOT / "models"

def main():
    print("1. 데이터 불러오기 및 전처리 시작...")
    
    # 데이터 로드
    df_accident = pd.read_csv(DATA_DIR / '사고분석.csv', encoding='utf-8')
    df_pop = pd.read_csv(DATA_DIR / '대구_구군_연령별_주민등록인구_2020_2025.csv', encoding='utf-8')

    # 구/군 정보 추출 ('대구광역시 달서구' -> '달서구')
    df_accident['지역'] = df_accident['시군구'].apply(lambda x: x.split()[-1] if isinstance(x, str) else np.nan)
    
    # 핵심 열 결측치 제거
    df_accident.dropna(subset=['지역', '가해운전자 연령대', '가해운전자 성별', '가해운전자 차종', '주야', '노면상태', '사고내용', '법규위반'], inplace=True)
    df_accident.drop_duplicates(inplace=True)

    # 2. 인구 데이터를 기반으로 한 사고 발생률 가중치 계산
    print("2. 인구 통계 데이터 매핑 및 그룹별 사고 발생률 계산...")
    # 인구 연령대 매핑 사전 정의
    age_map = {
        '0~4세': '20세 이하', '5~9세': '20세 이하', '10~14세': '20세 이하', '15~19세': '20세 이하',
        '20~24세': '21-30세', '25~29세': '21-30세',
        '30~34세': '31-40세', '35~39세': '31-40세',
        '40~44세': '41-50세', '45~49세': '41-50세',
        '50~54세': '51-60세', '55~59세': '51-60세',
        '60~64세': '61-64세',
        '65~69세': '65세 이상', '70~74세': '65세 이상', '75~79세': '65세 이상', 
        '80~84세': '65세 이상', '85~89세': '65세 이상', '90~94세': '65세 이상', 
        '95~99세': '65세 이상', '100세이상': '65세 이상'
    }
    
    df_pop_clean = df_pop.iloc[1:].copy()
    df_pop_clean.rename(columns={'행정구역(동읍면)별(1)': '지역', '연령별(1)': '연령별'}, inplace=True)
    df_pop_clean = df_pop_clean[df_pop_clean['지역'] != '합계']
    df_pop_clean = df_pop_clean[df_pop_clean['연령별'] != '계']
    df_pop_clean['연령대'] = df_pop_clean['연령별'].map(age_map)

    # 연도별 남/여 인구 평균 계산
    male_cols = [c for c in df_pop_clean.columns if c.endswith('.1')]
    female_cols = [c for c in df_pop_clean.columns if c.endswith('.2')]
    
    for c in male_cols + female_cols:
        df_pop_clean[c] = pd.to_numeric(df_pop_clean[c].astype(str).str.replace(',', ''), errors='coerce').fillna(0)
        
    df_pop_clean['남성인구'] = df_pop_clean[male_cols].mean(axis=1)
    df_pop_clean['여성인구'] = df_pop_clean[female_cols].mean(axis=1)

    pop_grouped = df_pop_clean.groupby(['지역', '연령대']).agg({
        '남성인구': 'sum',
        '여성인구': 'sum'
    }).reset_index()

    pop_melted = pd.melt(pop_grouped, id_vars=['지역', '연령대'], value_vars=['남성인구', '여성인구'],
                         var_name='성별', value_name='인구')
    pop_melted['성별'] = pop_melted['성별'].map({'남성인구': '남', '여성인구': '여'})

    # 그룹별 사고건수 계산
    accident_counts = df_accident.groupby(['지역', '가해운전자 연령대', '가해운전자 성별']).size().reset_index(name='사고건수')
    accident_counts.rename(columns={'가해운전자 연령대': '연령대', '가해운전자 성별': '성별'}, inplace=True)

    # 사고 발생률 산정 (사고건수 / 그룹 인구수)
    merged_rate = pd.merge(accident_counts, pop_melted, on=['지역', '연령대', '성별'], how='left')
    merged_rate['인구'] = merged_rate['인구'].fillna(merged_rate['인구'].median())
    merged_rate['사고발생률'] = merged_rate['사고건수'] / merged_rate['인구']

    rate_dict = merged_rate.set_index(['지역', '연령대', '성별'])['사고발생률'].to_dict()
    df_accident['사고발생률'] = df_accident.apply(
        lambda r: rate_dict.get((r['지역'], r['가해운전자 연령대'], r['가해운전자 성별']), 0.0), axis=1
    )

    # 3. 가해자/피해자 상해 정도 및 사고 내용 가중치 기반 위험점수 계산
    print("3. 상해 정도 및 사고유형 가중치 기반 위험점수(Target) 산정...")
    
    # 가중치 테이블 설계 (도로교통공단 EPDO 지표 기반 반영)
    # 가해 운전자의 심각도는 사고 전체 통계인 사망자/중상자/경상자 수에 가중치를 주어 계산
    accident_type_weights = {'사망사고': 15, '중상사고': 8, '경상사고': 3, '부상신고사고': 1}
    victim_severity_weights = {'사망': 15, '중상': 8, '경상': 3, '부상신고': 1, '상해없음': 0, '기타불명': 0}

    df_accident['피해자상해가중치'] = df_accident['피해운전자 상해정도'].map(victim_severity_weights).fillna(0)
    df_accident['사고유형가중치'] = df_accident['사고내용'].map(accident_type_weights).fillna(0)

    # 사고 전체 심각도 = (사망자수 * 15) + (중상자수 * 8) + (경상자수 * 3) + 피해자상해가중치 + 사고내용가중치
    df_accident['심각도'] = (
        df_accident['사망자수'] * 15 +
        df_accident['중상자수'] * 8 +
        df_accident['경상자수'] * 3 +
        df_accident['피해자상해가중치'] +
        df_accident['사고유형가중치']
    )

    # 종합 원천위험점수 = 사고 심각도 * 사고 발생률
    df_accident['원천위험점수'] = df_accident['심각도'] * df_accident['사고발생률']

    # 백분위(Percentile Rank) 기반 정규화 적용 (인간이 직관적으로 이해할 수 있는 0~100점 스케일 변환)
    df_accident['위험점수'] = df_accident['원천위험점수'].rank(pct=True) * 100

    # 4. 피처 엔지니어링 및 범주형 인코딩
    print("4. 모델 피처 지정 및 범주형 데이터 인코딩...")
    # 모델 학습용 입력 피처 (연령, 성별, 차종, 지역, 주행시간(주야), 노면(노면상태))
    features = ['가해운전자 연령대', '가해운전자 성별', '가해운전자 차종', '지역', '주야', '노면상태']
    
    # 딕셔너리로 저장하여 서빙 환경에서 손쉽게 사용하도록 구축
    label_encoders = {}
    X = pd.DataFrame()
    
    for col in features:
        le = LabelEncoder()
        X[col] = le.fit_transform(df_accident[col].astype(str))
        label_encoders[col] = le

    # Target 변수 설정
    y_reg = df_accident['위험점수']
    
    # 법규위반 분류를 위한 Target 인코딩
    le_violation = LabelEncoder()
    y_clf = le_violation.fit_transform(df_accident['법규위반'].astype(str))
    label_encoders['법규위반'] = le_violation

    # 5. 모델 학습 및 평가
    print("5. 훈련 데이터 및 테스트 데이터 분리 및 모델 학습...")
    # Train/Test Split (8:2)
    X_train, X_test, y_reg_train, y_reg_test, y_clf_train, y_clf_test = train_test_split(
        X, y_reg, y_clf, test_size=0.2, random_state=42
    )

    # 5-1. 위험 점수 예측을 위한 RandomForest Regressor
    regressor = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    regressor.fit(X_train, y_reg_train)
    reg_preds = regressor.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_reg_test, reg_preds))
    print(f"   - [Regressor] 위험점수 예측 RMSE (오차범위): {rmse:.2f}점")

    # 5-2. 주 사고 원인(법규위반) 예측을 위한 RandomForest Classifier
    classifier = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    classifier.fit(X_train, y_clf_train)
    clf_preds = classifier.predict(X_test)
    accuracy = accuracy_score(y_clf_test, clf_preds)
    print(f"   - [Classifier] 법규위반 분류 정확도: {accuracy * 100:.2f}%")

    # 6. 전체 모델 패키징 및 저장
    print("6. 모델 및 전처리 인코더 저장 (.pkl)...")
    model_package = {
        'regressor': regressor,
        'classifier': classifier,
        'label_encoders': label_encoders,
        'features': features
    }
    
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_DIR / "ins_model_v1.pkl"
    with open(model_path, 'wb') as f:
        pickle.dump(model_package, f)
        
    print(f"성공적으로 모델을 '{model_path}' 파일에 저장했습니다!")

    # 7. 서빙 예측 함수 시뮬레이션 예시
    print("\n--- [시뮬레이션] 입력 테스트 시작 ---")
    test_input = {
        '가해운전자 연령대': '21-30세',
        '가해운전자 성별': '남',
        '가해운전자 차종': '승용',
        '지역': '북구',
        '주야': '야간',
        '노면상태': '젖음/습윤' # 우천 노면 등에 대응
    }
    
    # 예측 수행 함수
    def predict_risk_and_causes(inputs, package):
        reg = package['regressor']
        clf = package['classifier']
        encoders = package['label_encoders']
        feat_names = package['features']
        
        # 인코딩 변환
        encoded_input = []
        for col in feat_names:
            val = inputs[col]
            le = encoders[col]
            # 학습 데이터셋에 없는 라벨이 오면 최빈값 또는 예외처리
            if val not in le.classes_:
                # 유사도 처리 혹은 첫 번째 클래스로 기본 처리
                encoded_val = le.transform([le.classes_[0]])[0]
            else:
                encoded_val = le.transform([val])[0]
            encoded_input.append(encoded_val)
            
        # 1. 위험점수 예측
        predicted_score = reg.predict([encoded_input])[0]
        
        # 2. 사고 원인 Top3 확률 예측
        clf_probs = clf.predict_proba([encoded_input])[0]
        violation_classes = encoders['법규위반'].classes_
        
        # 확률과 클래스 매칭하여 내림차순 정렬
        probs_with_labels = sorted(zip(violation_classes, clf_probs), key=lambda x: x[1], reverse=True)
        top3 = probs_with_labels[:3]
        
        return predicted_score, top3

    risk_score, top3_causes = predict_risk_and_causes(test_input, model_package)
    
    # 위험 등급 판단
    risk_level = "High" if risk_score >= 70 else ("Medium" if risk_score >= 40 else "Low")
    
    print(f"입력: {test_input}")
    print(f"결과:")
    print(f"   - [위험 점수]: {risk_score:.1f}점 ({risk_level} 등급)")
    print(f"   - [주요 사고 요인 Top 3]:")
    for cause, prob in top3_causes:
        print(f"     * {cause}: {prob * 100:.1f}%")

if __name__ == '__main__':
    main()