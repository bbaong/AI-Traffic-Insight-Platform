# 0804 INS 대시보드 — 백엔드·DB 인수인계

> 대상: 백엔드 / DB  
> 기준일: 2026-08-04  
> 프론트: 보험 상담 대시보드 (`InsDashboardPage`)  
> 관련 프론트 문서: `docs/0804_ins-consulting-dashboard.md`

---

## 1. 한 줄 요약

보험사(INS) 상담 화면은 **위험 예측만 실 API**, **특약 검토·상담 저장은 목업**이다.  
아래 스펙대로 API·테이블을 만들면 프론트는 서비스 함수 내부만 교체하면 된다. (UI 호출부는 유지)

---

## 2. 현재 상태 (실연결 vs 목업)

| 기능 | 상태 | 프론트 진입점 | 비고 |
|---|---|---|---|
| 프로필 위험점수·법규위반 | **실 API** | `POST /api/prediction/predict-ins` | InsureGuard 4피처 |
| 맞춤 특약 검토 | **목업** | `fetchTokkReview` → 추후 `POST /api/tokk-review` | 체크리스트 답변 기반 매칭 필요 |
| 상담 저장 | **목업** | `saveConsultation` → 추후 `POST /api/consultation` | DB persist 필요 |
| 체크리스트 문항 정의 | 프론트 상수 | `checklistItems.ts` | 서버 enum/마스터와 문자열 맞출 것 |
| 고객관리·리포트 메뉴 | 라우트만 | `/common/customers`, `/common/reports` | 화면·API 미구현 |

공통 응답 래퍼(기존 예측 API와 동일 권장):

```json
{ "success": true, "message": "optional", "data": { } }
```

프론트는 **`json.data`만** 사용한다.

---

## 3. 이미 동작 중 — predict-ins (참고)

### 3.1 엔드포인트

| 항목 | 값 |
|---|---|
| Method | `POST` |
| URL | `/api/prediction/predict-ins` |
| Base | `VITE_API_BASE_URL` (기본 `http://localhost:5000`) |

### 3.2 요청 body (키·값 문자열 고정)

```json
{
  "구군": "달서구",
  "연령대": "51-60세",
  "성별": "남",
  "차종": "승용"
}
```

⚠ **InsureGuard v1.0.3 LabelEncoder 정본** — 값을 바꾸거나 `대구광역시` prefix를 붙이면 silent fallback으로 잘못된 결과가 난다.

| 피처 | 허용 값 |
|---|---|
| 성별 | `남`, `여` |
| 연령대 | `20세 이하`, `21-30세`, `31-40세`, `41-50세`, `51-60세`, `61-64세`, `65세 이상` |
| 차종 | `승용`, `승합`, `화물`, `이륜`, `원동기`, `자전거`, `개인형이동수단(PM)`, `사륜오토바이(ATV)`, `건설기계`, `농기계`, `특수` |
| 구군(지역) | `중구`, `동구`, `서구`, `남구`, `북구`, `수성구`, `달서구`, `달성군`, `군위군` |

프론트 정본: `src/domains/ins/constants/insFeatures.ts`

### 3.3 응답 `data` 예시

```json
{
  "버전": "1.0.2",
  "variant": "ins",
  "예측등급": "HIGH",
  "위험도": 72.4,
  "등급확률": {
    "신호위반": 0.31,
    "안전거리미확보": 0.24,
    "중앙선침범": 0.18
  }
}
```

| 필드 | 화면 매핑 |
|---|---|
| `예측등급` | `CRITICAL \| HIGH \| MODERATE \| LOW` 배지 |
| `위험도` | 0~100 점수·게이지 |
| `등급확률` | key=법규명, value=0~1 → UI에서 ×100 % (개수 가변, 내림차순) |

---

## 4. 신규 필요 ① — 맞춤 특약 검토 API

### 4.1 제안 엔드포인트

| 항목 | 값 |
|---|---|
| Method | `POST` |
| URL | `/api/tokk-review` (또는 `/api/consultation/tokk-review`) |
| 프론트 교체 | `src/domains/ins/api/tokkReview.ts` → `fetchTokkReview` |

현재 목업은 **체크리스트 입력을 무시**하고 고정 5건을 반환한다. 백엔드에서는 답변 → 특약 status 매칭 로직이 필요하다.

### 4.2 요청 body (프론트가 보내는 형태)

```json
{
  "mileage": "5,000km 이하",
  "blackbox": "미장착",
  "safedrive": "미이용",
  "safedriveService": "",
  "safedriveScore": "",
  "fcw": "확인 필요",
  "ldw": "확인 필요"
}
```

| 필드 | 의미 | 선택지 (프론트 상수) |
|---|---|---|
| `mileage` | 연간 주행거리 | `5,000km 이하` / `5,000 ~ 10,000km` / `10,000 ~ 15,000km` / `15,000km 이상` |
| `blackbox` | 블랙박스 | `미장착` / `일반형 고정 장착` / `상시녹화형 장착` |
| `safedrive` | 안전운전점수 이용 | `이용 중` / `미이용` |
| `safedriveService` | 이용 서비스명 | `safedrive === "이용 중"` 일 때 자유 입력 |
| `safedriveScore` | 현재 점수 | 위와 동일, 문자열(숫자 입력 UI) |
| `fcw` | 전방충돌방지장치 | `출고 시 장착` / `미장착` / `확인 필요` |
| `ldw` | 차선이탈경고장치 | `출고 시 장착` / `미장착` / `확인 필요` |

문항 정의: `src/domains/ins/constants/checklistItems.ts`

### 4.3 응답 `data` — `TokkResult[]`

```json
{
  "success": true,
  "data": [
    {
      "id": "mileage",
      "name": "마일리지 할인특약",
      "desc": "연간 주행거리 구간을 기준으로 할인 적용을 권장합니다.",
      "status": "RECOMMEND",
      "icon": "🚗"
    },
    {
      "id": "blackbox",
      "name": "블랙박스 할인특약",
      "desc": "…",
      "status": "RECOMMEND",
      "icon": "📹"
    },
    {
      "id": "safedrive",
      "name": "안전운전점수 할인특약",
      "desc": "…",
      "status": "RECOMMEND",
      "icon": "🛡️"
    },
    {
      "id": "fcw",
      "name": "전방충돌방지장치 할인특약",
      "desc": "…",
      "status": "CHECK",
      "icon": "⚠️"
    },
    {
      "id": "ldw",
      "name": "차선이탈경고장치 할인특약",
      "desc": "…",
      "status": "EXCLUDE",
      "icon": "➖"
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 특약 식별자 (`mileage` 등, 체크리스트 id와 대응 권장) |
| `name` | string | 표시명 |
| `desc` | string | 한 줄 설명 |
| `status` | `RECOMMEND` \| `CHECK` \| `EXCLUDE` | 권장 / 확인 / 제외 |
| `icon` | string | 이모지 또는 아이콘 키 (현재 프론트는 이모지 문자열) |

**매칭 규칙**: 상품/특약 정책에 따라 백엔드에서 확정. 프론트는 status만 색·라벨로 표시한다.  
(목업 예시 매핑은 `mocks/tokkReview.mock.ts` 참고 — 정책 확정본 아님)

---

## 5. 신규 필요 ② — 상담 저장 API + DB

### 5.1 제안 엔드포인트

| 항목 | 값 |
|---|---|
| Method | `POST` |
| URL | `/api/consultation` |
| 프론트 교체 | `src/domains/ins/api/consultation.ts` → `saveConsultation` |
| 성공 시 프론트 기대 | `{ ok: true, id: string }` 형태 (또는 `data.id`를 그렇게 매핑) |

인증: 로그인 사용자(`ROLE_B`) 기준 — 기존 `/api/user/login` 세션·토큰 방식에 맞춰 주세요. (프론트 auth는 현재 local/session storage의 user 객체)

### 5.2 요청 body (`ConsultationPayload`)

프론트가 저장 시 보내는 전체 스냅샷:

```json
{
  "customer": {
    "name": "홍길동",
    "phone": "010-0000-0000"
  },
  "profile": {
    "gender": "남",
    "age": "51-60세",
    "vehicle": "승용",
    "region": "달서구"
  },
  "prediction": {
    "버전": "1.0.2",
    "variant": "ins",
    "예측등급": "MODERATE",
    "위험도": 41.0,
    "등급확률": {
      "안전운전불이행": 0.517,
      "안전거리미확보": 0.21
    }
  },
  "checklist": {
    "mileage": "5,000km 이하",
    "blackbox": "미장착",
    "safedrive": "미이용",
    "safedriveService": "",
    "safedriveScore": "",
    "fcw": "확인 필요",
    "ldw": "확인 필요"
  },
  "memo": "상담 메모 텍스트 (최대 500자, 프론트 제한)",
  "tokkResults": [ /* TokkResult[] — 직전 특약 검토 결과 */ ],
  "savedAt": "2026-08-04T04:00:00.000Z"
}
```

| 필드 | null 가능 | 비고 |
|---|---|---|
| `customer` | name/phone 빈 문자열 가능 | 필수 검증은 백엔드 정책으로 결정 |
| `profile` | 항상 채움 | predict-ins와 동일 정본 문자열 |
| `prediction` | **null 가능** | 분석 없이 저장할 수 있음 |
| `checklist` | 항상 객체 | 기본 선택값이 들어감 |
| `tokkResults` | 빈 배열 가능 | 특약 검토 전 저장 가능 |
| `memo` | `""` 가능 | 프론트 max 500 |
| `savedAt` | ISO 문자열 | 서버 `created_at`으로 대체해도 됨 |

### 5.3 성공 응답 예시

```json
{
  "success": true,
  "message": "상담이 저장되었습니다",
  "data": {
    "id": "cslt_01HXYZ..."
  }
}
```

프론트 목업 반환형: `{ ok: true, id: string }`

---

## 6. DB 설계 제안 (초안)

확정이 아니라 **프론트 payload 기준 초안**이다. 정규화 수준은 백엔드에서 조정.

### 6.1 `consultations` (상담 헤더)

| 컬럼 | 타입 제안 | 설명 |
|---|---|---|
| `id` | PK (UUID/bigint) | |
| `user_id` | FK → users | 상담 담당자(로그인한 ROLE_B) |
| `customer_name` | varchar | |
| `customer_phone` | varchar | |
| `profile_gender` | varchar | |
| `profile_age` | varchar | |
| `profile_vehicle` | varchar | |
| `profile_region` | varchar | |
| `memo` | text | |
| `predict_grade` | varchar nullable | CRITICAL/HIGH/… |
| `predict_score` | decimal nullable | 위험도 |
| `predict_version` | varchar nullable | |
| `predict_raw` | json nullable | `등급확률` 등 원본 |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 6.2 `consultation_checklist` (1:1 또는 json 컬럼)

체크리스트 7필드를 컬럼으로 두거나, `checklist_json` 한 컬럼으로 저장.

| 컬럼 | 설명 |
|---|---|
| `consultation_id` | FK |
| `mileage` / `blackbox` / `safedrive` / `safedrive_service` / `safedrive_score` / `fcw` / `ldw` | 문자열 |

### 6.3 `consultation_tokk_items` (1:N)

| 컬럼 | 설명 |
|---|---|
| `id` | PK |
| `consultation_id` | FK |
| `tokk_id` | `mileage` 등 |
| `name` | |
| `desc` | |
| `status` | RECOMMEND / CHECK / EXCLUDE |
| `icon` | |
| `sort_order` | |

대안: `tokk_results_json` 을 consultations에 통째로 저장 (MVP 빠름).

### 6.4 (선택) 특약 마스터 `tokk_products`

상품·매칭 규칙을 DB/설정으로 관리할 경우.  
없으면 코드/룰엔진에서 status만 계산해도 됨.

---

## 7. 프론트 교체 체크리스트 (백엔드 완료 후)

1. `api/tokkReview.ts` — `fetch`/`apiClient`로 `POST /api/tokk-review`, `data` → `TokkResult[]`  
2. `api/consultation.ts` — `POST /api/consultation`, `data.id` 반환  
3. 에러 시 `{ success: false, message }` → throw Error(message) (예측 API와 동일 패턴)  
4. CORS / auth 헤더를 기존 user API와 통일  
5. UI·타입 파일은 **시그니처 유지**하면 컴포넌트 수정 최소화

---

## 8. 백엔드에 확인할 사항 (오픈 이슈)

1. 특약 status 매칭 **비즈니스 규칙** 확정본 (답변 조합 → RECOMMEND/CHECK/EXCLUDE)  
2. 상담 저장 시 **고객 마스터**를 별도 둘지, 상담 스냅샷만 둘지  
3. `prediction == null` / `tokkResults == []` 저장 허용 여부  
4. 고객관리(` /common/customers`) 목록·상세 API 일정 (사이드바만 존재)  
5. `icon`을 서버에서 줄지, 프론트가 `id`로 매핑할지  

---

## 9. 관련 프론트 파일 (빠른 링크)

| 용도 | 경로 |
|---|---|
| 화면 | `src/domains/ins/pages/InsDashboardPage.tsx` |
| 예측 API | `src/domains/ins/api/prediction.ts` |
| 특약(목업) | `src/domains/ins/api/tokkReview.ts` |
| 저장(목업) | `src/domains/ins/api/consultation.ts` |
| 타입 | `src/domains/ins/types/consulting.ts`, `prediction.ts` |
| 피처 정본 | `src/domains/ins/constants/insFeatures.ts` |
| 체크리스트 | `src/domains/ins/constants/checklistItems.ts` |
| 특약 목업 데이터 | `src/domains/ins/mocks/tokkReview.mock.ts` |

---

## 10. 우선순위 제안

| 순위 | 작업 |
|---|---|
| P0 | `POST /api/consultation` + DB 저장 (상담 이력의 핵심) |
| P1 | `POST /api/tokk-review` + 매칭 룰 (목업 제거) |
| P2 | 고객/상담 목록 조회 API (고객관리 메뉴 연동) |
| — | `predict-ins`는 이미 연동됨 — 계약 변경 시에만 프론트 공유 |
