"""Request/Response 데이터 구조 (Pydantic)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    구군: str = Field(..., examples=["달서구"])
    연령대: str = Field(..., examples=["51-60세"])
    성별: str = Field(..., examples=["남"])
    차종: str = Field(..., examples=["승용"])
    주야: str = Field(default="주간", examples=["주간"])
    variant: Literal["unweighted", "weighted"] = Field(
        default="weighted",
        description="unweighted=가중치없음, weighted=가중치적용",
    )

    model_config = {"populate_by_name": True}


class PredictResponse(BaseModel):
    버전: str
    variant: str
    예측등급: str
    위험도: float
    등급확률: dict[str, float]


class HealthResponse(BaseModel):
    status: str = "ok"
