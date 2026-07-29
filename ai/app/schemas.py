"""Request/Response 데이터 구조 (Pydantic)."""

from __future__ import annotations

from typing import Dict, Literal, Optional
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    # AI 모델이 필요로 하는 한글 입력 필드
    구군: str = Field(..., examples=["달서구"], description="대구시 구·군명")
    연령대: str = Field(..., examples=["51-60세"], description="연령대 구간")
    성별: str = Field(..., examples=["남"], description="성별 (남/여 또는 남성/여성)")
    차종: str = Field(..., examples=["승용"], description="차종")
    주야: str = Field(default="주간", examples=["주간"], description="주간/야간")
    
    # AI 모델 가중치 모드
    variant: Literal["unweighted", "weighted"] = Field(
        default="weighted",
        description="unweighted=가중치없음, weighted=가중치적용",
    )

    model_config = {"populate_by_name": True}


class PredictResponse(BaseModel):
    버전: str = Field(..., description="모델 버전", example="v1.0.0")
    variant: str = Field(..., description="적용된 가중치 모드", example="weighted")
    예측등급: str = Field(..., description="위험 등급 (예: High, Critical 등)", example="High")
    위험도: float = Field(..., description="사고 위험 점수 (0~100)", example=78.5)
    등급확률: Dict[str, float] = Field(
        ..., 
        description="각 등급별 확률 분포", 
        example={"Low": 0.05, "Moderate": 0.15, "High": 0.70, "Critical": 0.10}
    )


class HealthResponse(BaseModel):
    status: str = "ok"