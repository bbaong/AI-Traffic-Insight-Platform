# Backend 설치 가이드 (처음 설치하는 경우)

- 사전 요구사항: Node.js 18 이상, npm
- 작업 디렉터리: `AI-Traffic-Insight-Platform/backend`

## 1) 의존성 설치

```bash
npm install
```

## 2) 환경 변수 파일 생성

`backend/.env` 파일을 만들고 아래 값을 채웁니다.

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE_NAME"
JWT_SECRET=your_jwt_secret
JWT_ACCESS_EXPIRATION=1800000
JWT_REFRESH_EXPIRATION=604800000
```

## 3) Prisma Client 생성 (필수)

```bash
npx prisma generate
```

## 4) 개발 서버 실행

```bash
npm run dev
```

- 서버 주소 예: `http://localhost:5000`

## 기타 자주 쓰는 명령어

```bash
npm run build
npm start
npx prisma db pull
npx prisma generate
```

## 참고

- 이 프로젝트는 Node.js 기반이며 `pip install`이 아니라 `npm install` 사용
- 패키지 설치 후 반드시 `npx prisma generate` 실행 필요
- Prisma Client 생성 경로: `src/generated/prisma`
