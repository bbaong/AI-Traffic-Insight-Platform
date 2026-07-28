"""API 엔드포인트 정의."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException

from app.schemas import HealthResponse, PredictRequest, PredictResponse
from src.inference import predict_from_input

app = FastAPI(
    title="AI Traffic Insight - Risk Prediction API",
    description="교통사고 위험도(100점) 예측 서빙 API",
    version="1.0.0",
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
            주야=body.주야,
            variant=body.variant,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PredictResponse(**result)
