"""Standard auto-insurance coverage recommendation rules (InsureGuard).

Threshold is temporary (30%). Product/UW may change THRESHOLD later.
"""

from __future__ import annotations

from typing import Any

# Temporary threshold (spec). Values in violation_probs are 0~1 ratios.
THRESHOLD = 0.30

COVERAGE_ORDER = (
    "대인배상 I",
    "대인배상 II",
    "대물배상",
    "자동차상해(자상)",
    "자기차량손해(자차)",
    "무보험차상해",
)


def _pct(p: float) -> str:
    return f"{p * 100:.1f}%"


def _prob(violation_probs: dict[str, float], *keywords: str) -> float:
    """Best matching probability for any keyword substring in keys."""
    best = 0.0
    for key, val in violation_probs.items():
        if any(k in str(key) for k in keywords):
            best = max(best, float(val))
    return best


def _is_twenties(age: str) -> bool:
    a = (age or "").strip()
    return a.startswith("21-30") or "20대" in a or a.startswith("20-")


def _grade_rank(grade: str) -> int:
    order = {"LOW": 0, "MODERATE": 1, "HIGH": 2, "CRITICAL": 3}
    return order.get(str(grade).upper(), 1)


def recommend_coverages(
    *,
    grade: str,
    age: str,
    violation_probs: dict[str, float],
    threshold: float = THRESHOLD,
) -> list[dict[str, Any]]:
    """Return 6 coverage cards: id, name, recommended, script, reason."""
    g = str(grade).upper()
    unsafe = _prob(violation_probs, "안전운전불이행")
    signal = _prob(violation_probs, "신호위반")
    distance = _prob(violation_probs, "안전거리미확보")
    twenties = _is_twenties(age)
    high_or_more = _grade_rank(g) >= _grade_rank("HIGH")
    critical = g == "CRITICAL"

    items: list[dict[str, Any]] = []

    # 1) 대인배상 I — always
    items.append(
        {
            "id": "bodily_i",
            "name": "대인배상 I",
            "recommended": True,
            "script": "대인배상 I은 의무보험으로, 가입이 필수입니다. 기본 안내를 진행해 주세요.",
            "reason": "의무보험 — 조건 판단 없음",
        }
    )

    # 2) 대인배상 II
    rec2 = critical or unsafe >= threshold or signal >= threshold
    items.append(
        {
            "id": "bodily_ii",
            "name": "대인배상 II",
            "recommended": rec2,
            "script": (
                "위험 성향이 높아 대인배상 II 한도 확대를 권해 드립니다."
                if rec2
                else "현재 조건에서는 대인배상 II 추가 권고 우선순위가 낮습니다."
            ),
            "reason": (
                f"등급={g}, 안전운전불이행={_pct(unsafe)}, 신호위반={_pct(signal)}, 기준={_pct(threshold)}"
            ),
        }
    )

    # 3) 대물배상
    rec3 = distance >= threshold
    items.append(
        {
            "id": "property",
            "name": "대물배상",
            "recommended": rec3,
            "script": (
                "안전거리 미확보 성향이 있어 대물배상 한도 5억~10억 상향을 권장합니다."
                if rec3
                else "대물배상 한도 상향 권고 조건에는 해당하지 않습니다."
            ),
            "reason": f"안전거리미확보={_pct(distance)}, 기준={_pct(threshold)}",
        }
    )

    # 4) 자동차상해
    rec4 = critical or twenties
    items.append(
        {
            "id": "personal_injury",
            "name": "자동차상해(자상)",
            "recommended": rec4,
            "script": (
                "자기신체사고 대신 자동차상해(자상) 전환을 권장합니다."
                if rec4
                else "현재는 자상 전환 우선 권고 대상이 아닙니다."
            ),
            "reason": f"등급={g}, 20대여부={twenties}",
        }
    )

    # 5) 자기차량손해
    rec5 = unsafe >= threshold
    items.append(
        {
            "id": "own_damage",
            "name": "자기차량손해(자차)",
            "recommended": rec5,
            "script": (
                "단독사고 위험 근거로 자기차량손해(자차) 특약을 검토해 주세요."
                if rec5
                else "자차 권고 기준(안전운전불이행)에는 해당하지 않습니다."
            ),
            "reason": f"안전운전불이행={_pct(unsafe)}, 기준={_pct(threshold)}",
        }
    )

    # 6) 무보험차상해
    rec6 = twenties or high_or_more
    items.append(
        {
            "id": "uninsured",
            "name": "무보험차상해",
            "recommended": rec6,
            "script": (
                "초보·고위험 구간에 해당해 무보험차상해 담보 안내를 권장합니다."
                if rec6
                else "무보험차상해 우선 권고 조건에는 해당하지 않습니다."
            ),
            "reason": f"20대여부={twenties}, 등급={g} (HIGH 이상={high_or_more})",
        }
    )

    return items