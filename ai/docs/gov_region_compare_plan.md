# 지자체 지역비교 — AI/점수/데이터 결정 정리

> 관련: [backend/docs/gov-region-compare.md](../../backend/docs/gov-region-compare.md)  
> 기준 모델: GovGuard AI `gov_model_v1.0.5.pkl`  
> 데이터: `사고분석_2016~2025_원본합본.csv` → DB (`district_benchmark_metrics`, `gov_forecast_*`, `district_monthly_trend`, `accident_condition_stats`)

---

## 1. 결론 요약

| 항목 | 결정 |
|------|------|
| 종합 위험도 `/100` | **새 pkl 불필요**. `benchmark + gov_forecast` + **규칙 가중합** |
| 구현 주체 | **대부분 백엔드** (`GET /api/gov/region-compare`) |
| 사고유형 대구 평균 | **백엔드 집계** (gov 모델 업그레이드 1차 불필요) |
| 분기 추세 대구 선 | **구·군 건수의 평균** (합 아님) |
| 예측 점선 | **DB 스냅샷** (`gov_forecast`). 요청 시 pkl 로드 안 함 |
| AI 쪽 유지 | 기존 `batch_gov_forecast.py` **주 1회** 갱신만 |

---

## 2. GovGuard 출력 vs 지역비교 UI

### 2.1 모델이 내는 값 (참고)

| 필드 | 의미 | 단위 |
|------|------|------|
| `예측사고건수` | 구·군 × 분기 **총 사고 건수** (share×시전체 → last×2 캡) | 건 |
| `예측사고율` | 대구 대비 **점유율** (항목별 건수 아님) | % |
| `예측중대사고율` | 해당 구 사고 중 사망+중상 비율 (EB) | % |
| 경중·유형 | **비율**. 유형은 기준분기 실적 전파 | % |

메인 건수는 **사고 항목(유형/법규)별 건수가 아니라** 구·군 총건수다.

### 2.2 프론트 대시보드 현황

- 지도·TOP3는 주로 **`예측중대사고율`** 사용
- **`예측사고율`은 타입/스냅샷까지는 오지만 UI 미사용**
- 지역비교 페이지는 대시보드와 별도: 다구 + 대구 평균 비교

---

## 3. 비교 요약 — 종합 위험도 점수

### 3.1 방향

- UI 문구: **발생 가능성(통계) + 영향도** 종합 지표
- **정식**: 피처 5~6개 **규칙 점수** → 필요 시만 가중치/순위 튜닝
- **단기 임시**: `predicted_share_pct` + `predicted_severe_rate_pct`만으로도 가능

### 3.2 피처 소스 (CSV 직접 읽지 않음)

| 레이어 | 피처 | 소스 |
|--------|------|------|
| 규모 (가능성) | 점유율 / 예측·실적 건수 | `gov_forecast_districts` |
| 심각도 (영향) | 중상 이상 비율 | `district_benchmark_metrics.serious_pct` (± forecast 중대율) |
| 취약 유형 | 보행자 사고 비율 | `pedestrian_pct` |
| 시간 | 야간 비율 | `night_pct` |
| 위반 | 신호위반 비율 | `signal_violation_pct` |
| 보조 (선택) | 우천 비율 | `rainy_pct` (DB 있음, UI 미사용) |

CSV (`주야`, `사고유형`, `법규위반`, `사고내용` 등)로 파생 가능하나, **이미 적재된 benchmark + forecast를 재사용**한다. CSV 하드코딩 금지.

### 3.3 산식 스케치

```
종합위험도 ≈ w1·규모점수 + w2·심각도점수 + w3·보행자 + w4·야간 + w5·신호위반
```

- 각 피처: 대구 평균 대비 편차 또는 구 간 min–max 정규화 → 0~100 스케일
- 가중치 예: 규모 0.30 / 심각도 0.30 / 보행·야간·신호 0.13씩 (조정 가능)
- 요청 시: SELECT 최신 스냅샷 → 가중합 (수 ms급)
- 선택: 주 1회 배치 끝에서 `risk_score`를 컬럼/테이블에 미리 저장

### 3.4 성능·“틈”

| 구분 | 내용 |
|------|------|
| 요청 지연 | DB 조회 + 산술 → **빠름**. 요청마다 pkl/CSV 로드 안 함 |
| 데이터 틈 | 배치·ETL 전 공백, 또는 **주 1회 freshness** |
| 권장 | UI에 `as_of` / `calculated_at` 표시 |

**새 risk pkl은 필수가 아니다.** 쓸 만한 운영용 지수로 백엔드만으로 산출 가능하다.

---

## 4. 섹션별 구현 방침

### 4.1 핵심 지표 비교

- 보행자·야간·중상이상·신호위반 % + **대구 평균**
- `district_benchmark_metrics` 다구 batch (`district_id=null` = 시 평균)
- 기존 `getComparisonByDistrictId` 확장

### 4.2 사고유형 구성 비교

- 차대차 / 차대사람 / 차량단독 + **대구 평균 행**
- **1차: 백엔드** `accident_condition_stats` (`ACCIDENT_TYPE`) 구별 count 합 → 비율
- 적재 ETL: `scripts/etl_accident_condition_type.py` (CSV → DB, gov pkl 무관)
- gov pkl에 cityAvg 추가는 가능하나 1차 이득 작음 (유형은 예측이 아니라 실적 전파)
- 확인: `dimension_value` ↔ `차대차`/`차대사람`/`차량단독` 매핑

### 4.3 분기별 사고 추세

| 선 | 데이터 | 정의 |
|----|--------|------|
| 구별 실선 | `district_monthly_trend` 분기 집계 | 해당 구 건수 |
| 대구 실선 | 동일 테이블 | **구·군 건수의 평균** |
| 구별 점선 | `gov_forecast` `predicted_accident_count` | 다음 분기 1점 연결 |
| 대구 점선 | 구별 예측 건수의 **평균** | 동일 정의 |

합(sum)으로 그리면 Y축 스케일이 구 선과 맞지 않음 → **평균 확정**.

### 4.4 비교 인사이트·태그

- 기존 `listSuggestions` (구 vs 시 평균) 변형
- 다구 선택 시: 구 vs 시 + 선택 구 간 상대 비교 (“야간 비율이 가장 높음” 등)
- 문장/태그는 **백엔드 규칙 엔진** (프론트 복붙 지양)

---

## 5. 예측 점선 소스 (pkl vs DB)

### 5.1 원칙

```
[주 1회 배치] pkl 예측 → DB 적재
[페이지 요청] DB만 읽기  (pkl 로드 없음)
```

이미 `scripts/batch_gov_forecast.py` → `gov_forecast_runs` / `gov_forecast_districts` 패턴이 있다.

### 5.2 옵션

| 옵션 | 요청 시 | 용도 |
|------|---------|------|
| 실시간 `predict-gov-history` | pkl 필요 | 가능하나 다구·콜드로드 부담 |
| **현재 gov_forecast 스냅샷** | DB만 | 다음 분기 **1점** 점선 — **권장 최소** |
| 배치에서 history까지 적재 | DB만 | 시계열 forecast가 필요하면 확장 |

서빙 형태는 **pkl이 아니라 DB JSON**. pkl은 배치 생성용으로만 유지.

### 5.3 주 1회 파이프라인

1. (기존) 원천 → benchmark ETL  
1a. **`etl_district_monthly_trend.py`** → `district_monthly_trend` (추세 실선)  
1b. (A안) `etl_accident_condition_type.py` → `accident_condition_stats` (`ACCIDENT_TYPE`)  
2. (기존) `batch_gov_forecast.py` → `gov_forecast_*`  
3. (선택) 같은 배치에서 `risk_score` 계산·저장  
4. (선택) history forecast 포인트 추가 적재  
5. `region-compare` API = DB만 읽기  

---

## 6. AI vs 백엔드 역할

| 작업 | 담당 |
|------|------|
| 종합 위험도 산식·순위 | **Backend** |
| 핵심 지표 / 사고유형 평균 / 추세 평균 | **Backend** |
| 인사이트 태그 | **Backend** |
| `GET /api/gov/region-compare` | **Backend** |
| 지역비교 UI | **Frontend** |
| 새 ML 모델·재학습 | **불필요** |
| 기존 gov 배치 주 1회 | **AI/Ops** (기존 유지) |

---

## 7. 남은 구현 체크리스트

1. 종합 위험도 가중치·정규화 확정 (코드 상수 또는 설정)
2. 사고유형 `dimension_value` 매핑 확인
3. `districtIds` 서버 max (예: 5~8, UI 기본 3)
4. 기간 UI 삭제 후 API는 **최신 스냅샷** 기준인지 문서화
5. (선택) `risk_score` DB 컬럼/테이블 사전 적재
6. (선택) forecast 점선용 history 행 확장

---

## 8. 관련 파일

| 파일 | 역할 |
|------|------|
| `backend/docs/gov-region-compare.md` | 백엔드 API·섹션 현황 |
| `scripts/gov_v1_0_5.py` / `models/gov_model_v1.0.5.pkl` | 분기 예측 (배치) |
| `scripts/batch_gov_forecast.py` | pkl → DB 적재 |
| `scripts/etl_accident_condition_type.py` | CSV → `accident_condition_stats` (유형 대분류) |
| `scripts/etl_district_monthly_trend.py` | CSV → `district_monthly_trend` (월별 추세 실적) |
| `scripts/batch_gov_forecast.py` | pkl → `gov_forecast_*` |
| `src/gov_inference.py` | 실시간 추론 헬퍼 (대시보드 폴백) |
| `docs/gov_v1_0_5_feature_spec.md` | GovGuard 피처 명세 |
