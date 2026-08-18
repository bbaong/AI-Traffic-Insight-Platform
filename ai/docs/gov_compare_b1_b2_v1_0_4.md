# GovGuard B1 vs B2 (+A) 비교

## 설정

- split: next∈2024–2025 (v1.0.3과 동일)
- B1: share × 기준분기 시전체건수
- B2: log1p(건수), 가중 √n
- A: `min(primary, max(last×1.5, share_count×1.25))`
- Baseline: v1.0.3식 선형 건수 회귀 (건수 가중)
- 소지역: 학습 구간 평균 건수 하위 ~30% → `['남구', '달성군', '중구']`

## 판정 (A ON 후보)

- **승자(집계 기준):** `B1_share+A`
- 이유: 소지역 jump_p95=1.30, MAPE=16.6%, Top3=0.917, gate_pass=True

### 주의 — 군위군 케이스

검증 최신 구간: **last=31, true=36** 인데 예측은 여전히 큼 (B1 155, B2 177, baseline 200).

A식 `min(primary, max(last×1.5, share×1.25))` 에서 `share×1.25` 천장이 높아 **캡이 거의 안 깎임**.  
서빙용 권장 캡: `min(primary, last_count * 2.0)`.  
소지역 목록에도 **군위군 강제 포함** 후 재실험 권장 (현재 하위 30%는 남구·달성·중구만).

## 전체 (검증)

| variant | MAE | MAPE% | R² | Top-3 | jump_p95 | over_2x |
|---------|-----|-------|-----|-------|----------|---------|
| baseline_count | 40.6 | 55.1 | 0.866 | 0.917 | 6.12 | 0.07 |
| baseline_count+A | 38.9 | 50.7 | 0.882 | 0.917 | 5.87 | 0.07 |
| B1_share | 39.0 | 41.3 | 0.893 | 0.917 | 4.69 | 0.07 |
| B1_share+A | 39.0 | 41.3 | 0.893 | 0.917 | 4.69 | 0.07 |
| B2_logcount | 37.9 | 48.9 | 0.889 | 0.917 | 5.43 | 0.07 |
| B2_logcount+A | 37.3 | 47.4 | 0.894 | 0.917 | 5.43 | 0.07 |

## 소지역

| variant | MAE | MAPE% | jump_p95 | over_2x | gate≤2.0 |
|---------|-----|-------|----------|---------|----------|
| baseline_count | 29.4 | 20.6 | 1.81 | 0.00 | Y |
| baseline_count+A | 27.5 | 19.1 | 1.54 | 0.00 | Y |
| B1_share | 26.5 | 16.6 | 1.30 | 0.00 | Y |
| B1_share+A | 26.5 | 16.6 | 1.30 | 0.00 | Y |
| B2_logcount | 27.2 | 19.0 | 1.62 | 0.00 | Y |
| B2_logcount+A | 26.1 | 18.1 | 1.54 | 0.00 | Y |

## 케이스 (검증 최신 next 구간)

### 군위군

| variant | last | true | pred | pred/last |
|---------|------|------|------|-----------|
| baseline_count | 31 | 36 | 200 | 6.44 |
| baseline_count+A | 31 | 36 | 194 | 6.26 |
| B1_share | 31 | 36 | 155 | 5.01 |
| B1_share+A | 31 | 36 | 155 | 5.01 |
| B2_logcount | 31 | 36 | 177 | 5.70 |
| B2_logcount+A | 31 | 36 | 177 | 5.70 |

### 중구

| variant | last | true | pred | pred/last |
|---------|------|------|------|-----------|
| baseline_count | 226 | 198 | 189 | 0.84 |
| baseline_count+A | 226 | 198 | 189 | 0.84 |
| B1_share | 226 | 198 | 205 | 0.91 |
| B1_share+A | 226 | 198 | 205 | 0.91 |
| B2_logcount | 226 | 198 | 198 | 0.88 |
| B2_logcount+A | 226 | 198 | 198 | 0.88 |

### 달성군

| variant | last | true | pred | pred/last |
|---------|------|------|------|-----------|
| baseline_count | 266 | 294 | 236 | 0.89 |
| baseline_count+A | 266 | 294 | 236 | 0.89 |
| B1_share | 266 | 294 | 231 | 0.87 |
| B1_share+A | 266 | 294 | 231 | 0.87 |
| B2_logcount | 266 | 294 | 234 | 0.88 |
| B2_logcount+A | 266 | 294 | 234 | 0.88 |

### 달서구

| variant | last | true | pred | pred/last |
|---------|------|------|------|-----------|
| baseline_count | 536 | 563 | 527 | 0.98 |
| baseline_count+A | 536 | 563 | 527 | 0.98 |
| B1_share | 536 | 563 | 558 | 1.04 |
| B1_share+A | 536 | 563 | 558 | 1.04 |
| B2_logcount | 536 | 563 | 555 | 1.03 |
| B2_logcount+A | 536 | 563 | 555 | 1.03 |

### 수성구

| variant | last | true | pred | pred/last |
|---------|------|------|------|-----------|
| baseline_count | 498 | 462 | 468 | 0.94 |
| baseline_count+A | 498 | 462 | 468 | 0.94 |
| B1_share | 498 | 462 | 471 | 0.95 |
| B1_share+A | 498 | 462 | 471 | 0.95 |
| B2_logcount | 498 | 462 | 457 | 0.92 |
| B2_logcount+A | 498 | 462 | 457 | 0.92 |

## 다음 단계

1. 정식 v1.0.4: **B1(share×시전체) 메인** + **실적 대비 강한 캡** (`min(pred, last×2)`)
2. 실험 스크립트에 군위 강제 포함·캡 A' 재비교 (선택)
3. `gov_inference.py` / history forecast 건수에 동일 적용
4. 대시보드 사고경중 예측 막대 재확인 (특히 군위군)
