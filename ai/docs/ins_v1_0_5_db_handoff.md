# InsureGuard v1.0.5 — DB 인수인계

AI `POST /predict` 응답에 `발생위험` / `심도위험` / `상담포인트` / `발생률_1만명당`이 추가됐습니다.  
이 값들을 저장하려면 **`customer_risk_profiles` 테이블에 컬럼을 추가**해야 합니다.

명세: [`ins_v1_0_5_feature_spec.md`](ins_v1_0_5_feature_spec.md)  
프론트 인수인계: [`ins_v1_0_5_frontend_handoff.md`](ins_v1_0_5_frontend_handoff.md)

---

## 1. 저장 흐름

```
POST /predict (AI)
  └→ 응답 JSON
       ├ 위험도         → customer_risk_profiles.risk_score       (기존)
       ├ 예측등급       → customer_risk_profiles.risk_grade       (기존)
       ├ 발생위험.점수  → customer_risk_profiles.occ_score        (신규)
       ├ 심도위험.점수  → customer_risk_profiles.sev_score        (신규)
       ├ 상담포인트     → customer_risk_profiles.consult_point    (신규)
       └ 발생률_1만명당 → customer_risk_profiles.occ_rate_per_10k (신규)
```

저장 위치: `backend/src/services/consultationSave.service.ts`  
→ `tx.customer_risk_profiles.create({ data: { risk_score: ... } })` 블록

---

## 2. DDL (MySQL)

```sql
ALTER TABLE customer_risk_profiles
  ADD COLUMN occ_score         DECIMAL(5,2) NULL COMMENT '발생 위험 순위 0~100 (발생률 백분위)',
  ADD COLUMN sev_score         DECIMAL(5,2) NULL COMMENT '심도 위험 순위 0~100 (EPDO·중대율 백분위)',
  ADD COLUMN consult_point     TEXT         NULL COMMENT '상담 포인트 한 줄 (AI 생성, v1.0.5+)',
  ADD COLUMN occ_rate_per_10k  DECIMAL(8,4) NULL COMMENT '연간 1만명당 발생률 참고 (v1.0.5+)';
```

**NULL 허용**: v1.0.4 이전 상담 레코드는 값이 없어도 됩니다.

---

## 3. Prisma 스키마 (`schema.prisma`)

`model customer_risk_profiles` 블록에 4개 추가:

```prisma
model customer_risk_profiles {
  ...
  risk_score                   Decimal                                  @db.Decimal(5, 2)
  risk_grade                   customer_risk_profiles_risk_grade
  // ↓ v1.0.5 신규
  occ_score                    Decimal?                                 @db.Decimal(5, 2)
  sev_score                    Decimal?                                 @db.Decimal(5, 2)
  consult_point                String?                                  @db.Text
  occ_rate_per_10k             Decimal?                                 @db.Decimal(8, 4)
  ...
}
```

마이그레이션:
```bash
npx prisma migrate dev --name ins_v1_0_5_axes
npx prisma generate
```

---

## 4. 서비스 코드 수정 (`consultationSave.service.ts`)

현재 저장 블록:

```ts
const riskProfile = await tx.customer_risk_profiles.create({
  data: {
    ...
    risk_score: Number(ai.위험도 ?? 0),
    risk_grade: mapRiskGrade(String(ai.예측등급 ?? 'LOW')),
    severe_injury_probability: 0,
    model_version: String(ai.버전 ?? 'ins_v1'),
  },
});
```

v1.0.5 추가 (타입 안전하게 옵셔널 처리):

```ts
const riskProfile = await tx.customer_risk_profiles.create({
  data: {
    ...
    risk_score: Number(ai.위험도 ?? 0),
    risk_grade: mapRiskGrade(String(ai.예측등급 ?? 'LOW')),
    severe_injury_probability: 0,
    model_version: String(ai.버전 ?? 'ins_v1'),
    // v1.0.5 신규 축
    occ_score:         ai.발생위험?.점수 != null ? Number(ai.발생위험.점수) : null,
    sev_score:         ai.심도위험?.점수 != null ? Number(ai.심도위험.점수) : null,
    consult_point:     typeof ai.상담포인트 === 'string' ? ai.상담포인트 : null,
    occ_rate_per_10k:  ai.발생률_1만명당 != null ? Number(ai.발생률_1만명당) : null,
  },
});
```

---

## 5. AI 응답 타입 (`aiPredict.service.ts`)

`InsPredictResult` 인터페이스에 신규 필드 추가:

```ts
export interface InsPredictResult {
  버전?: string;
  variant?: string;
  예측등급?: string;
  위험도?: number;
  등급확률?: Record<string, number>;
  사고경중비율?: Record<string, number>;
  담보추천?: unknown[];
  // v1.0.5 신규
  발생위험?: { 점수: number; 등급: string; 라벨: string; 설명: string };
  심도위험?: { 점수: number; 등급: string; 라벨: string; 설명: string };
  상담포인트?: string;
  발생률_1만명당?: number;
  [key: string]: unknown;
}
```

---

## 6. 조회 API (선택)

`customer.service.ts`에서 고객 목록·상세에 두 축을 내리려면:

```ts
return {
  ...
  riskScore: toNum(profile?.risk_score),
  riskGrade: profile?.risk_grade ?? null,
  // 신규 (없으면 null)
  occScore:     profile?.occ_score != null ? toNum(profile.occ_score) : null,
  sevScore:     profile?.sev_score != null ? toNum(profile.sev_score) : null,
  consultPoint: profile?.consult_point ?? null,
};
```

고객 목록 카드에서는 `riskScore` 단일 숫자만 써도 됩니다.  
상담 상세·PDF에서 발생/심도를 보여 줄 때 위 두 필드를 씁니다.

---

## 7. 작업 순서 요약

| 순서 | 작업 | 파일 |
|------|------|------|
| 1 | DDL 실행 (MySQL에 컬럼 추가) | HeidiSQL / MySQL CLI |
| 2 | `schema.prisma`에 4개 필드 추가 | `backend/prisma/schema.prisma` |
| 3 | `prisma migrate dev` + `prisma generate` | 터미널 |
| 4 | `InsPredictResult` 타입 확장 | `backend/src/services/aiPredict.service.ts` |
| 5 | `consultationSave` create 블록에 4개 추가 | `backend/src/services/consultationSave.service.ts` |
| 6 | (선택) 조회 서비스에 두 필드 노출 | `backend/src/services/customer.service.ts` |

---

## 8. 하위 호환

- 기존 레코드: 4개 컬럼 `NULL` 그대로 — 오류 없음
- AI 서버가 v1.0.4 pkl을 쓰는 경우: `발생위험` 등 필드가 없어도 옵셔널이라 저장 오류 없음
- AI 서버를 v1.0.5 pkl로 교체한 뒤에만 신규 필드가 채워집니다

---

## 9. 관련 파일

| 파일 | 역할 |
|------|------|
| `backend/prisma/schema.prisma` | Prisma 모델 (수정 대상) |
| `backend/src/services/consultationSave.service.ts` | 상담 저장 (수정 대상) |
| `backend/src/services/aiPredict.service.ts` | AI 응답 타입 (수정 대상) |
| `backend/src/services/customer.service.ts` | 고객 조회 (선택 수정) |
| `ai/src/inference.py` | AI 응답 생성 (이미 반영) |
| `ai/models/ins_model_v1.0.5.pkl` | 서빙 모델 (이미 교체) |
