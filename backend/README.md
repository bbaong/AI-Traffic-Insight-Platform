# Backend

Express + Prisma REST API입니다. 인증·사용자와 AI 예측 중계를 담당합니다.

- 사전 요구사항: **Node.js 18+**, npm  
- 작업 디렉터리: `AI-Traffic-Insight-Platform/backend`

---

## 1) 의존성 설치

```bash
npm install
```

## 2) 환경 변수

`backend/.env` 파일을 만들고 아래 값을 채웁니다.

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE_NAME"
JWT_SECRET=your_jwt_secret
JWT_ACCESS_EXPIRATION=1800000
JWT_REFRESH_EXPIRATION=604800000

# AI FastAPI 주소 (미설정 시 아래 기본값)
AI_SERVICE_URL=http://localhost:8000
```

## 3) Prisma Client 생성 (필수)

```bash
npx prisma generate
```

## 4) 개발 서버 실행

```bash
npm run dev
```

- 서버: http://localhost:5000  
- 예측을 쓰려면 **AI 서버(:8000)** 가 먼저 떠 있어야 합니다. → [ai/README.md](../ai/README.md)

---

## AI 예측 중계

라우트 프리픽스: `/api/prediction`

| Method | Backend 경로 | 호출하는 AI |
|--------|--------------|-------------|
| POST | `/api/prediction/predict-ins` | `POST {AI_SERVICE_URL}/predict` |
| POST | `/api/prediction/predict-gov` | `POST {AI_SERVICE_URL}/predict/gov` |
| GET | `/api/prediction/predictions/:id` | (미구현) |

- `AI_SERVICE_URL` 기본값: `http://localhost:8000`  
- 전체 플랫폼 연결도는 [루트 README](../README.md) 참고

---

## 자주 쓰는 명령

```bash
npm run build
npm start
npx prisma db pull
npx prisma generate
```

## 참고

- Node.js / `npm` 기준입니다 (`pip` 아님).
- 패키지 설치 후 반드시 `npx prisma generate` 실행.
- Prisma Client 경로: `src/generated/prisma`
