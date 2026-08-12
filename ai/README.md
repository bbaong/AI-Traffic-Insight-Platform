# AI Traffic Insight Platform — AI 모듈

대구 교통사고 데이터 기반 ML 서빙 모듈입니다.  
**InsureGuard**(보험)와 **GovGuard**(지자체) 두 계열을 FastAPI로 제공합니다.

## 빠른 시작 (5분)

아래 5단계만 실행하면 로컬에서 AI 서버와 PDF 기능까지 바로 확인할 수 있습니다.

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # Windows
# source .venv/bin/activate           # macOS/Linux

# Windows(cp949)에서 UTF-8 오류가 나면 먼저:
#   $env:PYTHONUTF8 = "1"
python -m pip install -r requirements.txt

# PDF 리포트용 Chromium 설치 (uvicorn 실행과 같은 Python 환경)
$env:PLAYWRIGHT_BROWSERS_PATH = "$env:LOCALAPPDATA\ms-playwright"
python -m playwright install chromium

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

확인:
- Health: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`

## 시스템 연결

```text
[Frontend]
  POST /api/prediction/predict-ins  →  보험 대시보드
  POST /api/prediction/predict-gov  →  지자체 대시보드
  GET  /api/prediction/predict-gov-hotspots → 공식 다발지역 원
        │
        ▼
[Backend]  (기본 http://localhost:5000)
  AI_SERVICE_URL 환경변수 (기본 http://localhost:8000)
        │
        ▼
[AI]  python -m uvicorn app.main:app  (http://localhost:8000)
  POST /predict      →  InsureGuard v1.0.4
  POST /predict/gov  →  GovGuard v1.0.5
  GET  /hotspots     →  대구 공식 사고다발 TOP3 (캐시)
  GET  /health
```

| 역할 | 현재 서빙 모델 | 학습 스크립트 | 명세 |
|------|----------------|---------------|------|
| 보험 | `models/ins_model_v1.0.4.pkl` | `scripts/ins_v1_0_4.py` | `docs/ins_v1_0_4_feature_spec.md` |
| 지자체 | `models/gov_model_v1.0.5.pkl` | `scripts/gov_v1_0_5.py` | `docs/gov_v1_0_5_feature_spec.md` |

이전 버전 pkl(`ins_model_v1.0.2`~`1.0.3`, `gov_model_v1.0.0`~`1.0.4`)은 보존·비교용입니다.

---

## 디렉터리 구조

```text
ai/
├── app/                 # FastAPI (main.py, schemas.py)
├── src/
│   ├── inference.py     # InsureGuard 로드·추론 (v1.0.4)
│   ├── gov_inference.py # GovGuard 로드·추론 (v1.0.5)
│   ├── hotspots.py      # 공식 다발지역 REST + 파일 캐시
│   └── preprocess.py    # 인구 join 등 (선택)
├── scripts/             # 현재 학습·검증·실험
│   └── archive/         # 이전 버전 스크립트
├── models/              # *.pkl (Git 제외, 학습 후 생성)
├── data/
│   ├── raw/             # 원천 CSV (Git 제외)
│   └── processed/       # 전처리 결과
├── docs/                # 현재 명세·검증 (목차: docs/README.md)
│   └── archive/         # 이전 명세·실험 기록
└── requirements.txt
```

문서 목차·현재/보관 구분은 [`docs/README.md`](docs/README.md)를 보세요.

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

# PDF 리포트(Jinja2 + Playwright) — pip와 별도로 Chromium 필요.
# uvicorn을 실행하는 그 Python과 같은 환경에서, 샌드박스가 아닌 경로에 설치하세요.
$env:PLAYWRIGHT_BROWSERS_PATH = "$env:LOCALAPPDATA\ms-playwright"
python -m playwright install chromium
```

PDF가 `cursor-sandbox-cache` / `Executable doesn't exist`로 실패하면 Cursor가 `PLAYWRIGHT_BROWSERS_PATH`를 샌드박스로 심은 경우입니다.  
`report_pdf`는 `%LOCALAPPDATA%\ms-playwright`의 `chrome.exe`를 직접 쓰도록 우회합니다.  
설치 후에도 실패하면 **AI(uvicorn)를 재시작**하세요. 경로는 `AI_PLAYWRIGHT_BROWSERS_PATH`로 바꿀 수 있습니다.

### 원천 데이터

`data/raw/`에 배치 (Git 미포함) — **학습·재학습용**:

- `사고분석_2016~2025_원본합본.csv` — Insure / Gov 학습 공용
- (선택) `대구_구군_연령별_주민등록인구_2020_2025.csv` — 인구 전처리용

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
python scripts/batch_gov_forecast.py
# 또는 로그 래퍼:
# bash scripts/run_gov_forecast_batch.sh
```

선택 환경 변수: `GOV_AS_OF`(예: `2025Q3`), `GOV_FREQ`(`Q`|`H`), `GOV_SCOPE`(기본 `DAEGU`).

#### 배치 스케줄 (AI ≠ DB 서버 — 권장 운영)

개발자 PC에 Windows 작업 스케줄러를 **등록하지 않습니다.**  
cron / systemd timer는 **AI 서버**(pkl·배치 스크립트가 있는 곳)에만 둡니다.

| 구성 | 역할 |
|------|------|
| **AI 서버** | 추론 + `batch_gov_forecast.py` + **스케줄 등록** |
| **MySQL** (별도 호스트) | `gov_forecast_*` 적재. AI 출구 IP를 Trusted sources에 허용 |
| **Backend** | `GET /api/prediction/gov-forecasts` 조회만. 배치 실행에 불필요 |

```text
[ cron on AI server ]
        │  batch_gov_forecast.py (로컬 pkl)
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
  bash scripts/run_gov_forecast_batch.sh
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
| 출력 | 위험도(0~100), 등급, 법규위반 Top3, 사고경중 비율 |
| v1.0.4 | v1.0.3 산식 + **군위 2016.1~2023.6** 포함 |
| v1.0.3 | 프로파일 **심각도 + 빈도** 블렌드 (`scripts/archive/ins_v1_0_3.py`) |
| v1.0.2 | 심각도만 (`scripts/archive/ins_v1_0_2.py`) |

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
| POST | `/predict` | InsureGuard 위험도 |
| POST | `/predict/gov` | GovGuard 지역 예측 |
| POST | `/predict/gov/history` | GovGuard 분기 history |
| POST | `/report/ins-pdf` | 보험 상담 PDF 생성 |
| POST | `/report/gov-pdf` | 지자체 리포트 PDF 생성 |
| GET | `/hotspots` | 대구 공식 사고다발 TOP3 (지도 원) |

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
  }
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
| `POST …/api/insurance/report-pdf` | `generateInsuranceReportPdf` | `POST /report/ins-pdf` |
| `POST …/api/prediction/gov-report-pdf` | `generateGovReportPdf` | `POST /report/gov-pdf` |
| Frontend 지도 원 | `GovDashboardPage` → `MapCard` `hotspots` | `kakao.maps.Circle` |

### PDF 트러블슈팅 (Playwright)

- 에러: `Executable doesn't exist` + `cursor-sandbox-cache` 경로
  - 원인: Cursor 샌드박스 경로에 Chromium 바이너리가 없어서 발생
  - 조치: `PLAYWRIGHT_BROWSERS_PATH`를 `%LOCALAPPDATA%\ms-playwright`로 고정 후 `python -m playwright install chromium`
- 설치 후에도 실패하면 AI 서버(`uvicorn`)를 재시작하세요.
- 브라우저 경로를 강제로 바꾸려면 `AI_PLAYWRIGHT_BROWSERS_PATH`를 사용하세요.

---

## 자주 쓰는 명령

```bash
# 보험 CLI 스모크 (Python)
python -c "from src.inference import predict_from_input; print(predict_from_input('중구','21-30세','남','승용'))"

# 지자체 CLI 스모크
python -c "from src.gov_inference import predict_gov_rates; print(predict_gov_rates()[:3])"

# 보험 엄격 검증 A~C
python scripts/validate_ins_v1_0_4.py

# 지자체 중대율 EB/반기 실험 (보관 스크립트)
python scripts/archive/gov_severe_experiments.py
```

Docker:

```bash
docker build -t ai-traffic-risk .
docker run -p 8000:8000 ai-traffic-risk
```

---

## 참고

- 이 폴더는 **Python / pip** 기준입니다 (`npm` 아님).
- `data/`, `models/*.pkl`은 보통 Git 제외입니다.
- 레거시 `src/train.py`·구형 weighted pkl 경로는 **현재 API 서빙에 사용하지 않습니다.** 학습은 `scripts/ins_*.py` / `scripts/gov_*.py`를 사용하세요.
- 상세 피처·지표는 `docs/` 명세 문서를 보세요.
