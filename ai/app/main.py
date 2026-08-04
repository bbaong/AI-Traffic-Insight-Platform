"""API 엔드포인트 정의."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query

from app.schemas import (
    GovHistoryRequest,
    GovPredictRequest,
    HealthResponse,
    HotspotResponse,
    PredictRequest,
    PredictResponse,
)
from src.gov_inference import (
    load_model as load_gov_model,
    predict_gov_history,
    predict_gov_rates,
)
from src.hotspots import fetch_daegu_hotspots_auto_year
from src.inference import load_model as load_ins_model, predict_from_input

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

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


@app.get("/hotspots", response_model=HotspotResponse)
def gov_hotspots(
    year: int | None = Query(None, description="조회 연도. 없으면 최신 가능 연도"),
    refresh: bool = Query(False, description="캐시 무시하고 공공 API 재조회"),
    include_polygon: bool = Query(False, description="geom_json 포함 여부"),
):
    """대구 구·군별 공식 사고다발 TOP3 (지도 원용).

    서버 파일 캐시(기본 24h). ServiceKey는 DATA_GO_KR_SERVICE_KEY.
    """
    try:
        return fetch_daegu_hotspots_auto_year(
            year=year,
            include_polygon=include_polygon,
            force_refresh=refresh,
        )
    except RuntimeError as exc:
        msg = str(exc)
        status = 503 if "SERVICE_KEY" in msg or "환경변수" in msg else 502
        raise HTTPException(status_code=status, detail=msg) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc