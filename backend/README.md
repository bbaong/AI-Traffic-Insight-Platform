# Backend

Express + Prisma REST API입니다. 인증·사용자·상담 저장과 AI 예측 중계, **참고 PDF 생성**을 담당합니다.

- 사전 요구사항: **Node.js 18+**, npm  
- 작업 디렉터리: `AI-Traffic-Insight-Platform/backend`

---

## 1) 의존성 설치

```bash
npm install
# PDF용 Chromium (playwright) — npm 패키지와 별도
npx playwright install chromium
```

의존성 목록은 `package.json`을 보세요. 요약은 [requirements.txt](./requirements.txt)에도 적어 두었습니다.

인증은 `jsonwebtoken`, PDF 메일 발송은 `nodemailer`를 씁니다. 타입은 `@types/jsonwebtoken`, `@types/nodemailer`입니다.

## 2) 환경 변수

`backend/.env` 파일을 만들고 아래 값을 채웁니다.

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE_NAME"

# JWT (jsonwebtoken) — ACCESS/REFRESH 단위: 밀리초
JWT_SECRET=your_jwt_secret
JWT_ACCESS_EXPIRATION=1800000
JWT_REFRESH_EXPIRATION=604800000

# AI FastAPI 주소 (미설정 시 아래 기본값)
AI_SERVICE_URL=http://localhost:8000

# PDF 이메일 발송 (nodemailer / SMTP) — 미사용이면 생략 가능
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="AI Traffic Insight <noreply@example.com>"
```

## 3) Prisma Client 생성 (필수)

DB 스키마가 바뀌었으면 먼저 introspect 한 뒤 클라이언트를 생성합니다.

```bash
npx prisma db pull    # DB → prisma/schema.prisma (선택)
npx prisma generate   # Prisma Client 생성 (필수)
```

## 4) 개발 서버 실행

**반드시 `backend` 폴더에서** 실행하세요. (PDF 템플릿 경로: `templates/pdf/`)

```bash
npm run dev
```

- 서버: http://localhost:5000  
- 예측을 쓰려면 **AI 서버(:8000)** 가 먼저 떠 있어야 합니다. → [ai/README.md](../ai/README.md)  
- PDF는 AI를 호출하지 않고 Backend에서 draft/스냅샷으로 생성합니다.

---

## AI 예측 중계

라우트 프리픽스: `/api/prediction`

| Method | Backend 경로 | 호출하는 AI |
|--------|--------------|-------------|
| POST | `/api/prediction/predict-ins` | `POST {AI_SERVICE_URL}/predict` |
| POST | `/api/prediction/predict-gov` | `POST {AI_SERVICE_URL}/predict/gov` |
| POST | `/api/prediction/predict-gov-history` | `POST {AI_SERVICE_URL}/predict/gov/history` |
| GET | `/api/prediction/predict-gov-hotspots` | `GET {AI_SERVICE_URL}/hotspots` |
| GET | `/api/prediction/gov-forecasts` | (DB 스냅샷) |

- `AI_SERVICE_URL` 기본값: `http://localhost:8000`

---

## 참고 PDF (Playwright)

PDF는 **AI가 아니라 Backend**에서 만듭니다. (재예측 없음 · FE draft / Gov 대시보드 스냅샷)

| Method | Backend 경로 | 설명 |
|--------|--------------|------|
| POST | `/api/insurance/report-pdf` | 보험 상담 참고 PDF (Ins draft) |
| POST | `/api/prediction/gov-report-pdf` | 행정 참고 PDF (`dashboard` 스냅샷 필수) |

구현 위치:

```text
backend/
├── templates/pdf/          # EJS (ins_consult_report.ejs, gov_admin_report.ejs)
└── src/services/pdf/       # Playwright HTML→PDF, Ins/Gov 서비스
```

### PDF 트러블슈팅

- `Executable doesn't exist` → `npx playwright install chromium` 후 Backend 재시작  
- 템플릿을 못 찾음 → `cwd`가 `backend`인지 확인 (`npm run dev`를 backend에서)  
- Gov 400 `dashboard` 필요 → 지자체 대시보드에서 구·군 선택 후 리포트 생성

---

## 자주 쓰는 명령

```bash
npm run build
npm start
npx prisma db pull
npx prisma generate
npx playwright install chromium
```

## 참고

- Node.js / `npm` 기준입니다 (`pip` 아님). AI는 [ai/requirements.txt](../ai/requirements.txt).  
- 패키지 설치 후 반드시 `npx prisma generate` 실행.  
- Prisma Client 경로: `src/generated/prisma`  
- 전체 플랫폼 연결도: [루트 README](../README.md)
