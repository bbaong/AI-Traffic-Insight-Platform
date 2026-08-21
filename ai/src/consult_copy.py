"""InsureGuard 상담 문구 — 서빙·학습 공통 (학습 스크립트 import 없음)."""

from __future__ import annotations

from typing import Sequence

GRADE_KO = {
    "LOW": "낮음",
    "MODERATE": "보통",
    "HIGH": "높음",
    "CRITICAL": "위험",
}

OCC_CAPTION = {
    "LOW": "인구 대비 사고가 적은 편입니다",
    "MODERATE": "인구 대비 사고 빈도는 중간입니다",
    "HIGH": "인구 대비 사고가 잦은 편입니다",
    "CRITICAL": "인구 대비 사고가 매우 잦습니다",
}

SEV_CAPTION = {
    "LOW": "나면 경미한 사고가 많습니다",
    "MODERATE": "나면 심도는 대구 평균 수준입니다",
    "HIGH": "나면 중상·사망 비중이 큽니다",
    "CRITICAL": "나면 한 건이 매우 무거울 수 있습니다",
}


def score_to_level(score: float) -> str:
    if score >= 75:
        return "CRITICAL"
    if score >= 50:
        return "HIGH"
    if score >= 30:
        return "MODERATE"
    return "LOW"


def _bucket(level: str) -> str:
    """상담 2×2용: HIGH·CRITICAL → high, 나머지 → low."""
    return "high" if str(level).upper() in {"HIGH", "CRITICAL"} else "low"


def build_axis(
    score: float,
    *,
    captions: dict[str, str],
) -> dict[str, str | float]:
    level = score_to_level(float(score))
    return {
        "점수": round(float(score), 1),
        "등급": level,
        "라벨": GRADE_KO[level],
        "설명": captions[level],
    }


def build_consult_point(
    *,
    occ_level: str,
    sev_level: str,
    grade: str,
    top_violation: str | None = None,
    focus_coverages: Sequence[str] = (),
) -> str:
    """게이지 아래·상담 포인트 한 줄 (발생 × 심도)."""
    occ_b = _bucket(occ_level)
    sev_b = _bucket(sev_level)
    top = (top_violation or "").strip() or "주요 법규위반"
    focus = "·".join(str(x) for x in focus_coverages[:2]) or "대인 관련 담보"

    if occ_b == "low" and sev_b == "low":
        body = (
            f"기대손실이 낮은 편입니다. {top} 경향은 참고만 하고, "
            f"할인특약·기존 담보 점검 위주로 안내해 주세요."
        )
    elif occ_b == "low" and sev_b == "high":
        body = (
            f"사고는 자주 나지 않지만, 한 건이 무거울 수 있습니다. "
            f"{focus} 한도와 자기신체 보장을 우선 확인해 주세요."
        )
    elif occ_b == "high" and sev_b == "low":
        body = (
            f"잔사고·접촉 빈도가 높은 편입니다. "
            f"{top} 안내와 함께 {focus}·자기차량 담보를 검토해 주세요."
        )
    else:
        body = (
            f"발생과 심도가 모두 높습니다. 인수 조건을 신중히 보고, "
            f"{focus} 한도 확대와 안전운전 안내를 권장합니다."
        )

    if str(grade).upper() == "CRITICAL" and not (
        occ_b == "high" and sev_b == "high"
    ):
        body += " 종합 기대손실 등급이 위험대이므로 인수 전 한 번 더 확인해 주세요."

    return body
