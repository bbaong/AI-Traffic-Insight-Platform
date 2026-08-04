"""API 엔드포인트 정의."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException

from app.schemas import (
    GovHistoryRequest,
    GovHistoryResponse,
    GovPredictRequest,
    HealthResponse,
    PredictRequest,
    PredictResponse,
)
from contextlib import asynccontextmanager

from src.inference import predict_from_input, load_model as load_ins_model
from src.gov_inference import (
    predict_gov_rates,
    predict_gov_history,
    load_model as load_gov_model,
)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    # 기동 시 pkl 로드 (첫 요청 지연 감소)
    try:
        load_gov_model()
    except FileNotFoundError as e:
        print(f"[warmup] gov model skip: {e}")
    try:
        load_ins_model()
    except Exception as e:
        print(f"[warmup] ins model skip: {e}")
    yield


app = FastAPI(
    title="AI Traffic Insight - Risk Prediction API",
    description="InsureGuard + GovGuard 예측 서빙 API",
    version="1.0.4",
    lifespan=lifespan,
)

@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest) -> PredictResponse:
    try:
        result = predict_from_input(
            구군=body.구군,
            연령대=body.연령대,
            성별=body.성별,
            차종=body.차종,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PredictResponse(**result)


@app.post("/predict/gov")
def predict_gov(body: GovPredictRequest):
    try:
        return predict_gov_rates(
            지역=body.지역,
            as_of=body.as_of,
            freq=body.freq,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@app.post("/predict/gov/history")
def predict_gov_history_api(body: GovHistoryRequest):
    try:
        return predict_gov_history(
            지역=body.지역,
            n_history=body.n_history,
            as_of=body.as_of,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc