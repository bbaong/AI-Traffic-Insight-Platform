# 보험 상담 대시보드 — 백엔드·프론트 파일·컴파일러 정리

> 작업 범위: Express + Prisma 백엔드 + INS 대시보드 프론트 연동  
> 기준: `develop` pull 반영 후 (커밋 `4fe71dd` 특약 API, `9bb205b` 저장 API/DB 연동)  
> 경로: `AI-Traffic-Insight-Platform/backend`

---

## 1. 스택 · 컴파일러

| 항목 | 내용 |
|------|------|
| 런타임 | Node.js 18+ |
| 언어 | TypeScript (`typescript` ^7.0.2) |
| 모듈 | CommonJS (`"type": "commonjs"`) |
| HTTP | Express 5 |
| ORM | Prisma 6 (MySQL/MariaDB) |
| 개발 실행 | `tsx watch src/index.ts` |
| 프로덕션 빌드 | `tsc` → `dist/` → `node dist/index.js` |
| 패키지 관리 | npm |

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- Prisma Client 출력: `src/generated/prisma`

### npm scripts

| 명령 | 동작 |
|------|------|
| `npm run dev` | 개발 서버 **:5000** |
| `npm run build` | `tsc` 컴파일 |
| `npm start` | 빌드 결과 실행 |
| `npx prisma generate` | Client 재생성 (**필수**) |
| `npx prisma db pull` | DB → schema 동기화 |
| `npx prisma validate` | 스키마 검증 |

### `.env`

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DB_NAME"
AI_SERVICE_URL=http://localhost:8000
JWT_SECRET=...
```

- 특수문자 URL 인코딩 (`!` → `%21`)
- 따옴표는 ASCII `"` 만 사용

---

## 2. 절대 원칙

| 버튼 / API | DB 쓰기 |
|------------|---------|
| 분석하기 | ❌ 없음 |
| 맞춤 특약 검토하기 | ❌ 없음 |
| **상담 대시보드 저장** | ✅ **유일한 쓰기** |

저장 시 프론트 `prediction` / `tokkResults`를 믿지 않고, 서버가 원본 입력으로 **AI·특약 재계산** 후 저장.

---

## 3. API 현황 (pull 반영)

| Method | Path | DB | 상태 |
|--------|------|-----|------|
| POST | `/api/prediction/predict-ins` | 없음 | ✅ 프론트 분석하기 사용 |
| POST | `/api/prediction/predict-gov` | 없음 | ✅ 지자체 |
| POST | `/api/prediction/predict-gov-history` | 없음 | ✅ (pull 추가) |
| GET | `/api/prediction/predict-gov-hotspots` | 없음 | ✅ (pull 추가) |
| POST | `/api/insurance/analyze` | 없음 | 골격 |
| POST | `/api/discount-riders/evaluate` | 없음 | ✅ **프론트 연동 완료** |
| POST | `/api/consultations/save` | **쓰기** | ✅ **프론트 연동 완료** |
| GET | `/api/customers` | 읽기 | 골격 (빈 배열) |
| GET | `/api/customers/:id/consultations` | 읽기 | 골격 |

서버 포트: `http://localhost:5000`

---

## 4. 백엔드 파일 구성

### 4-1. 엔트리

| 파일 | 설명 |
|------|------|
| `src/index.ts` | 라우터 마운트 |

```
/api/user
/api/prediction
/api/insurance
/api/discount-riders
/api/consultations
/api/customers
```

### 4-2. Routes

| 파일 | 엔드포인트 |
|------|------------|
| `src/routes/prediction.route.ts` | predict-ins, predict-gov, predict-gov-history, predict-gov-hotspots |
| `src/routes/insurance.ts` | `POST /analyze` |
| `src/routes/discountRider.route.ts` | `POST /evaluate` |
| `src/routes/consultation.route.ts` | `POST /save` |
| `src/routes/customer.route.ts` | `GET /`, `GET /:id/consultations` |

### 4-3. Controllers

| 파일 | 역할 | 상태 |
|------|------|------|
| `prediction.controller.ts` | AI 중계 (ins/gov/history/hotspots) | ✅ |
| `insurance.controller.ts` | analyze | 골격 |
| `discountRider.controller.ts` | evaluate | ✅ |
| `consultation.controller.ts` | save (+ 에러 message 전달) | ✅ |
| `customer.controller.ts` | 고객·이력 조회 | 골격 |

### 4-4. Services

| 파일 | 역할 | 상태 |
|------|------|------|
| `aiPredict.service.ts` | AI `/predict` 호출 | ✅ |
| `discountRider.service.ts` | 판정+문구, 프론트 키 정규화 | ✅ |
| `consultationSave.service.ts` | 트랜잭션 저장 | ✅ |
| `coverageRule.service.ts` | 6대 담보 | ⏳ stub |

### 4-5. 룰 엔진 · 문구

| 파일 | 역할 |
|------|------|
| `src/discountRider.ts` | 특약 5종 배지 판정 (프론트 체크리스트 옵션 기준) |
| `src/riderTexts.ts` | `RIDER_TEXTS`, `REASON_FIELD_BY_BADGE` |

### 4-6. Prisma 상담 관련 모델

- `customers` (`phone_number` UNIQUE)
- `consultations`
- `checklist_items`
- `consultation_checklist_answers`
- `consultation_discount_riders`
- `customer_risk_profiles`

**배지 enum (DB)**

```
REVIEW_RECOMMENDED
FURTHER_CHECK_REQUIRED
CURRENTLY_EXCLUDED
EXISTING_MEMBER_VERIFIED
```

**상태 enum**

```
IN_PROGRESS
COMPLETED
```

엔진 한글 배지 → DB enum은 `consultationSave.service.ts`의 `BADGE_MAP`.

---

## 5. 주요 API 상세

### 5-1. `POST /api/discount-riders/evaluate`

**요청** (프론트 `ChecklistAnswers` 키)

```json
{
  "mileage": "5,000 ~ 10,000km",
  "blackbox": "상시녹화형 장착",
  "safedrive": "이용 중",
  "safedriveService": "TMAP",
  "safedriveScore": "85",
  "fcw": "출고 시 장착",
  "ldw": "확인 필요"
}
```

**응답**

```json
{
  "success": true,
  "data": [
    {
      "riderKey": "mileage_discount",
      "riderName": "마일리지 할인특약",
      "iconKey": "car",
      "badge": "검토권장",
      "reasonText": "...",
      "additionalCheckText": "..."
    }
  ]
}
```

**badge (한글 4종)**

| badge | 프론트 `TokkStatus` |
|-------|---------------------|
| `검토권장` | `RECOMMEND` |
| `추가확인필요` | `CHECK` |
| `현재제외` | `EXCLUDE` |
| `기존가입확인` | `EXISTING` |

### 5-2. `POST /api/consultations/save`

**요청**

```json
{
  "customer": { "name": "홍길동", "phone": "010-0000-0000" },
  "profile": {
    "gender": "남",
    "age": "51-60세",
    "vehicle": "승용",
    "region": "달서구"
  },
  "checklist": { "...": "..." },
  "memo": "",
  "userId": 1
}
```

- `userId` **필수**
- `prediction` / `tokkResults`는 프론트가 저장 API body에 **보내지 않음** (서버 재계산)

**응답**

```json
{
  "success": true,
  "data": {
    "consultationId": "...",
    "customerId": "...",
    "profileId": "..."
  }
}
```

**트랜잭션 순서**

1. AI 재추론 (`aiPredict`)
2. 특약 재판정 (`evaluateDiscountRiders`)
3. `districts` 조회 (구군명)
4. `customers` 전화 upsert
5. `customer_risk_profiles` 생성
6. `consultations` 생성
7. `consultation_checklist_answers`
8. `consultation_discount_riders`

---

## 6. 프론트 연동 (pull 후 ✅ 완료)

| 기능 | 파일 | API |
|------|------|-----|
| 분석하기 | `frontend/src/domains/ins/api/prediction.ts` | `POST /api/prediction/predict-ins` |
| 특약 검토 | `frontend/src/domains/ins/api/tokkReview.ts` | `POST /api/discount-riders/evaluate` |
| 상담 저장 | `frontend/src/domains/ins/api/consultation.ts` | `POST /api/consultations/save` |
| 저장 UI | `frontend/src/domains/ins/pages/InsDashboardPage.tsx` | `userId` 포함 호출 |
| 타입 | `frontend/src/domains/ins/types/consulting.ts` | `userId`, `TokkStatus`에 `EXISTING` |
| 배지 UI | `frontend/src/domains/ins/constants/tokkStatus.ts` | 권장/확인/제외/기존가입 |

### 특약 매핑 (프론트 `tokkReview.ts`)

| riderKey | id | iconKey → emoji |
|----------|-----|-----------------|
| `mileage_discount` | `mileage` | car → 🚗 |
| `blackbox_discount` | `blackbox` | camera → 📹 |
| `safe_driving_score_discount` | `safedrive` | shield → 🛡️ |
| `fcw_discount` | `fcw` | radar → ⚠️ |
| `ldws_discount` | `ldw` | lane → ➖ |

정렬: 권장 → 확인 → 기존가입 → 제외 (`TOKK_STATUS_ORDER`)

---

## 7. 폴더 트리

```
backend/
├── prisma/schema.prisma
├── docs/consultation-dashboard-summary.md   ← 이 문서
├── src/
│   ├── index.ts
│   ├── discountRider.ts
│   ├── riderTexts.ts
│   ├── controllers/
│   │   ├── prediction.controller.ts
│   │   ├── insurance.controller.ts
│   │   ├── discountRider.controller.ts
│   │   ├── consultation.controller.ts
│   │   └── customer.controller.ts
│   ├── routes/
│   │   ├── prediction.route.ts
│   │   ├── insurance.ts
│   │   ├── discountRider.route.ts
│   │   ├── consultation.route.ts
│   │   └── customer.route.ts
│   ├── services/
│   │   ├── aiPredict.service.ts
│   │   ├── discountRider.service.ts
│   │   ├── consultationSave.service.ts
│   │   └── coverageRule.service.ts
│   └── generated/prisma/
├── package.json
├── tsconfig.json
└── .env
```

---

## 8. 로컬 실행

```bash
cd backend
npm install
npx prisma generate
npm run dev
# → http://localhost:5000

# AI 서버도 필요 (예측·저장)
# cd ../ai && (AI README 참고)
```

프론트:

```bash
cd frontend
npm run dev
# VITE_API_BASE_URL 미설정 시 http://localhost:5000
```

### Postman

- URL 끝 공백 금지 (`evaluate%20` → 404)
- 예: `POST http://localhost:5000/api/discount-riders/evaluate`

### DB 확인

```sql
SELECT * FROM consultations ORDER BY consulted_at DESC LIMIT 10;
SELECT * FROM customers ORDER BY created_at DESC LIMIT 10;
SELECT * FROM consultation_discount_riders ORDER BY created_at DESC LIMIT 20;
```

---

## 9. 남은 작업

1. `GET /api/customers`, `GET /api/customers/:id/consultations` 실조회
2. `coverageRule.service.ts` — 6대 담보 규칙
3. `POST /api/insurance/analyze` — `predict-ins`와 공용화 여부 정리
4. `consultation.controller.ts`의 `predictRiskHandler` — save와 동일 로직이 붙어 있음 (정리 권장)

---

## 10. 관련 문서

- `backend/README.md` — 백엔드 기본 실행
- `ai/README.md` — AI FastAPI
