"""Build consult PDF via Jinja2 HTML + Playwright Chromium."""

from __future__ import annotations

import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

from src.gov_inference import predict_gov_rates
from src.inference import predict_from_input

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = ROOT / "templates"


def _stable_browsers_dir() -> Path:
    override = (os.environ.get("AI_PLAYWRIGHT_BROWSERS_PATH") or "").strip()
    if override:
        return Path(override)
    local = os.environ.get("LOCALAPPDATA") or os.environ.get("HOME") or str(Path.home())
    return Path(local) / "ms-playwright"


def _configure_playwright_browsers_path() -> Path:
    """Force a stable browser dir; Cursor sandbox cache often lacks binaries."""
    preferred = _stable_browsers_dir()
    preferred.mkdir(parents=True, exist_ok=True)
    current = (os.environ.get("PLAYWRIGHT_BROWSERS_PATH") or "").strip()
    current_norm = current.replace("\\", "/").lower()
    if (
        not current
        or "cursor-sandbox-cache" in current_norm
        or not Path(current).exists()
    ):
        os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(preferred)
    os.environ.setdefault("PLAYWRIGHT_CHROMIUM_USE_HEADLESS_SHELL", "0")
    return Path(os.environ["PLAYWRIGHT_BROWSERS_PATH"])


# uvicorn may inherit PLAYWRIGHT_BROWSERS_PATH=cursor-sandbox-cache
_configure_playwright_browsers_path()


def _find_chromium_executable(browsers_dir: Path) -> Path | None:
    patterns = (
        "chromium-*/chrome-win64/chrome.exe",
        "chromium-*/chrome-linux/chrome",
        "chromium-*/chrome-mac*/Chromium",
        "chromium_headless_shell-*/chrome-headless-shell-win64/chrome-headless-shell.exe",
        "chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell",
    )
    for pat in patterns:
        found = sorted(browsers_dir.glob(pat), reverse=True)
        if found and found[0].is_file():
            return found[0]
    return None


def _render_html(context: dict[str, Any]) -> str:
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    tpl = env.get_template("ins_consult_report.html")
    return tpl.render(**context)


def _html_to_pdf_bytes(html: str) -> bytes:
    browsers_dir = _configure_playwright_browsers_path()
    exe = _find_chromium_executable(browsers_dir)
    try:
        with sync_playwright() as p:
            if exe is not None:
                browser = p.chromium.launch(
                    executable_path=str(exe),
                    headless=True,
                )
            else:
                browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                page.set_content(html, wait_until="networkidle")
                pdf = page.pdf(
                    format="A4",
                    print_background=True,
                    margin={
                        "top": "12mm",
                        "bottom": "12mm",
                        "left": "12mm",
                        "right": "12mm",
                    },
                )
            finally:
                browser.close()
    except PlaywrightError as exc:
        msg = str(exc)
        if "Executable doesn't exist" in msg or "playwright install" in msg.lower():
            raise RuntimeError(
                "Playwright Chromium이 없습니다. "
                f"브라우저 경로: {browsers_dir}\n"
                "외부 터미널(같은 Python)에서:\n"
                f'  set PLAYWRIGHT_BROWSERS_PATH={browsers_dir}\n'
                "  python -m playwright install chromium\n"
                "설치 후 AI(uvicorn)를 재시작하세요."
            ) from exc
        raise
    return pdf

def build_ins_report_pdf(
    *,
    구군: str,
    연령대: str,
    성별: str,
    차종: str,
    고객명: str | None = None,
    작성자: str | None = None,
    memo: str | None = None,
) -> bytes:
    """Same calculation path as on-screen: predict + coverage rules → PDF."""
    prediction = predict_from_input(
        구군=구군,
        연령대=연령대,
        성별=성별,
        차종=차종,
    )
    top = sorted(
        prediction.get("등급확률", {}).items(),
        key=lambda x: x[1],
        reverse=True,
    )[:3]
    memo_text = (memo or "").strip() or None
    context = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "customer_name": (고객명 or "").strip() or None,
        "author_name": (작성자 or "").strip() or "-",
        "profile": {
            "구군": 구군,
            "연령대": 연령대,
            "성별": 성별,
            "차종": 차종,
        },
        "prediction": prediction,
        "top_violations": top,
        "coverages": prediction.get("담보추천") or [],
        "memo": memo_text,
    }
    html = _render_html(context)
    return _html_to_pdf_bytes(html)


def _format_period(raw: str | None) -> str:
    if not raw:
        return "-"

    q = re.match(r"^(\d{4})Q([1-4])$", str(raw), re.I)
    if q:
        return f"{q.group(1)}년 {q.group(2)}분기"
    h = re.match(r"^(\d{4})H([12])$", str(raw), re.I)
    if h:
        half = "상반기" if h.group(2) == "1" else "하반기"
        return f"{h.group(1)}년 {half}"
    return str(raw)


def _pred_count(row: dict[str, Any]) -> int:
    v = row.get("예측사고건수")
    if v is None:
        v = row.get("추정_다음분기사고건수")
    try:
        return int(v or 0)
    except (TypeError, ValueError):
        return 0


def build_gov_report_pdf(
    *,
    지역: str,
    as_of: str | None = None,
    freq: str = "Q",
    작성자: str | None = None,
    기관: str | None = None,
) -> bytes:
    """Re-run GovGuard predict (all districts) → TOP3 + selected district PDF."""
    rows = predict_gov_rates(지역=None, as_of=as_of, freq=freq)
    if isinstance(rows, dict):
        rows = [rows]
    if not rows:
        raise ValueError("예측 결과가 비어 있습니다.")

    selected = next((r for r in rows if str(r.get("지역")) == 지역), None)
    if selected is None:
        raise ValueError(f"지역을 찾을 수 없습니다: {지역}")

    by_severe = sorted(
        rows,
        key=lambda r: float(r.get("예측중대사고율_퍼센트") or 0),
        reverse=True,
    )
    top3 = []
    for i, r in enumerate(by_severe[:3], start=1):
        top3.append(
            {
                "rank": i,
                "region": r.get("지역"),
                "severe_rate": float(r.get("예측중대사고율_퍼센트") or 0),
                "count": _pred_count(r),
                "grade": r.get("중대사고등급") or "MODERATE",
            }
        )

    total = _pred_count(selected)
    types = selected.get("예측사고유형_퍼센트") or {}
    type_items = sorted(
        (
            (name, int(round(float(pct) / 100.0 * total)))
            for name, pct in types.items()
        ),
        key=lambda x: x[1],
        reverse=True,
    )

    base = _format_period(selected.get("기준분기"))
    nxt = _format_period(selected.get("예측분기"))
    period_label = (
        f"{base} → {nxt}" if base != "-" or nxt != "-" else "-"
    )
    severe = float(selected.get("예측중대사고율_퍼센트") or 0)
    recommendation = (
        f"예측기간 {nxt} · 참고 예상사고 {total}건 · "
        "사고유형은 기준분기 실적 비율"
    )

    context = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "author_name": (작성자 or "").strip() or "-",
        "org_name": (기관 or "").strip() or "-",
        "district_name": 지역,
        "period_label": period_label,
        "top3": top3,
        "selected": {
            "grade": selected.get("중대사고등급") or "MODERATE",
            "severe_rate": severe,
            "count": total,
            "types": type_items,
        },
        "recommendation": recommendation,
    }
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    html = env.get_template("gov_admin_report.html").render(**context)
    return _html_to_pdf_bytes(html)