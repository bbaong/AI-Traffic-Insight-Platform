# AI Traffic Insight Platform

대구 교통사고 데이터를 바탕으로 **보험사(InsureGuard)**·**지자체(GovGuard)** 대시보드에 AI 예측을 제공하는 풀스택 플랫폼입니다.

```text
Frontend (:5173)  →  Backend (:5000)  →  AI (:8000)
                 /api/prediction/*
```

| 모듈 | 역할 | 상세 문서 |
|------|------|-----------|
| [frontend](frontend/README.md) | React 대시보드·인증 UI | [frontend/docs](frontend/docs/README.md) |
| [backend](backend/README.md) | REST API, DB, AI 중계 | [backend/README.md](backend/README.md) |
| [ai](ai/README.md) | FastAPI 모델 서빙 | [ai/docs](ai/docs/README.md) |

---

## 로컬 실행 순서

세 서버를 각각 띄웁니다. **AI → Backend → Frontend** 순을 권장합니다.

### 1. AI (`ai/`, Python 3.11+)

```bash
cd ai
python -m venv .venv
# Windows: .\.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
# models/*.pkl 이 없으면 학습 스크립트 실행 (자세한 내용은 ai/README.md)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- 서버: http://localhost:8000  
- Swagger: http://localhost:8000/docs  

### 2. Backend (`backend/`, Node.js 18+)

```bash
cd backend
npm install
# .env 작성 (DATABASE_URL, JWT_* — 자세한 내용은 backend/README.md)
npx prisma generate
npm run dev
```

- 서버: http://localhost:5000  
- AI 연동: `AI_SERVICE_URL` (기본 `http://localhost:8000`)

### 3. Frontend (`frontend/`, Node.js 18+)

```bash
cd frontend
npm install
# .env 작성 (VITE_KAKAO_MAP_APP_KEY, VITE_API_BASE_URL — frontend/README.md)
npm run dev
```

- 앱: http://localhost:5173  

---

## 예측 API 한눈에

| Frontend → Backend | Backend → AI |
|--------------------|--------------|
| `POST /api/prediction/predict-ins` | `POST /predict` (InsureGuard) |
| `POST /api/prediction/predict-gov` | `POST /predict/gov` (GovGuard) |

현재 서빙 모델은 보험 **InsureGuard v1.0.3**, 지자체 **GovGuard v1.0.4**입니다. 피처 명세·실험 문서는 [ai/docs/README.md](ai/docs/README.md)를 보세요.

---

## 참고

- `ai/models/*.pkl`, `ai/data/` 는 보통 Git에 포함되지 않습니다. pkl이 없으면 AI 예측 API가 503을 반환할 수 있습니다.
- 모듈별 설치·환경 변수·학습 명령의 **상세본은 각 폴더 README**에 있습니다. 이 문서는 입구·실행 순서만 다룹니다.
