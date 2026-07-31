# 새로운 모델 만들기

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import pickle
import os
import sys
import time
import random
import warnings

# 데이터 불러오기
data = pd.read_csv('사고분석.csv')

# 결측지 처리
data.dropna(inplace=True)

# 데이터 전처리
data.drop_duplicates(inplace=True)

#Train, Test 데이터 분리
train_data = data.sample(frac=0.8, random_state=42)
test_data = data.drop(train_data.index)

#정규화 범주행 데이터 처리
train_data = train_data.apply(lambda x: (x - x.mean()) / x.std())
test_data = test_data.apply(lambda x: (x - x.mean()) / x.std())

# 모델 선정

# 모델 학습

# 모델 평가

# 모델 저장