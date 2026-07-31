# Frontend 설치 가이드 (처음 설치하는 경우)

- 사전 요구사항: Node.js 18 이상, npm
- 작업 디렉터리: `AI-Traffic-Insight-Platform/frontend`

## 1) 의존성 설치

```bash
npm install
```

## 2) 환경 변수 파일 생성

`frontend/.env` 파일을 만들고 아래 값을 채웁니다.

```env
VITE_KAKAO_MAP_APP_KEY=카카오_JavaScript_키
VITE_API_BASE_URL=http://localhost:5000
```

## 3) 백엔드 서버 실행 (필수)

`AI-Traffic-Insight-Platform/backend`에서:

```bash
npm install
npx prisma generate
npm run dev
```

- 서버 주소: `http://localhost:5000`
- 백엔드가 꺼져 있으면 아이디 중복확인 API가 실패할 수 있습니다.

## 4) 프론트 개발 서버 실행

```bash
npm run dev
```

- 주소 예: `http://localhost:5173`

## 기타 자주 쓰는 명령어

```bash
npm run build
npm run preview
npm run lint
```

## 참고

- 이 프로젝트는 Node.js 기반이며 `pip install`이 아니라 `npm install` 사용
- `VITE_` 접두사 환경 변수는 서버 재시작 후 반영
- API Base URL 미설정 시 기본값: `http://localhost:5000`

---

# React + TypeScript + Vite

이 템플릿은 Vite의 HMR과 일부 ESLint 규칙으로 React를 바로 시작할 수 있는 최소 구성을 제공합니다.

현재 공식 플러그인은 두 가지입니다.

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) — [Oxc](https://oxc.rs) 사용
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) — [SWC](https://swc.rs/) 사용

## React Compiler

이 템플릿에서는 개발·빌드 성능에 미치는 영향 때문에 React Compiler를 기본 활성화하지 않습니다. 추가 방법은 [이 문서](https://react.dev/learn/react-compiler/installation)를 참고하세요.

## ESLint 설정 확장

프로덕션 애플리케이션을 개발한다면, 타입 인식(type-aware) 린트 규칙을 켜는 구성을 권장합니다.

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // 기타 설정...

      // tseslint.configs.recommended 를 제거하고 아래로 교체
      tseslint.configs.recommendedTypeChecked,
      // 더 엄격한 규칙이 필요하면 아래 사용
      tseslint.configs.strictTypeChecked,
      // 스타일 규칙이 필요하면 선택적으로 추가
      tseslint.configs.stylisticTypeChecked,

      // 기타 설정...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // 기타 옵션...
  },
])
```

React 전용 린트 규칙을 위해 [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x)와 [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom)도 설치할 수 있습니다.

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // 기타 설정...
      // React 린트 규칙 활성화
      reactX.configs['recommended-typescript'],
      // React DOM 린트 규칙 활성화
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // 기타 옵션...
  },
])
```
