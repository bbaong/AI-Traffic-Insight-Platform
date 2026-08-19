# -*- coding: utf-8 -*-
"""보험 상담원 챗봇 — Gemini가 기존 Express 백엔드 API를 호출합니다.

프론트와 무관. 조회·분석만 하며 고객 숨김/상담 저장은 하지 않습니다.

필요:
  pip install google-generativeai python-dotenv
  backend/.env 에 GEMINI_API_KEY, INS_CHAT_USER_ID
  Express 서버: npm run dev  (http://localhost:5000)

실행:
  python scripts/ins_chatbot.py
  python scripts/ins_chatbot.py -q "위험 점수 높은 고객 찾아줘"
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5000").rstrip("/")
INS_CHAT_USER_ID = os.environ.get("INS_CHAT_USER_ID", "").strip()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash").strip()
HTTP_TIMEOUT_SEC = float(os.environ.get("INS_CHAT_TIMEOUT", "20"))

KST = timezone(timedelta(hours=9))


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
class BackendError(RuntimeError):
    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


def _request(
    method: str,
    path: str,
    *,
    query: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
) -> Any:
    params = {k: v for k, v in (query or {}).items() if v is not None and v != ""}
    url = f"{BACKEND_URL}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)

    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    print(f"  → {method} {url}", file=sys.stderr)
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_SEC) as res:
            raw = res.read().decode("utf-8")
            payload = json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(detail) if detail else {}
        except json.JSONDecodeError:
            payload = {}
        msg = payload.get("message") or detail or e.reason
        raise BackendError(str(msg), e.code) from e
    except urllib.error.URLError as e:
        raise BackendError(
            f"백엔드에 연결하지 못했습니다 ({BACKEND_URL}). "
            "backend에서 npm run dev 를 실행했는지 확인하세요."
        ) from e

    if isinstance(payload, dict) and payload.get("success") is False:
        raise BackendError(str(payload.get("message") or "요청 실패"))
    return payload


def _data(payload: Any) -> Any:
    if isinstance(payload, dict) and "data" in payload:
        return payload["data"]
    return payload


def _err(exc: Exception) -> dict[str, Any]:
    status = getattr(exc, "status", None)
    return {"ok": False, "error": str(exc), "status": status}


# ---------------------------------------------------------------------------
# 개인정보 · 정규화
# ---------------------------------------------------------------------------
def mask_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 8:
        return "****"
    return f"{digits[:3]}-****-{digits[-4:]}"


def _parse_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def _slim_customer(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "customerId": row.get("customerId"),
        "name": row.get("name"),
        "phone": mask_phone(row.get("phone")),
        "consultationCount": row.get("consultationCount"),
        "lastConsultedAt": row.get("lastConsultedAt"),
        "lastStatus": row.get("lastStatus"),
        "lastConsultationType": row.get("lastConsultationType"),
        "lastRiskScore": row.get("lastRiskScore"),
        "lastRiskGrade": row.get("lastRiskGrade"),
        "lastRegion": row.get("lastRegion"),
        "lastAgeGroup": row.get("lastAgeGroup"),
        "lastGender": row.get("lastGender"),
        "lastVehicleType": row.get("lastVehicleType"),
    }


def _slim_consultation(row: dict[str, Any], *, with_checklist: bool) -> dict[str, Any]:
    riders = [
        {
            "riderName": r.get("riderKey"),
            "badge": r.get("badge"),
            "reason": r.get("reasonText"),
        }
        for r in (row.get("riders") or [])
    ]
    out: dict[str, Any] = {
        "consultationId": row.get("consultationId"),
        "consultationType": row.get("consultationType"),
        "status": row.get("status"),
        "consultedAt": row.get("consultedAt"),
        "counselorName": row.get("counselorName"),
        "riskScore": row.get("riskScore"),
        "riskGrade": row.get("riskGrade"),
        "profile": row.get("profile"),
        "memo": row.get("memo"),
        "riders": riders,
    }
    if with_checklist:
        out["checklist"] = [
            {"label": a.get("itemLabel"), "value": a.get("answerValue")}
            for a in (row.get("checklist") or [])
        ]
    return out


def _need_user_id() -> str:
    if not INS_CHAT_USER_ID:
        raise BackendError(
            "INS_CHAT_USER_ID 가 없습니다. backend/.env 에 상담원 user_id 를 넣으세요."
        )
    return INS_CHAT_USER_ID


# ---------------------------------------------------------------------------
# 백엔드 요청 함수 (응답 리턴)
# ---------------------------------------------------------------------------
def fetch_customers(q: str | None = None) -> list[dict[str, Any]]:
    """GET /api/customers — 상담원 고객 목록."""
    payload = _request(
        "GET",
        "/api/customers",
        query={"userId": _need_user_id(), "q": q or None},
    )
    rows = _data(payload)
    if not isinstance(rows, list):
        return []
    return [_slim_customer(r) for r in rows if isinstance(r, dict)]


def fetch_customer_consultations(customer_id: str) -> dict[str, Any]:
    """GET /api/customers/:id/consultations — 고객 상담 이력."""
    payload = _request(
        "GET",
        f"/api/customers/{urllib.parse.quote(str(customer_id), safe='')}",
        query={"userId": _need_user_id()},
    )
    consultations = _data(payload)
    customer = payload.get("customer") if isinstance(payload, dict) else None
    slim_consults = []
    if isinstance(consultations, list):
        for i, row in enumerate(consultations):
            if isinstance(row, dict):
                slim_consults.append(_slim_consultation(row, with_checklist=i == 0))
    return {
        "ok": True,
        "customer": {
            "customerId": (customer or {}).get("customerId") or str(customer_id),
            "name": (customer or {}).get("name"),
            "phone": mask_phone((customer or {}).get("phone")),
        },
        "consultations": slim_consults,
    }


def fetch_consultation_report(consultation_id: str) -> Any:
    """GET /api/consultations/:id/report — 담보 추천."""
    payload = _request(
        "GET",
        f"/api/consultations/{urllib.parse.quote(str(consultation_id), safe='')}/report",
    )
    return _data(payload)


def post_insurance_analyze(body: dict[str, Any]) -> Any:
    """POST /api/insurance/analyze — 위험도 예측 (DB 저장 없음)."""
    payload = _request("POST", "/api/insurance/analyze", body=body)
    return _data(payload)


def post_discount_riders(body: dict[str, Any]) -> Any:
    """POST /api/discount-riders/evaluate — 할인특약 판정 (DB 저장 없음)."""
    payload = _request("POST", "/api/discount-riders/evaluate", body=body)
    return _data(payload)


# ---------------------------------------------------------------------------
# Gemini 도구 (질문이 오면 여기로 연결)
# ---------------------------------------------------------------------------
def list_customers(
    query: str | None = None,
    limit: int = 8,
    recent_days: int | None = None,
) -> dict[str, Any]:
    """상담원이 등록한 고객 목록을 조회합니다.

    최근 상담 고객, 이름 검색에 사용합니다.
    query: 고객 이름(부분 일치). 없으면 전체.
    limit: 최대 건수 (1~20).
    recent_days: 최근 N일 이내 상담만. 예: 오늘에 가깝게 보려면 1 또는 7.
    """
    try:
        rows = fetch_customers(query)
        if recent_days and recent_days > 0:
            cutoff = datetime.now(timezone.utc) - timedelta(days=int(recent_days))
            filtered = []
            for r in rows:
                dt = _parse_dt(r.get("lastConsultedAt"))
                if dt is not None and dt >= cutoff:
                    filtered.append(r)
            rows = filtered
        rows = sorted(
            rows,
            key=lambda r: r.get("lastConsultedAt") or "",
            reverse=True,
        )
        cap = max(1, min(int(limit or 8), 20))
        return {
            "ok": True,
            "count": len(rows),
            "shown": min(cap, len(rows)),
            "customers": rows[:cap],
        }
    except Exception as e:
        return _err(e)


def find_high_risk_customers(
    min_score: float | None = None,
    grade: str | None = None,
    region: str | None = None,
    in_progress_only: bool = False,
    limit: int = 8,
) -> dict[str, Any]:
    """최근 상담 위험 점수가 높은 고객을 찾습니다.

    min_score: 이 점수 이상 (예: 70). 비우면 점수 있는 고객만 점수 내림차순.
    grade: Low / Moderate / High / Critical. 비우면 등급 필터 없음.
    region: 구·군 이름 (예: 동구).
    in_progress_only: True면 상담 상태가 IN_PROGRESS 인 고객만.
    """
    try:
        rows = fetch_customers()
        grade_n = (grade or "").strip().lower()
        region_n = (region or "").strip()
        matched: list[dict[str, Any]] = []
        for r in rows:
            score = r.get("lastRiskScore")
            if score is None:
                continue
            if min_score is not None and float(score) < float(min_score):
                continue
            if grade_n:
                g = str(r.get("lastRiskGrade") or "").lower()
                if g != grade_n:
                    continue
            if region_n and region_n not in str(r.get("lastRegion") or ""):
                continue
            if in_progress_only and r.get("lastStatus") != "IN_PROGRESS":
                continue
            matched.append(r)
        matched.sort(
            key=lambda r: (
                float(r.get("lastRiskScore") or 0),
                r.get("lastConsultedAt") or "",
            ),
            reverse=True,
        )
        cap = max(1, min(int(limit or 8), 20))
        return {
            "ok": True,
            "count": len(matched),
            "shown": min(cap, len(matched)),
            "customers": matched[:cap],
        }
    except Exception as e:
        return _err(e)


def get_customer_brief(name_or_id: str) -> dict[str, Any]:
    """고객 이름 또는 customerId로 최근 상담을 요약합니다.

    동명이인이면 후보 목록만 돌려줍니다. 그때는 customerId로 다시 호출하세요.
    """
    try:
        key = (name_or_id or "").strip()
        if not key:
            return {"ok": False, "error": "이름 또는 고객 id가 필요합니다."}

        customer_id = key if key.isdigit() else None
        if customer_id is None:
            hits = fetch_customers(key)
            exact = [h for h in hits if h.get("name") == key]
            pool = exact or hits
            if not pool:
                return {"ok": True, "found": False, "message": "해당 고객이 없습니다."}
            if len(pool) > 1:
                return {
                    "ok": True,
                    "found": True,
                    "multiple": True,
                    "message": "동명이인입니다. customerId로 다시 조회하세요.",
                    "candidates": pool[:10],
                }
            customer_id = str(pool[0].get("customerId"))

        detail = fetch_customer_consultations(customer_id)
        consults = detail.get("consultations") or []
        return {
            "ok": True,
            "found": True,
            "customer": detail.get("customer"),
            "latest": consults[0] if consults else None,
            "recentConsultations": consults[:3],
            "consultationCount": len(consults),
        }
    except Exception as e:
        return _err(e)


def get_coverage_report(consultation_id: str) -> dict[str, Any]:
    """저장된 상담 id로 표준담보 추천 리포트를 조회합니다."""
    try:
        cid = (consultation_id or "").strip()
        if not cid.isdigit():
            return {"ok": False, "error": "consultation_id 가 숫자가 아닙니다."}
        return {"ok": True, "report": fetch_consultation_report(cid)}
    except Exception as e:
        return _err(e)


def analyze_risk(
    district: str,
    age_group: str,
    gender: str,
    vehicle: str,
    day_night: str = "주간",
    road: str = "건조",
) -> dict[str, Any]:
    """가상 프로필의 보험 위험도를 예측합니다. DB에 저장하지 않습니다.

    district: 구군. 예: 동구, 수성구, 달성군.
    age_group: 예: 20대, 30대, 40대.
    gender: 남 또는 여.
    vehicle: 예: 승용, 이륜.
    day_night: 주간 또는 야간.
    road: 예: 건조, 젖음.
    """
    try:
        gender_n = (gender or "").strip()
        if gender_n in ("MALE", "남", "남성"):
            gender_n = "남"
        elif gender_n in ("FEMALE", "여", "여성"):
            gender_n = "여"
        result = post_insurance_analyze(
            {
                "구군": district,
                "연령대": age_group,
                "성별": gender_n,
                "차종": vehicle,
                "주야": day_night or "주간",
                "노면상태": road or "건조",
            }
        )
        return {"ok": True, "analysis": result}
    except Exception as e:
        return _err(e)


def evaluate_discount_riders(
    annual_mileage: str | None = None,
    blackbox_mounted: str | None = None,
    safe_driving_score_used: str | None = None,
    fcw_status: str | None = None,
    ldws_status: str | None = None,
    existing_discount_riders: str | None = None,
) -> dict[str, Any]:
    """체크리스트 조건으로 할인특약 배지를 판정합니다. DB에 저장하지 않습니다.

    annual_mileage: 예 '5,000km 이하', '5,000 ~ 10,000km'.
    blackbox_mounted: 예 '상시녹화형 장착', '미장착'.
    safe_driving_score_used: 예 '이용 중', '미이용'.
    fcw_status / ldws_status: 예 '출고 시 장착', '미장착'.
    existing_discount_riders: 이미 가입한 특약. 쉼표 구분 예 '마일리지,블랙박스'.
    """
    try:
        result = post_discount_riders(
            {
                "annual_mileage": annual_mileage,
                "blackbox_mounted": blackbox_mounted,
                "safe_driving_score_used": safe_driving_score_used,
                "fcw_status": fcw_status,
                "ldws_status": ldws_status,
                "existing_discount_riders": existing_discount_riders,
            }
        )
        return {"ok": True, "riders": result}
    except Exception as e:
        return _err(e)


TOOLS = [
    list_customers,
    find_high_risk_customers,
    get_customer_brief,
    get_coverage_report,
    analyze_risk,
    evaluate_discount_riders,
]

SYSTEM = """당신은 AI Traffic Insight 보험 상담 보조 챗봇입니다.
상담원이 고객·상담·위험도·특약을 빠르게 확인하도록 돕습니다.

규칙:
- 고객·상담·점수가 필요하면 반드시 도구를 호출하세요. 없는 고객을 만들지 마세요.
- 도구 결과만 근거로 답하세요. ok=false 이면 그 오류를 안내하세요.
- 전화번호는 마스킹된 값만 말하고, 원본 번호를 추측하지 마세요.
- 고객 삭제/숨김, 상담 저장, PDF 생성은 하지 마세요.
- 답은 한국어, 짧게. 목록은 이름 / 최근상담일 / 점수 / 등급 / 지역 형식으로.
- 일반 보험 상식 질문은 도구 없이 답해도 됩니다.
- 오늘 날짜(KST)는 {today} 입니다.
""".format(today=datetime.now(KST).strftime("%Y-%m-%d"))


def build_model():
    import google.generativeai as genai

    if not GEMINI_API_KEY:
        raise SystemExit(
            "GEMINI_API_KEY 가 없습니다. backend/.env 에 Gemini API 키를 넣으세요."
        )
    genai.configure(api_key=GEMINI_API_KEY)
    return genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        tools=TOOLS,
        system_instruction=SYSTEM,
    )


def ask(model, question: str, chat=None):
    if chat is None:
        chat = model.start_chat(enable_automatic_function_calling=True)
    response = chat.send_message(question)
    text = (response.text or "").strip()
    return chat, text or "(응답이 비었습니다.)"


def main() -> None:
    parser = argparse.ArgumentParser(description="보험 상담원 Gemini 챗봇")
    parser.add_argument("-q", "--question", help="한 번만 묻고 종료")
    args = parser.parse_args()

    print(f"backend: {BACKEND_URL}")
    print(f"userId:   {INS_CHAT_USER_ID or '(미설정)'}")
    print(f"model:    {GEMINI_MODEL}")
    model = build_model()

    if args.question:
        _, text = ask(model, args.question)
        print(text)
        return

    chat = model.start_chat(enable_automatic_function_calling=True)
    print("보험 상담 챗봇입니다. 종료: exit / quit")
    print('예: "최근 상담 고객 5명", "위험 점수 높은 고객", "동구 고위험 찾아줘"')
    while True:
        try:
            q = input("\n상담원> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not q:
            continue
        if q.lower() in {"exit", "quit", "q"}:
            break
        try:
            chat, text = ask(model, q, chat)
            print(text)
        except Exception as e:
            print(f"오류: {e}")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    main()
