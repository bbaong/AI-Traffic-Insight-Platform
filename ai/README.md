# AI Traffic Insight Platform — AI 모듈

대구 교통사고 데이터를 기반으로 **위험도(100점)** 를 예측하는 ML 모듈입니다.

## 디렉터리 구조

```
ai/
├── data/           # 학습/테스트 데이터 (Git 제외)
│   ├── raw/        # 원천 CSV
│   └── processed/  # 전처리 결과
├── models/         # 학습된 모델 (.pkl, Git 제외)
├── notebooks/      # EDA 노트북
├── src/            # 학습·전처리·추론 로직
└── app/            # FastAPI 서빙
```

## 설치 가이드 (처음 설치하는 경우)

- 사전 요구사항: Python 3.11 이상, pip
- 작업 디렉터리: `AI-Traffic-Insight-Platform/ai`

### 1) 가상환경 생성 및 활성화 (권장)

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
# source .venv/bin/activate
```

### 2) 의존성 설치

```bash
pip install -r requirements.txt
```

### 3) 원천 데이터 준비

- `data/raw/`에 사고·인구 CSV를 배치
- 예: `사고분석.csv` (Git 미포함)

### 4) 전처리 및 모델 학습 (최초 1회, `.pkl` 생성용)

```bash
python -m src.preprocess
python -m src.train
```

### 5) API 서버 실행

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- 서버 주소 예: `http://localhost:8000`
- API 문서: `http://localhost:8000/docs`

### 기타 자주 쓰는 명령어

```bash
python -m src.inference --구군 달서구 --연령대 "51-60세" --성별 남 --차종 승용
docker build -t ai-traffic-risk .
docker run -p 8000:8000 ai-traffic-risk
```

### 참고

- 이 프로젝트는 Python 기반이며 `npm install`이 아니라 `pip install` 사용
- `models/*.pkl`이 없으면 `POST /predict`가 503 반환 (학습 선행 필요)
- `data/`, `models/*.pkl`은 Git 제외 대상

## 데이터 전처리

원천 데이터(`data/raw/`)를 조인·집계합니다.

```bash
python -m src.preprocess
```

생성 파일:
- `data/processed/사고분석_인구_join.csv`
- `data/processed/인구대비_가중사고비율.csv`

## 모델 학습

```bash
python -m src.train
```

저장 위치:
- `models/best_risk_model_unweighted.pkl` — 샘플 가중치 없음
- `models/best_risk_model_weighted.pkl` — 샘플 가중치 적용

## 추론 (CLI)

```bash
python -m src.inference --구군 달서구 --연령대 "51-60세" --성별 남 --차종 승용 --주야 주간 --variant both
```

## API 서빙

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| POST | `/predict` | 위험도 예측 |

### `/predict` 요청 예시

```json
{
  "구군": "달서구",
  "연령대": "51-60세",
  "성별": "남",
  "차종": "승용",
  "주야": "주간",
  "variant": "weighted"
}
```

### 응답 예시

```json
{
  "버전": "샘플가중치 적용",
  "variant": "weighted",
  "예측등급": "경상사고",
  "위험도": 42.3,
  "등급확률": {
    "부상신고사고": 0.12,
    "경상사고": 0.65,
    "중상사고": 0.20,
    "사망사고": 0.03
  }
}
```

## Docker

```bash
docker build -t ai-traffic-risk .
docker run -p 8000:8000 ai-traffic-risk
```

## 모델 입력 피처

| 피처 | 설명 | 예시 |
|------|------|------|
| 구군 | 사고 발생 구·군 | 달서구, 수성구 |
| 가해운전자 연령대 | 연령대 | 51-60세 |
| 가해운전자 성별 | 성별 | 남, 여 |
| 가해운전자 차종 | 차량 종류 | 승용, 화물 |
| 주야 | 주간/야간 | 주간, 야간 |

## 위험도 산출

```
위험도 = P(부상신고)×20 + P(경상)×40 + P(중상)×75 + P(사망)×100
```

| 사고내용 | 점수 |
|----------|------|
| 부상신고사고 | 20 |
| 경상사고 | 40 |
| 중상사고 | 75 |
| 사망사고 | 100 |
