# AI Traffic Insight Platform

## AI 모듈 설치 가이드 (처음 설치하는 경우)

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

## Backend 설치 가이드 (처음 설치하는 경우)

- 사전 요구사항: Node.js 18 이상, npm
- 작업 디렉터리: `AI-Traffic-Insight-Platform/backend`

### 1) 의존성 설치

```bash
npm install
```

### 2) 환경 변수 파일 생성

`backend/.env` 파일을 만들고 아래 값을 채웁니다.

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE_NAME"
JWT_SECRET=your_jwt_secret
JWT_ACCESS_EXPIRATION=1800000
JWT_REFRESH_EXPIRATION=604800000
```

### 3) Prisma Client 생성 (필수)

```bash
npx prisma generate
```

### 4) 개발 서버 실행

```bash
npm run dev
```

- 서버 주소 예: `http://localhost:5000`

### 기타 자주 쓰는 명령어

```bash
npm run build
npm start
npx prisma db pull
npx prisma generate
```

### 참고

- 이 프로젝트는 Node.js 기반이며 `pip install`이 아니라 `npm install` 사용
- 패키지 설치 후 반드시 `npx prisma generate` 실행 필요
- Prisma Client 생성 경로: `src/generated/prisma`

## Frontend 설치 가이드 (처음 설치하는 경우)

- 사전 요구사항: Node.js 18 이상, npm
- 작업 디렉터리: `AI-Traffic-Insight-Platform/frontend`

### 1) 의존성 설치

```bash
npm install
```

### 2) 환경 변수 파일 생성

`frontend/.env` 파일을 만들고 아래 값을 채웁니다.

```env
VITE_KAKAO_MAP_APP_KEY=카카오_JavaScript_키
VITE_API_BASE_URL=http://localhost:5000
```

### 3) 백엔드 서버 실행 (필수)

`AI-Traffic-Insight-Platform/backend`에서:

```bash
npm install
npx prisma generate
npm run dev
```

- 서버 주소: `http://localhost:5000`
- 백엔드가 꺼져 있으면 아이디 중복확인 API가 실패할 수 있습니다.

### 4) 프론트 개발 서버 실행

```bash
npm run dev
```

- 주소 예: `http://localhost:5173`

### 기타 자주 쓰는 명령어

```bash
npm run build
npm run preview
npm run lint
```

### 참고

- 이 프로젝트는 Node.js 기반이며 `pip install`이 아니라 `npm install` 사용
- `VITE_` 접두사 환경 변수는 서버 재시작 후 반영
- API Base URL 미설정 시 기본값: `http://localhost:5000`
