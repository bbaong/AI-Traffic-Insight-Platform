# 예측 응답 시간 — 전체 스택 (E2E)

AI 직접 호출 vs Backend 프록시(프론트가 쓰는 경로). Frontend는 HTML 로드만.

- AI: `http://127.0.0.1:8000`
- Backend: `http://127.0.0.1:5000`
- Frontend: `{'url': 'http://localhost:5173', 'status': 200, 'html_ms': 11.188, 'bytes': 827}`

## 요약 표 (ms)

| 경로 | p50 | p95 | mean | first(warmup 포함) |
|------|-----|-----|------|-------------------|
| AI `POST /predict (ins)` | 90 | 108 | 94 | 110 |
| AI `POST /predict/gov (all)` | 334 | 376 | 337 | 312 |
| AI `POST /predict/gov/history` | 56 | 119 | 63 | 41 |
| BE `POST /api/prediction/predict-ins` | 98 | 127 | 103 | 206 |
| BE `POST /api/prediction/predict-gov` | 368 | 602 | 407 | 330 |
| BE `POST /api/prediction/predict-gov-history` | 56 | 68 | 56 | 44 |
| BE `GET /api/prediction/predict-gov-hotspots` | 6 | 6 | 5 | 8 |

## Backend 오버헤드 (p50 BE − p50 AI)

- Ins: **8.756 ms**
- Gov 전체: **34.399 ms**

## 해석

- 프론트 대시보드의 예측 XHR 지연 ≈ **Backend 프록시** 행.
- Backend 오버헤드가 작으면 Express 중계 비용은 무시할 수준.
- 첫 요청은 콜드/연결 때문에 더 길 수 있음.

재측정: `python scripts/measure_prediction_latency_e2e.py`
