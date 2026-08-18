# AI Traffic Insight Platform — AI 모듈

대구 교통사고 데이터 기반 ML 서빙 모듈입니다.  
**InsureGuard**(보험)와 **GovGuard**(지자체) 두 계열을 FastAPI로 제공합니다.

## 빠른 시작 (5분)

아래만 실행하면 로컬에서 AI 예측 서버를 확인할 수 있습니다.  
(참고 PDF는 **Backend**에서 생성합니다. → [backend/README.md](../backend/README.md))

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # Windows
# source .venv/bin/activate           # macOS/Linux

# Windows(cp949)에서 UTF-8 오류가 나면 먼저:
#   $env:PYTHONUTF8 = "1"
python -m pip install -r requirements.txt

copy .env.example .env                # Windows — KOROAD_AUTH_KEY 등 채우기
# cp .env.example .env                # macOS/Linux

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

확인:
- Health: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`

`GET /hotspots`는 `.env`의 `KOROAD_AUTH_KEY`가 필요합니다. Ins/Gov 예측은 pkl만 있으면 됩니다.

## 시스템 연결

```text
[Frontend]
  POST /api/prediction/predict-ins  →  보험 대시보드
  POST /api/prediction/predict-gov  →  지자체 대시보드
  POST /api/prediction/predict-gov-history → 분기 history
  GET  /api/prediction/predict-gov-hotspots → 공식 다발지역 원
        │
        ▼
[Backend]  (기본 http://localhost:5000)
  AI_SERVICE_URL 환경변수 (기본 http://localhost:8000)
        │
        ▼
[AI]  python -m uvicorn app.main:app  (http://localhost:8000)
  POST /predict             →  InsureGuard v1.0.4
  POST /predict/gov         →  GovGuard v1.0.5
  POST /predict/gov/history →  GovGuard 분기 history
  GET  /hotspots            →  대구 공식 사고다발 TOP3 (캐시)
  GET  /health
```

| 역할 | 현재 서빙 모델 | 학습 스크립트 | 명세 |
|------|----------------|---------------|------|
| 보험 | `models/ins_model_v1.0.4.pkl` | `scripts/ins_v1_0_4.py` | `docs/ins_v1_0_4_feature_spec.md` |
| 지자체 | `models/gov_model_v1.0.5.pkl` | `scripts/gov_v1_0_5.py` | `docs/gov_v1_0_5_feature_spec.md` |

이전 버전 pkl(`ins_model_v1.0.2`~`1.0.3`, `gov_model_v1.0.0`~`1.0.4`, `traffic_accident_model.pkl`)은 보존·비교용입니다. API는 위 두 파일만 로드합니다.

---

## 디렉터리 구조

```text
ai/
├── app/                          # FastAPI
│   ├── main.py                   # 엔드포인트
│   └── schemas.py                # 요청·응답 스키마
├── src/
│   ├── ins_inference.py          # InsureGuard 로드·추론 (v1.0.4)
│   ├── ins_coverage_rules.py     # 보험 담보 추천 규칙
│   ├── gov_inference.py          # GovGuard 로드·추론 (v1.0.5)
│   ├── gov_hotspots.py           # 공식 다발지역 REST + 파일 캐시
│   ├── ins_package_codec.py      # Ins 패키지 호환 헬퍼 (API 미사용)
│   └── preprocess.py             # 레거시 인구 join (API 미사용)
├── scripts/                      # 현재 학습·검증·ETL·배치
│   ├── ins_v1_0_4.py             # 보험 학습
│   ├── gov_v1_0_5.py             # 지자체 학습 (서빙 시에도 로드)
│   ├── gov_batch_forecast.py     # 구·군 예측 → MySQL
│   ├── gov_batch_forecast_run.sh # 위 배치 cron 래퍼
│   ├── etl_accident_condition_type.py   # 사고유형 실적 ETL
│   ├── etl_district_monthly_trend.py    # 월별 추세 실적 ETL
│   ├── ins_validate_v1_0_4.py
│   ├── ins_compare_sklearn.py / gov_compare_rate_sklearn.py
│   ├── measure_latency.py / measure_latency_e2e.py
│   ├── ins_plot_validate_design.py
│   ├── gov_compare_b1_b2_v1_0_4.py # B1 vs B2 산식 선정 기록
│   ├── ins_smoke.py              # InsureGuard 로컬 스모크
│   └── archive/                  # 이전 버전 스크립트
├── models/                       # *.pkl (Git 제외, 학습 후 생성)
├── data/                         # Git 제외
│   ├── raw/                      # 원천 CSV (학습·ETL)
│   └── cache/hotspots/           # GET /hotspots 파일 캐시
├── docs/                         # 현재 명세·검증 (목차: docs/README.md)
│   ├── archive/                  # 이전 명세·실험 기록
│   └── figures/                  # 버전·실험 차트
├── notebooks/                    # 탐색용 Jupyter
├── Dockerfile                    # app/ + src/ + models/ 복사
├── .env.example                  # KOROAD·배치 환경변수 예시
└── requirements.txt
```

문서 목차·현재/보관 구분은 [`docs/README.md`](docs/README.md)를 보세요.  
이전 학습 스크립트는 [`scripts/archive/README.md`](scripts/archive/README.md)입니다.

---

## 설치 · 실행 (상세)

- Python **3.11+**, 작업 디렉터리: `AI-Traffic-Insight-Platform/ai`

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # Windows
# source .venv/bin/activate           # macOS/Linux

# Windows(cp949)에서 requirements 주석 UTF-8 오류가 나면:
#   $env:PYTHONUTF8 = "1"
python -m pip install -r requirements.txt

copy .env.example .env                # Windows
# cp .env.example .env                # macOS/Linux
```

상담·행정 **참고 PDF**는 AI가 아닌 Backend(Express + Playwright + EJS)에서 생성합니다.  
Chromium 설치는 [backend/README.md](../backend/README.md)를 보세요.

### 원천 데이터

`data/raw/`에 배치 (Git 미포함) — **학습·재학습·ETL용**:

- `사고분석_2016~2025_원본합본.csv` — Insure / Gov 학습 및 ETL 공용
- (선택) `대구_구군_연령별_주민등록인구_2020_2025.csv` — `src/preprocess.py` 전처리용. 현재 API 서빙에는 쓰이지 않습니다.

`data/processed/`는 preprocess가 만들 수 있는 출력 경로입니다. 현재 서빙에는 필요 없습니다.

**GovGuard 서빙**에는 CSV가 필요 없습니다. 필요 파일:

- `models/gov_model_v1.0.5.pkl`
- `scripts/gov_v1_0_5.py` (자급자족 — `gov_v1_0_4.py` 런타임 의존 없음)

### 모델 학습 (pkl 생성)

```bash
# 보험 (심각도 70% + 빈도 30%, 군위 2016~ 포함) → models/ins_model_v1.0.4.pkl
python scripts/ins_v1_0_4.py

# 지자체 (share×시전체 + last×2 캡, 군위 2016~ 포함) → models/gov_model_v1.0.5.pkl
python scripts/gov_v1_0_5.py
```

`models/*.pkl`이 없으면 API가 **503**을 반환합니다.

## 운영 배치 (선택)

### Gov 예측 배치 (DB 스냅샷)

지도용 구·군 예측을 MySQL `gov_forecast_runs` / `gov_forecast_districts`에 적재합니다.  
(`requirements.txt`의 **PyMySQL** 필요. 테이블은 Backend DB에 DDL로 미리 생성.)

스크립트는 **pkl 추론 후 DB에 직접 INSERT**합니다. Express Backend를 거치지 않습니다.

```bash
# DATABASE_URL=mysql://user:pass@host:3306/dbname
# 미설정 시(로컬 전용) backend/.env 의 DATABASE_URL 을 읽습니다.
# AI·DB 서버가 다르면 AI 쪽에서 remote DB URL을 환경변수로 넣으세요.
python scripts/gov_batch_forecast.py
# 또는 로그 래퍼:
# bash scripts/gov_batch_forecast_run.sh
```

선택 환경 변수: `GOV_AS_OF`(예: `2025Q3`), `GOV_FREQ`(`Q`|`H`), `GOV_SCOPE`(기본 `DAEGU`).

#### 사고유형 실적 ETL (`accident_condition_stats`)

지역비교 A안: CSV → `ACCIDENT_TYPE` (`차대차` / `차대사람` / `차량단독`). gov pkl 불필요.

```bash
python scripts/etl_accident_condition_type.py
# 미리보기: ETL_DRY_RUN=1 python scripts/etl_accident_condition_type.py
# 기간 지정: ETL_PERIOD_START=2025-01-01 ETL_PERIOD_END=2025-12-31
```

기본 기간은 CSV 최신 연도(1/1~12/31). `DATABASE_URL`은 forecast 배치와 동일.

#### 월별 추세 실적 ETL (`district_monthly_trend`)

지역비교 「분기별 사고 추세」 실선용. CSV → 구×월 건수. gov pkl 불필요.

```bash
python scripts/etl_district_monthly_trend.py
# 미리보기: ETL_DRY_RUN=1 python scripts/etl_district_monthly_trend.py
# 전체 기간: ETL_ALL=1 python scripts/etl_district_monthly_trend.py
# 연수: ETL_YEARS_BACK=5 python scripts/etl_district_monthly_trend.py
# 기간: ETL_PERIOD_START=2023-01-01 ETL_PERIOD_END=2025-12-31
```

기본 기간은 CSV 최신 연도 기준 **직전 3개 연도**. 적재 후 `GET /api/gov/region-compare`의 `trend.history`가 채워집니다.

지역비교 점수·역할 분담은 새 pkl 없이 Backend가 담당합니다. 결정 기록: [`docs/gov_region_compare_plan.md`](docs/gov_region_compare_plan.md).

#### 배치 스케줄 (AI ≠ DB 서버 — 권장 운영)

개발자 PC에 Windows 작업 스케줄러를 **등록하지 않습니다.**  
cron / systemd timer는 **AI 서버**(pkl·배치 스크립트가 있는 곳)에만 둡니다.

| 구성 | 역할 |
|------|------|
| **AI 서버** | 추론 + `gov_batch_forecast.py` + **스케줄 등록** |
| **MySQL** (별도 호스트) | `gov_forecast_*` 적재. AI 출구 IP를 Trusted sources에 허용 |
| **Backend** | `GET /api/prediction/gov-forecasts` 조회만. 배치 실행에 불필요 |

```text
[ cron on AI server ]
        │  gov_batch_forecast.py (로컬 pkl)
        ▼
[ MySQL ]  ◄── DATABASE_URL (AI → DB 네트워크 허용)
        ▲
[ Backend ] GET gov-forecasts
```

**cron 예시** (AI 서버, 매주 월요일 03:00 `Asia/Seoul` — 경로·venv·URL은 배포에 맞게 수정):

```cron
CRON_TZ=Asia/Seoul
0 3 * * 1 cd /opt/ai-traffic/ai && . .venv/bin/activate && \
  export DATABASE_URL='mysql://USER:PASS@DB_HOST:3306/DBNAME' \
  GOV_FREQ=Q GOV_SCOPE=DAEGU && \
  bash scripts/gov_batch_forecast_run.sh
```

- 주 1회는 파이프라인 생존·데모용. 동일 `as_of`면 수치가 거의 같고 run 행만 늘 수 있음.
- 공표 주기에 맞추려면 분기 트리거로 바꿔도 됨.
- API는 최신 `SUCCEEDED` run만 읽으므로, 실패해도 직전 성공 스냅샷이 유지됨.
- Backend 서버·Managed DB 호스트에 cron을 두지 말 것 (추론 없음 / cron 불가).

분리 배포 체크: AI→MySQL 접속, `districts` 시드, AI에만 cron, 갱신 후 `GET .../gov-forecasts`로 `finished_at` 확인.

## AI 서버 실행

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Windows에서 `uvicorn`이 Device Guard로 차단되면 `python -m uvicorn`을 사용하세요.

- 서버: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

Backend는 `AI_SERVICE_URL=http://localhost:8000` (기본값)으로 이 서버를 호출합니다.

---

## 모델 개요

### InsureGuard (보험) — API `POST /predict`

| 항목 | 내용 |
|------|------|
| 입력 (4) | 구군, 연령대, 성별, 차종 |
| 출력 | 위험도(0~100), 등급, 법규위반 Top3, 사고경중 비율, **담보추천** |
| v1.0.4 | v1.0.3 산식 + **군위 2016.1~2023.6** 포함 |
| v1.0.3 | 프로파일 **심각도 + 빈도** 블렌드 (`scripts/archive/ins_v1_0_3.py`) |
| v1.0.2 | 심각도만 (`scripts/archive/ins_v1_0_2.py`) |

담보추천은 `src/ins_coverage_rules.py`가 등급·연령·법규위반 확률로 표준약관 6대 담보를 규칙 기반으로 붙입니다.

### GovGuard (지자체) — API `POST /predict/gov`

| 항목 | 내용 |
|------|------|
| 사용자 입력 | **없음** (패널 시계열로 예측) |
| 메인 출력 | 다음 분기 **예상 사고건수** (지도·대응 인력) |
| 보조 | 점유율, EB 중대율·경중, 반기(`freq=H`) |
| 정렬 | 기본적으로 예상 건수 내림차순 |

---

## API

### 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| POST | `/predict` | InsureGuard 위험도 + 담보추천 |
| POST | `/predict/gov` | GovGuard 지역 예측 |
| POST | `/predict/gov/history` | GovGuard 분기 history |
| GET | `/hotspots` | 대구 공식 사고다발 TOP3 (지도 원) |

> PDF: `POST /report/ins-pdf`, `POST /report/gov-pdf` 는 **제거됨**. Backend `POST /api/insurance/report-pdf`, `POST /api/prediction/gov-report-pdf` 사용.

### `POST /predict` 요청

```json
{
  "구군": "달서구",
  "연령대": "51-60세",
  "성별": "남",
  "차종": "승용"
}
```

응답 예 (필드명 기준):

```json
{
  "버전": "InsureGuard AI v1.0.4",
  "variant": "ins_v1.0.4",
  "예측등급": "MODERATE",
  "위험도": 33.8,
  "등급확률": { "…법규위반 Top3…" },
  "사고경중비율": {
    "사망사고": 0.01,
    "중상사고": 0.22,
    "경상사고": 0.65,
    "부상신고사고": 0.12
  },
  "담보추천": [
    {
      "id": "대인배상 I",
      "name": "대인배상 I",
      "recommended": true,
      "script": "…",
      "reason": "…"
    }
  ]
}
```

### `POST /predict/gov` 요청

```json
{
  "지역": null,
  "as_of": null,
  "freq": "Q"
}
```

| 필드 | 설명 |
|------|------|
| `지역` | 구·군명. `null`이면 전 지역 목록 |
| `as_of` | 기준 분기/반기 (예: `"2025Q2"`). `null`이면 최신 |
| `freq` | `"Q"` 분기(기본) / `"H"` 반기(중대 보조) |

분기 응답에 포함되는 주요 필드: `예측사고건수`, `예측사고율_퍼센트`, `예측중대사고율_퍼센트`, `중대사고등급`, `예측사고경중_퍼센트` 등.

### `POST /predict/gov/history`

한 구·군의 분기 실적 + 다음 분기 예측입니다.

```json
{
  "지역": "달서구",
  "as_of": null,
  "n_history": 3
}
```

### `GET /hotspots` (공식 다발지역)

도로교통공단 OpenAPI「지자체별 교통사고 다발지역」을 서버에서 조회·캐시합니다.  
키: `ai/.env` 의 `KOROAD_AUTH_KEY` (프론트에 키를 두지 않음).  
`year` 는 캘린더 연도가 아니라 **searchYearCd**(예: `2025119`)입니다.

```bash
# AI 직접
curl "http://localhost:8000/hotspots?year=2025119&refresh=true"

# Backend 경유
curl "http://localhost:5000/api/prediction/predict-gov-hotspots?year=2025119"
```

| 쿼리 | 설명 |
|------|------|
| `year` | `searchYearCd` (예: 2025119). 없으면 `HOTSPOT_DEFAULT_YEAR` |
| `refresh` | `true`면 캐시 무시 |
| `include_polygon` | `true`면 `geom_json` 포함 |

응답 `points[]`: `lat`, `lon`, `name`, `count`, `fatal`, `severe`, `지역` …  
캐시:
- AI 파일: `data/cache/hotspots/` (TTL 기본 **7일**, `HOTSPOT_CACHE_TTL_HOURS`)
- 프론트: `sessionStorage` `gov:hotspots` (**7일** 이내면 Backend/AI 미호출)

### Backend 경유 (프론트)

| Frontend | Backend | AI |
|----------|---------|-----|
| `POST …/api/prediction/predict-ins` | `predictIns` | `POST /predict` |
| `POST …/api/prediction/predict-gov` | `predictGov` | `POST /predict/gov` |
| `GET  …/api/prediction/predict-gov-hotspots` | `predictGovHotspots` | `GET /hotspots` |
| `POST …/api/insurance/report-pdf` | Backend Playwright PDF (draft) | — |
| `POST …/api/prediction/gov-report-pdf` | Backend Playwright PDF (snapshot) | — |
| Frontend 지도 원 | `GovDashboardPage` → `MapCard` `hotspots` | `kakao.maps.Circle` |

---

## 자주 쓰는 명령

```bash
# 보험 CLI 스모크 (Python)
python -c "from src.ins_inference import predict_from_input; print(predict_from_input('중구','21-30세','남','승용'))"
# 또는
python scripts/ins_smoke.py

# 지자체 CLI 스모크
python -c "from src.gov_inference import predict_gov_rates; print(predict_gov_rates()[:3])"

# 보험 엄격 검증 A~C
python scripts/ins_validate_v1_0_4.py

# 지자체 중대율 EB/반기 실험 (보관 스크립트)
python scripts/archive/gov_severe_experiments.py
```

Docker:

```bash
docker build -t ai-traffic-risk .
docker run -p 8000:8000 ai-traffic-risk
```

현재 `Dockerfile`은 `app/`, `src/`, `models/`만 복사합니다. Gov 추론은 런타임에 `scripts/gov_v1_0_5.py`를 로드하므로, 컨테이너에서 `/predict/gov`를 쓰려면 이미지에 `scripts/`를 넣거나 로컬 `uvicorn`을 사용하세요. 다발지역 조회는 `.env`의 `KOROAD_AUTH_KEY`도 필요합니다.

---

## 참고

- 이 폴더는 **Python / pip** 기준입니다 (`npm` 아님).
- `data/`, `models/*.pkl`은 Git 제외입니다 (`.gitignore`).
- 레거시 `scripts/archive/train.py`·구형 weighted pkl(`traffic_accident_model.pkl`)은 **현재 API 서빙에 사용하지 않습니다.** 학습은 `scripts/ins_v1_0_4.py` / `scripts/gov_v1_0_5.py`를 사용하세요.
- 상세 피처·지표는 `docs/` 명세 문서를 보세요.
