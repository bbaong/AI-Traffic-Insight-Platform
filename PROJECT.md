---

# 1. 프로젝트 기획

> 
> 
> 
> 💡 **핵심 비전**
> 대구광역시 교통사고 공공데이터를 기반으로 **지자체·보험사 각각에 특화된 2개의 AI 모델**(GovGuard / InsureGuard) 을 구축하고, 이를 하나의 **통합 플랫폼**(대시보드 + 참고 PDF) 으로 제공하여 데이터 기반 의사결정을 지원합니다.
> 

### 산출물 (의사결정 참고)

| 역할 | 화면 | 참고 PDF |
| --- | --- | --- |
| 지자체 (`ROLE_A`) | 구·군 예측·지도·우선점검 | 행정 참고 PDF (`gov-report-pdf`) |
| 보험 (`ROLE_B`) | 상담 분석·특약·고객 이력 | 상담 참고 PDF (`insurance/report-pdf`) |

> PDF는 **자동 확정이 아니라** 화면 분석과 같은 모델·룰 경로로 만든 **참고 문서**이다. DB에 PDF 파일을 쌓지 않고, 요청 시 AI가 생성한다.
> 

## 경쟁·유사 서비스 분석

AI Traffic Insight와 완전히 동일하게 **지자체 교통안전 분석과 보험사 상담 지원을 하나의 플랫폼에서 제공하는 국내 서비스는 확인하기 어려움.**

따라서 서비스의 핵심 기능을 기준으로 다음 3개 서비스를 비교 대상으로 선정

- **TAAS 교통사고분석시스템** → 교통사고 데이터·지역 분석 관점
- **K-Safer** → AI 기반 교통사고 위험 예측·예방 관점
- **보험다모아** → 자동차보험 조건·담보 및 특약 정보 제공 관점

## 🎯 프로젝트 목표

| 대상 | AI 활용 목적 |
| --- | --- |
| 🏛️ **GovGuard**지자체 | 구·군별 **향후 사고 규모·중대사고율** 예측 및 다발지역 조회 → **우선점검·행정 참고** |
| 🛡️ **InsureGuard**보험사 | 고객 조건(지역·연령·성별·차종)별 **프로파일 위험도·경중·담보 참고** → **상담·인수 참고 의사결정 지원** |

### 🔑 핵심 구조

```
대구시 교통사고 공공데이터
            ↓
    ┌───────┴───────┐
    ↓               ↓
 GovGuard AI     InsureGuard AI
 (지역×시계열)    (고객 프로파일)
    ↓               ↓
사고건수·중대율    위험점수·경중·담보
    └───────┬───────┘
            ↓
   통합 플랫폼 (역할별 대시보드)
            ↓
      화면 분석 + 참고 PDF
```

---

# **2. 데이터 수집 (공공데이터)**

| **데이터** | **출처·성격** | **용도** |
| --- | --- | --- |
| `사고분석_2016~2025_원본합본.csv` | 대구 교통사고 사고분석 합본 (TAAS 계열) | Ins/Gov **학습 공용** |
| 지자체별 교통사고 다발지역 OpenAPI | **한국도로교통공단(KOROAD/TAAS)** | Gov 지도 핫스팟 (`/hotspots`) |

Ins 학습에 쓰는 주요 필드 예: `시군구`, 가해운전자 `성별/연령대/차종`, `사고내용`, `법규위반`, 사상자수, `발생년월` 등.

Gov는 동일 사고 CSV를 **지역×분기 패널**로 집계.

---

# **3. 데이터 분석·전처리 (주요 이슈)**

> 💡 **한 줄 요약**
> 
> 
> 원천 사고 CSV를 학습 가능한 형태로 정리하고, **해석 오류(개인 사고 예측처럼 보이기)** 와 **소지역 과대추정**을 설계 단계부터 막는 것이 핵심이다.
> 

### **3-1. 공통 클리닝 (Ins 학습 기준)**

> ℹ️ Gov는 동일 원천 CSV를 쓰지만, 이후 **지역×분기 패널 집계** 경로가 별도이다. 아래 표는 Ins `ins_v1_0_3` 클리닝이다.
> 

| **단계** | **처리** | **목적** |
| --- | --- | --- |
| ① | `UTF-8-SIG` 로드 | BOM·한글 깨짐 방지 |
| ② | `시군구` → 지역 정규화 (`대구광역시` 접두 제거) | 구·군 키 통일 |
| ③ | 결측·중복 제거 | 노이즈·중복 학습 방지 |
| ④ | 입력 피처의 `기타불명` 제외 | 해석 불가 값 제거 |
| ⑤ | 정의된 `사고내용`만 유지 | 심각도(가중) 정의와 정합 |
| ⑥ | `법규위반` 비어 있지 않은 행만 | 법규 Top-k 학습 조건 |

원천 CSV

→ 인코딩·지역 정규화

→ 결측·중복·불명 제거

→ 사고내용·법규위반 필터

→ 학습용 클린 데이터

### **3-2. 주요 이슈 및 대응**

| **#** | **구분** | **이슈** | **현상 / 리스크** | **대응** |
| --- | --- | --- | --- | --- |
| 1 | Ins | 타깃: 프로파일 점수 vs 개별 사고 | 개별 EPDO 실험에서 **R² 음수** | “개인 사고 예측”이 아니라 **프로파일 위험 점수 재현**으로 해석 (`validation_v1_0_3.md`) |
| 2 | Ins | 피처: 환경 피처 | `주야`·`노면상태` 등이 UI와 불일치 | 상담 입력 **4개**(구군·연령·성별·차종)에 맞춰 **의도적 제외** |
| 3 | Gov | 예측: 소지역 과대추정 | 군위군 등에서 예측 급등(점프) | **share × 시전체** + **`last × 2` cap** (`gov_v1_0_4`) |
| 4 | 공통 | 통계 안정성: 소표본 불안정 | 소수 표본에서 심각도·비율 요동 | **Empirical Bayes 스무딩** 
(Ins prior≈40 / Gov `EB_ALPHA=40`) |
| 5 | 운영 | 배포: 모델 산출물 분리 | `models/*.pkl` 없으면 서빙 불가 | API **503** — 학습(CSV)·서빙(pkl) 단계 분리 |

---

# **4. 모델 선정·학습·평가지표**

### **4-1. InsureGuard v1.0.3(보험)**

보험 상담용 **프로파일 위험 스코어카드 + 설명·담보 힌트**.

| 항목 | 내용 |
| --- | --- |
| **질문** | “이 고객 조건(지역·연령·성별·차종)의 **프로파일 위험**은?” |
| **입력** | 구군, 연령대, 성별, 차종 (+ 교차 피처) |
| **메인 출력** | 위험점수 0–100, 등급(LOW~CRITICAL) |
| **보조 출력** | 법규위반 Top3 확률, 사고경중 비율, 표준 6대 담보 추천 |
| **알고리즘** | 점수: `HistGradientBoostingRegressor` / 법규·경중: `RandomForestClassifier`×2 |
| **학습 지표 (pkl)** | **회귀:** R² 0.985, RMSE 2.43, MAE 1.51
**분류: 법규** Acc 54.6%
**분류: 경중** Acc 68.0% |
| **타깃 특징** | 개별 사고가 아니라 **동일 조건 집단의 기대 위험**(심각도 70% + 빈도 30%) |
| **전처리 특징** | EB식 스무딩, 환경변수(주야·노면) **의도적 제외**(상담 입력과 맞춤) |
| **쓰는 곳** | 상담 대시보드, 담보 가이드, 상담 참고 PDF |
| **한계** | “이 사람이 사고 낼 확률” 예측이 아님. 법규/경중 Acc는 보조 수준 |

### **4-2. GovGuard v1.0.4(지자체)**

지자체용 **지역 다음 분기 사고 규모 예측기**(점유율 배분 + 급등 방지).

| **항목** | **내용** |
| --- | --- |
| **질문** | “다음 분기에 **어느 구·군에서 사고가 얼마나** 나올까?” |
| **입력** | 고객 프로파일 없음. 선택 필터만(`지역`, `as_of`, `freq`) |
| **학습 정보** | 지역×분기 시계열(lag/roll 등), pkl에 패널 포함 |
| **메인 출력** | 예측 사고건수 (지도·우선점검 규모) |
| **만드는 방식** | 점유율 예측 → **× 시 전체** → **직전 실적×2 이하로 캡** (B1) |
| **알고리즘** | 전부 `HistGradientBoostingRegressor` 
· **점유율(rate)** — 서빙 메인 
· **건수(count)** — 진단용(메인 미사용. 진단용)
· **중대사고율 / 경중 비중**(사망·중상·경상·부상신고) — 보조 |
| **평가 지표 (pkl·헤드별)** | · **점유율:** R² **0.935**, MAE ≈ **1.05%p**, Top-3 **0.917** 
· **건수(진단):** R² **0.866**, MAE **40.6**, Top-3 **0.917** 
· **중대율:** R² **0.400**, MAE ≈ **2.47%p** 
· **경중 비중:** R² ≈ **0.14~0.25** |
| **보조** | 중대사고율·경중 전처리(EB 스무딩 α=40), 다발지역은 **별도 KOROAD API** |
| **쓰는 곳** | Gov 지도, 우선점검 TOP, 행정 참고 PDF |
| **한계** | 소지역은 여전히 민감할 수 있어 캡으로 억제. 건수 “정확 예측”보다 **규모·순위 참고**
위 지표 = **각 회귀기 holdout**. 서비스 건수 경로(B1+`last×2`) 전체 KPI·B1 실험표(MAE 39 / MAPE 41% / R² 0.893)와 **동일하지 않음** |

학습 스크립트: `ai/scripts/ins_v1_0_3.py`, `ai/scripts/gov_v1_0_4.py`.

## 4-3. 둘의 대비

|  | Ins | Gov |
| --- | --- | --- |
| 단위 | 고객 **프로파일** | 구·군 **시계열** |
| 사용자가 넣는 것 | 조건 4개 | 필터(선택) |
| 핵심 숫자 | 위험점수·등급 | 예측 건수·중대율 |
| 설계 포인트 | UI 입력과 피처 정합 | 소지역 과대추정 완화(B1+캡) |
| 공통 | sklearn, 대구 사고 공공데이터, **의사결정 참고** (자동 확정 아님) |  |

---

# **5. 파이썬 백엔드 연동**

> AI: FastAPI (`ai/app/main.py`), 버전 문자열 **1.0.4**
> 
> 
> Body는 JSON (`Content-Type: application/json`). PDF만 바이너리. 모델 없으면 **503**.
> 

## 5-1. 건강 체크

| 메서드 | 경로 | Request | Response |
| --- | --- | --- | --- |
| `GET` | `/health` | 없음 | `{ "status": "ok" }` |

---

## 5-2. InsureGuard

| 메서드 | 경로 | Request (JSON) | Response |
| --- | --- | --- | --- |
| `POST` | `/predict` | **필수** `{ "구군", "연령대", "성별", "차종" }` | JSON — 아래 스키마 |
| `POST` | `/report/ins-pdf` | **필수** 위 4필드 + **선택** `고객명`, `작성자`, `memo` | `application/pdf` 바이너리 |
- **`POST /predict` Response 예시 구조**
    
    ```json
    {
      "버전": "1.0.3",
      "variant": "...",
      "예측등급": "LOW|MODERATE|HIGH|CRITICAL",
      "위험도": 0.0,
      "등급확률": { "법규위반명": 0.0 },
      "사고경중비율": { "사망사고": 0.0, "중상사고": 0.0, "경상사고": 0.0, "부상신고사고": 0.0 },
      "담보추천": [
        { "id": "...", "name": "...", "recommended": true, "script": "...", "reason": "..." }
      ]
    }
    ```
    

> `등급확률` = 법규위반 Top3 확률 dict · `담보추천` = 표준 6대 담보 객체 배열
> 

---

## 5-3. GovGuard

| 메서드 | 경로 | Request | Response |
| --- | --- | --- | --- |
| `POST` | `/predict/gov` | JSON **선택** `{ "지역"?, "as_of"?, "freq"? }` 
· `freq`: `"Q"`|`"H"` (기본 `"Q"`) 
· `지역` 없으면 **전 구·군** | **단건 `{}` 또는 `[{}, …]`** — 주요 키 아래 |
| `POST` | `/predict/gov/history` | JSON **필수** `지역` + **선택** `as_of`, `n_history`(1–12, 기본 3) | 아래 history 스키마 |
| `GET` | `/hotspots` | **Query** `year?`, `refresh`(bool, 기본 false), `include_polygon`(bool, 기본 false) | 아래 hotspot 스키마 |
| `POST` | `/report/gov-pdf` | JSON **필수** `지역` + **선택** `as_of`, `freq`, `작성자`, `기관` | `application/pdf` 바이너리 |

**`POST /predict/gov` 주요 필드 (요약)**

| 필드 | 의미 |
| --- | --- |
| `예측사고건수` | 캡 적용 후 서빙 건수 |
| `예측사고율` / `예측사고율_퍼센트` | 점유율 |
| `예측중대사고율` / `_퍼센트` | 중대율 |
| `예측사고경중_퍼센트` | 경중 비중 |
| `예측사고건수_share`, `건수캡_적용`, `참고_기준분기사고건수` 등 | cap·진단 |
- **`POST /predict/gov/history` Response**
    
    ```json
    {
      "지역": "달서구",
      "history": [
        {
          "분기": "2025Q1",
          "사고건수": 0,
          "중대사고율_퍼센트": 0.0,
          "경중_건수": {},
          "경중_퍼센트": {},
          "kind": "actual",
          "기준분기": null
        }
      ],
      "forecast": { "분기": "...", "kind": "forecast", "...": "..." }
    }
    ```
    
- **`GET /hotspots` Response**
    
    ```json
    {
      "year": 2025119,
      "searchYearCd": "...",
      "sido": "...",
      "source": "...",
      "fetched_at": "...",
      "count": 0,
      "points": [
        { "lat": 0.0, "lon": 0.0, "name": "...", "count": 0, "fatal": 0, "severe": 0, "year": 0 }
      ],
      "partial_errors": []
    }
    ```
    
    > `year`는 캘린더 연도가 아니라 KOROAD `searchYearCd` 형식일 수 있음.
    > 

## 5-4. PDF 생성 (Ins / Gov 공통 방식)

Jinja2 HTML 템플릿 → Playwright Chromium 렌더 → `application/pdf` 바이너리 반환.

(`playwright` pip 패키지와 별도로 `playwright install chromium` 필요. 모델 pkl 없으면 예측·PDF 모두 **503**.)

### 왜 AI(FastAPI)에서 만드는가

- 화면 예측(`/predict`, `/predict/gov`)과 **동일 추론·룰 경로**를 타게 하기 위함.
- Backend는 Express에서 AI로 **프록시**만 한다 (`AI_SERVICE_URL`).
- PDF 파일은 DB에 저장하지 않는다. (상담 본문은 `consultations/save`로만 기록)

### Ins — `POST /report/ins-pdf`

| 구분 | 내용 |
| --- | --- |
| **필수** | `구군`, `연령대`, `성별`, `차종` |
| **선택** | `고객명`, `작성자`, `memo` |
| **내부** | `predict_from_input`으로 **재예측** → 위험점수·등급·담보 등을 템플릿에 삽입 |
| **응답** | `application/pdf` (`ins-consult-report.pdf`) |

> 프론트 미리보기(draft)의 점수/담보를 그대로 믿지 않고, PDF 생성 시 AI가 **다시 계산**한다.
> 

### Gov — `POST /report/gov-pdf`

| 구분 | 내용 |
| --- | --- |
| **필수** | `지역` |
| **선택** | `as_of`, `freq`, `작성자`, `기관`, (Backend 경유 시) 대시보드 snapshot 섹션 |
| **내부** | 대시보드에서 넘긴 스냅샷을 우선 사용하거나, 없으면 예측 재실행 후 행정 참고 HTML→PDF |
| **응답** | `application/pdf` |

### Backend 프록시 대응

| AI | Backend |
| --- | --- |
| `POST /report/ins-pdf` | `POST /api/insurance/report-pdf` |
| `POST /report/gov-pdf` | `POST /api/prediction/gov-report-pdf` |

---

# **6. 서비스를 위한 DB·테이블**

**MySQL + Prisma** (`backend/prisma/schema.prisma`)

| **영역** | **테이블** | **역할** |
| --- | --- | --- |
| 계정 | `users`, `departments`, `user_login_logs` | 가입·역할(`ROLE_A`/`ROLE_B`)·로그인 |
| 지역·사고 마스터 | `districts`, `accident_records`, `accident_condition_stats`, `district_monthly_trend`, `district_risk_scores` | 구·군·사고·집계·우선순위 캐시 |
| 보험 상담 | `customers`, `customer_risk_profiles`, `consultations`, `checklist_items`, `consultation_checklist_answers`, `consultation_discount_riders` | 고객·프로필·상담·체크리스트·특약 |
| 보조 | `cohort_benchmark_stats`, `risk_factor_contributions`, `reports` | 코호트 벤치마크·요인·리포트 메타 |
- **운행상 포인트:**
    - 실시간 예측은 DB가 아니라 AI 호출이 본체. 문서상 의도된 **주요 DB write**는 상담 `POST /api/consultations/save` 쪽.
    - **PDF:** 바이너리 파일을 MySQL에 저장하지 않는다. `reports` 테이블은 스키마상 리포트 메타용이며, 실제 상담 참고 PDF는 **요청 시 AI 생성·다운로드**이다. 상담 내용의 영속화는 `consultations`(+ 프로필·체크리스트·특약)가 담당한다.

---

# **7. 백엔드 REST API**

Express `:5000`, AI는 `AI_SERVICE_URL`로 프록시.

| Prefix | 주요 API |
| --- | --- |
| `/api/user` | 회원가입(`POST /create`), 
로그인(`POST /login`), 
아이디체크(`POST /idCheck`), 
부서목록(`GET /departments`), 
회원목록(`GET /all`), 
비밀번호 검증(`POST /verify-password`), 
비밀번호 변경(`PATCH /password`), 
이메일 변경(`PATCH /email`) |
| `/api/prediction` | `POST /predict-ins` → AI `/predict`
`POST /predict-gov` → AI `/predict/gov`
`POST /predict-gov-history` → AI `/predict/gov/history`
`GET /predict-gov-hotspots` → AI `/hotspots`
`POST /gov-report-pdf` → AI `/report/gov-pdf` (`application/pdf`)
`GET /gov-forecasts` |
| `/api/gov` | `GET /priority-top`, 
`GET /comparison/:districtId`, 
`GET /suggestions/:districtId`, 
`GET /trend/:districtId` |
| `/api/insurance` | `POST /analyze` → AI `/predict` (DB 없음)
`POST /report-pdf` → AI `/report/ins-pdf` (`application/pdf`) |
| `/api/discount-riders` | `POST /evaluate` (특약 판정, DB 없음) |
| `/api/consultations` | `POST /save` (AI·특약 재계산 후 DB 저장), 
`GET /:id/report` |
| `/api/customers` | `GET /` (목록), 
`GET /:id/consultations` (상담 이력), 
`PATCH /:id/hide` (Soft Delete 숨김) |

일반 JSON은 `{ success, data }` 형태가 많고, PDF는 바이너리 스트림.

(`analytics.route`는 파일은 있으나 `index`에 마운트되지 않은 상태.)

---

# **8. 주요 프론트–백엔드 연동**

> 💡 **한 줄**
> 
> 
> 화면은 Backend만 보고, Backend가 AI·DB를 중계한다.
> 

```
Frontend (:5173)  →  Backend (:5000)  →  AI (:8000) / MySQL
                 VITE_API_BASE_URL
```

---

## 8-1. 공통 · 역할

| 항목 | 내용 |
| --- | --- |
| API 진입 | `VITE_API_BASE_URL` → Express Backend |
| `ROLE_A` 지자체 | GovGuard · `/dashboard/gov` |
| `ROLE_B` 보험 | InsureGuard · `/dashboard/insurance` |

---

## 8-2. 인증

```
아이디 중복 확인
    → (지자체) 부서 선택
    → POST /api/user/create
    → POST /api/user/login
    → 역할별 대시보드
```

| 단계 | API |
| --- | --- |
| 가입 | `POST /api/user/create` |
| 로그인 | `POST /api/user/login` |

---

## 8-3. 지자체 대시보드 (`ROLE_A`)

| Step | 시점 | API | 화면 |
| --- | --- | --- | --- |
| **①** | 로드 | `POST .../predict-gov` | 구·군 예측 → **지도 색상** |
| **②** | 로드 | `GET .../predict-gov-hotspots` | Kakao **다발지역 원** (클라이언트 캐시 ~7일) |
| **③** | 구·군 선택 | `POST .../predict-gov-history` | 경중 등 **시계열** |
| **④** | 리포트 | `POST .../gov-report-pdf` | 행정 참고 **PDF** |

Gov PDF는 대시보드에서 선택한 구·군·스냅샷을 기준으로 `POST /api/prediction/gov-report-pdf`를 호출한다.

```
대시보드 진입
    ├─ 전체 구·군 예측 → 지도
    └─ 핫스팟 조회 → 원형 표시
구·군 클릭 → 이력 차트
리포트 → 행정 PDF
```

---

## 8-4. 보험 상담 흐름 (`ROLE_B`)

| Step | 사용자 행동 | Frontend → Backend | Backend → |
| --- | --- | --- | --- |
| **①** | 분석하기 | `POST /api/prediction/predict-ins` | AI `POST /predict` (DB 없음) |
| **②** | 특약 검토 | `POST /api/discount-riders/evaluate` | 서버 룰 판정 (DB 없음) |
| **③** | 저장 | `POST /api/consultations/save` | AI·특약 **재실행** 후 **DB 저장** |
| **④a** | 리포트 미리보기 | draft → `/common/reports` | **재계산 없음** (화면 결과 draft) |
| **④b** | PDF 생성·다운로드 | `POST /api/insurance/report-pdf` | AI `POST /report/ins-pdf` (**재예측** 후 PDF) |

```
대시보드
  ① 분석하기          → 화면용 예측
  ② 특약 평가         → 화면용 특약
  ③ 상담 저장         → 서버가 AI·특약 재계산 → DB
       ↓ (저장 성공 모달)
  ④a 리포트 미리보기  → FE draft (①·② 화면 값, DB/저장 응답 미사용)
  ④b PDF 생성·다운로드 → AI가 프로필 기준으로 다시 예측해 PDF 생성
```

> **재계산이 있는 구간:** 저장(③), PDF(④b)
> 
> 
> **재계산이 없는 구간:** 분석·특약 화면 표시(①·②), 리포트 미리보기(④a)
> 

---

### 8-4 보충 (UI · 데이터 정합)

1. **UI는 2스텝** — Step1 분석 → Step2 체크리스트·특약·저장. 리포트는 저장 성공 모달에서 `/common/reports`로 이동.
2. **저장 시 화면 예측 미신뢰** — FE는 `prediction`/`tokkResults`를 save body에 넣지 않음. 서버가 `profile`·`checklist`로 AI·특약 재계산 후 DB 기록.
3. **미리보기 ≠ DB ≠ PDF** — 미리보기는 FE draft, DB는 save 재계산 값, PDF는 AI 재예측.
4. **별 진입점** — 고객관리(저장된 상담) → 동일 `/common/reports` → PDF.

---

## 8-5. 한눈에 보기

|  | 보험 | 지자체 |
| --- | --- | --- |
| 핵심 API | `predict-ins` · 특약 · 상담 저장 | `predict-gov` · hotspots · history |
| 저장 | `consultations/save` → DB | 예측은 AI 중계 중심 |
| PDF | `/api/insurance/report-pdf` | `/api/prediction/gov-report-pdf` |
| 지도 | — | Kakao + 핫스팟 캐시 |

---

### **레포만으로는 약해 추가 작성이 필요한 칸**

- 1번: 시장 규모·경쟁사·정량 KPI·비즈니스 모델 (코드에 없음)
- 2번: 공공데이터 **포털 상세 URL·이용허락·수집 일자** (파일명·용도만 명확)
- 4번: 발표용 **최종 표 수치**는 팀 실험 노트북과 pkl 메타를 한 번 더 맞추는 것이 안전
- **4번(보충): sklearn 모델 비교·교체 여부** — `ins_sklearn_model_compare` / `gov_sklearn_rate_compare`·B1 구조 비교 결과와 **「수치 1위여도 현행 유지」** 결론이 본문에 없음. 선정 적합성 슬라이드로 1절 추가 권장
- **6번(보충): 테이블 사용 여부 구분** — `cohort_benchmark_stats`, `risk_factor_contributions` 등은 **설계·예약(미연동)** 이고, 실시간 예측은 AI·상담 저장(`consultations/save`)이 본체임을 명시할 것
- **8번(보충, 선택): 고객관리·인증 방식** — `/api/customers`·고객 이력 UI, 로그인 토큰(JWT 등) 흐름은 현재 절에 없음. 데모 범위에 포함되면 한 줄 추가

**바로 붙여 넣을 초안**

**4번 — 모델 비교·미교체**

> sklearn only로 Ins(HGBR/RF/Ridge·분류)와 Gov(rate HGBR/RF/Ridge, B1+캡 고정)를 비교했다. Ins는 RF가 MAE 우세하나 HGBR도 등급·참고용으로 충분하고, Gov는 Top-3 동일·캡 영향으로 Ridge 수치가 앞서도 **현행 HGBR 유지**. 교체보다 **트리 적합성(Ins)** · **B1 파이프라인(Gov)** 을 선정 근거로 둔다.
> 

**6번 — DB 실사용**

> 표의 지역·코호트·리포트 메타 일부는 스키마 준비 단계이며, **코호트 벤치마크는 현재 UI/API 미연동**. 운행 중 write의 중심은 보험 상담 저장이다.
> 

이 정도만 추가해도 “문서에 있는 것처럼 다 쓰는 기능” 오해를 줄일 수 있습니다.