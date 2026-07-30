"""Request/Response 데이터 구조 (Pydantic)."""

from __future__ import annotations

from typing import Dict, Literal, Optional
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    구군: str = Field(..., examples=["달서구"], description="대구시 구·군명 (=모델 지역)")
    연령대: str = Field(..., examples=["51-60세"])
    성별: str = Field(..., examples=["남"])
    차종: str = Field(..., examples=["승용"])
    주야: str = Field(default="주간", examples=["주간"])
    노면상태: str = Field(
        default="건조",
        examples=["건조"],
        description="건조|젖음/습기|적설|서리/결빙|해빙|침수|기타",
    )
    # variant는 하위호환용(무시)
    variant: str | None = Field(default=None)

    model_config = {"populate_by_name": True}


class PredictResponse(BaseModel):
    버전: str
    variant: str
    예측등급: str = Field(..., description="CRITICAL|HIGH|MODERATE|LOW")
    위험도: float
    등급확률: Dict[str, float] = Field(..., description="법규위반 Top3 확률")

class HealthResponse(BaseModel):
    status: str = "ok"
