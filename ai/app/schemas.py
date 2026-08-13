"""Request/Response 데이터 구조 (Pydantic)."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field

class CoverageRecommendItem(BaseModel):
    id: str
    name: str
    recommended: bool
    script: str
    reason: str

class PredictRequest(BaseModel):
    구군: str = Field(..., examples=["달서구"], description="대구시 구·군명 (=모델 지역)")
    연령대: str = Field(..., examples=["51-60세"], description="나이(연령대)")
    성별: str = Field(..., examples=["남"])
    차종: str = Field(..., examples=["승용"])

    model_config = {"populate_by_name": True}

class InsReportPdfRequest(BaseModel):
    구군: str
    연령대: str
    성별: str
    차종: str
    고객명: Optional[str] = None
    작성자: Optional[str] = None
    memo: Optional[str] = None

    model_config = {"populate_by_name": True}


class PredictResponse(BaseModel):
    버전: str
    variant: str
    예측등급: str = Field(..., description="CRITICAL|HIGH|MODERATE|LOW")
    위험도: float
    등급확률: Dict[str, float] = Field(..., description="법규위반 Top3 확률")
    사고경중비율: Dict[str, float] = Field(
        ..., description="사망/중상/경상/부상신고 확률"
    )
    담보추천: List[CoverageRecommendItem] = Field(
        default_factory=list,
        description="표준약관 6대 담보 추천",
    )


class HealthResponse(BaseModel):
    status: str = "ok"

class GovPdfTop3Item(BaseModel):
    rank: int
    region: str
    severe_rate: float
    count: int
    grade: str

class GovPdfSelected(BaseModel):
    grade: str
    severe_rate: float
    count: int
    types: List[Any]  # [[name, count], ...]

class GovPdfDashboardPayload(BaseModel):
    period_label: str
    top3: List[GovPdfTop3Item]
    selected: GovPdfSelected
    comparison: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[Dict[str, Any]]] = None
    severityLatest: Optional[List[Dict[str, Any]]] = None
    severitySeries: Optional[List[Dict[str, Any]]] = None  # 추가
    
class GovReportPdfRequest(BaseModel):
    지역: str = Field(..., examples=["수성구"])
    as_of: Optional[str] = None
    freq: Literal["Q", "H"] = "Q"
    작성자: Optional[str] = None
    기관: Optional[str] = None
    dashboard: Optional[GovPdfDashboardPayload] = None

class GovPredictRequest(BaseModel):
    지역: Optional[str] = Field(None, examples=["수성구"], description="구·군명. 없으면 전 지역")
    as_of: Optional[str] = Field(None, examples=["2025Q3"], description="기준 분기/반기 라벨")
    freq: Literal["Q", "H"] = Field("Q", description="Q=분기, H=반기")

class GovHistoryRequest(BaseModel):
    지역: str = Field(..., examples=["달서구"])
    as_of: Optional[str] = Field(None, examples=["2025Q3"])
    n_history: int = Field(3, ge=1, le=12)


class GovHistoryPoint(BaseModel):
    분기: str
    사고건수: int
    중대사고율_퍼센트: float
    경중_건수: Dict[str, int]
    경중_퍼센트: Dict[str, float]
    kind: Literal["actual", "forecast"]
    기준분기: Optional[str] = None


class GovHistoryResponse(BaseModel):
    지역: str
    history: List[GovHistoryPoint]
    forecast: GovHistoryPoint


class HotspotPoint(BaseModel):
    lat: float
    lon: float
    name: str
    region_label: str = ""
    지역: Optional[str] = None
    count: int = 0
    casualties: int = 0
    fatal: int = 0
    severe: int = 0
    slight: int = 0
    injury_report: int = 0
    spot_code: str = ""
    afos_id: str = ""
    year: int
    source: str = ""
    geom_json: Optional[Any] = None


class HotspotResponse(BaseModel):
    year: int = Field(..., description="KOROAD searchYearCd")
    searchYearCd: Optional[str] = None
    sido: str
    source: str
    fetched_at: str
    count: int
    points: List[HotspotPoint]
    partial_errors: List[str] = Field(default_factory=list)


# 응답 필드가 많아 느슨하게 둠 (dict 또는 list)
GovPredictResponse = Union[Dict[str, Any], List[Dict[str, Any]]]