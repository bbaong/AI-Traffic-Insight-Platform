# 예측 응답 시간 측정

측정일: 로컬 Windows, AI FastAPI `127.0.0.1:8000`  
스크립트: `scripts/measure_prediction_latency.py`  
원시 결과: [`prediction_latency.json`](prediction_latency.json)

> 브라우저 → Express → AI 전체 E2E는 Backend가 꺼져 있어 미측정.  
> 아래 HTTP는 **AI 직접 호출** 기준.

## 요약

| 경로 | 대상 | 중앙값(p50) | p95 | 비고 |
|------|------|-------------|-----|------|
| In-process | Ins 단건 예측 | **85 ms** | 100 ms | 모델 로드 후 |
| In-process | Gov 1개 구·군 | **40 ms** | 44 ms | |
| In-process | Gov 전체 구·군 | **340 ms** | 362 ms | 대시보드 로드에 해당 |
| In-process | Gov history (n=4) | **42 ms** | 58 ms | |
| HTTP AI | `POST /predict` | **102 ms** | 141 ms | 첫 요청 ~1.5 s (워밍업) |
| HTTP AI | `POST /predict/gov` (전체) | **361 ms** | 405 ms | 첫 요청 ~0.67 s |
| 콜드 | Ins pkl 로드 | **~1.5 s** | — | 프로세스 최초 1회 |

## 해석

- 순수 sklearn 추론만이면 보통 더 짧지만, Ins는 회귀 + RF×2 + 담보 룰까지 포함해 **약 0.1초**.
- Gov 전체 구·군은 **약 0.3~0.4초**로, 실무 UI 목표(1초 이내) 안쪽.
- 첫 HTTP 요청은 모델 로딩으로 **1초대**가 날 수 있음 → 기동 시 preload(`lifespan`)가 있어도 클라이언트가 먼저 치면 길어질 수 있음.
- PDF(Playwright)는 이 표에 없음 (별도로 수 초대).

## 재측정

```bash
cd ai
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
python scripts/measure_prediction_latency.py
```
