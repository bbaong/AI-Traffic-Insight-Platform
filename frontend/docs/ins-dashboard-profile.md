# 보험사 대시보드 — 프로필 위험 분석

## 개요

보험사(INS) 대시보드를 **프로필 위험 분석** 화면으로 재구성했다.  
InsureGuard(4피처: 구군·연령대·성별·차종) 예측 API `POST /api/prediction/predict-ins`를 실제 호출하며, 목업·지도·KPI·연령대 차트·사고경중 도넛은 사용하지 않는다.  
지자체(GOV) 대시보드는 변경하지 않았다.

---

## API 매핑

| 응답 필드 (`json.data`) | 화면 | 변환 |
|---|---|---|
| `예측등급` | 위험 배지 | `CRITICAL\|HIGH\|MODERATE\|LOW` → `RISK_META` (색+텍스트+아이콘) |
| `위험도` | 큰 점수·게이지 | 0~100 표시, 소수 1자리 |
| `등급확률` | 법규위반 경향 리스트 | `Object.entries` → 값 내림차순, `×100` 후 소수 1자리 `%` |
| `버전` / `variant` | (표시 없음) | 수신만 |

요청 body 키: `구군`, `연령대`, `성별`, `차종`  
구현: `src/domains/ins/api/prediction.ts` → `predictIns()` (`json.data`만 반환)

---

## 셀렉트 정본 값

파일: `src/domains/ins/constants/insFeatures.ts` (InsureGuard v1.0.3, **임의 변경 금지**)

| 피처 | 상수 | 예시 |
|---|---|---|
| 성별 | `GENDER_OPTIONS` | `남`, `여` |
| 연령대 | `AGE_OPTIONS` | `20세 이하` … `65세 이상` |
| 차종 | `VEHICLE_OPTIONS` | `승용` … `특수` |
| 지역 | `REGION_OPTIONS` | `중구` … `군위군` (대구광역시 prefix 금지) |

라벨과 API 전송 값은 동일 문자열이다.

---

## 지도·도넛을 뺀 이유

| 제거 요소 | 이유 |
|---|---|
| Choropleth 지도 | 프로필 4피처 분석 UX에 불필요. 지역은 셀렉트로 전달 |
| 사고경중 도넛 | `predict-ins` 응답에 경중 분포 없음 (`predict-gov` 전용) |
| KPI 4칸·연령대 막대 | 목업/부가 차트. 단일 프로필 예측 결과와 무관 |

---

## RISK_META

| 등급 | 라벨 | 색 토큰 | 아이콘 |
|---|---|---|---|
| CRITICAL | Critical | `--risk-critical` | ⚠ |
| HIGH | High | `--risk-high` | ▲ |
| MODERATE | Moderate | `--risk-moderate` | △ |
| LOW | Low | `--risk-low` | ● |

색만으로 등급을 표시하지 않는다. 구현: `src/domains/ins/utils/riskMeta.ts`

---

## 화면 구조

1. 헤더(Shell): `프로필 위험 분석` + 보험사 Amber 배지 (기간 드롭다운 없음)  
2. 프로필 정보 입력 → `분석하기`  
3. 결과 2분할: 위험점수 / 법규위반 경향  
4. 해석 가이드 3칸  
5. 하단 고지: `데이터 기준 2020–2025년 · 통계적 분석 모델이며 실제 사고 발생을 보장하지 않습니다`

---

## 다음 작업

- 분석 이력(최근 요청·결과 저장/조회)
- 상담 참고 리포트 PDF/인쇄 내보내기
- 동일 조건 연령대 비교(선택적 확장 API)를 결과 보조 패널로 복원할지 검토
