# Frontend

React + TypeScript + Vite 기반 UI입니다. 보험·지자체 대시보드와 인증 화면을 제공합니다.

- 사전 요구사항: **Node.js 18+**, npm  
- 작업 디렉터리: `AI-Traffic-Insight-Platform/frontend`  
- 화면·연동 노트: [docs/README.md](docs/README.md)

---

## 1) 의존성 설치

```bash
npm install
```

## 2) 환경 변수

`frontend/.env` 파일을 만들고 아래 값을 채웁니다.

```env
VITE_KAKAO_MAP_APP_KEY=카카오_JavaScript_키
VITE_API_BASE_URL=http://localhost:5000
```

## 3) Backend · AI 실행 (필수)

예측·로그인 API를 쓰려면 Backend(:5000)와 AI(:8000)가 떠 있어야 합니다.  
실행 순서는 [루트 README](../README.md)를 보세요.

## 4) 프론트 개발 서버

```bash
npm run dev
```

- 주소: http://localhost:5173

---

## 자주 쓰는 명령

```bash
npm run build
npm run preview
npm run lint
```

## 참고

- Node.js / `npm` 기준입니다.
- `VITE_` 환경 변수는 서버 재시작 후 반영됩니다.
- `VITE_API_BASE_URL` 미설정 시 기본값: `http://localhost:5000`
