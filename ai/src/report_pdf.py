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

_playwright = None
_browser = None

def _get_browser():
    global _playwright, _browser
    browsers_dir = _configure_playwright_browsers_path()
    exe = _find_chromium_executable(browsers_dir)
    if _browser is not None and _browser.is_connected():
        return _browser
    from playwright.sync_api import sync_playwright
    _playwright = sync_playwright().start()
    if exe is not None:
        _browser = _playwright.chromium.launch(
            executable_path=str(exe),
            headless=True,
        )
    else:
        _browser = _playwright.chromium.launch(headless=True)
    return _browser


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
    try:
        browser = _get_browser()
        page = browser.new_page()
        try:
            page.set_content(html, wait_until="load")
            return page.pdf(
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
            page.close()
    except PlaywrightError as e:
        msg = str(e)
        if "Executable doesn't exist" in msg or "chromium" in msg.lower():
            raise RuntimeError(
                "Playwright Chromium이 없습니다. "
                "`python -m playwright install chromium` 후 AI 서버를 재시작하세요."
            ) from e
        raise

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

_SEVERITY_KEYS = ("사망사고", "중상사고", "경상사고", "부상신고사고")
_SEVERITY_COLORS = {
    "사망사고": "#E53935",
    "중상사고": "#FF8A4C",
    "경상사고": "#F0B429",
    "부상신고사고": "#43A047",
}

_COMPARE_METRICS = (
    ("보행자 사고", "pedestrianPct", "pedestrianCount"),
    ("야간 사고", "nightPct", "nightCount"),
    ("중상 이상", "seriousPct", "seriousCount"),
    ("신호위반", "signalPct", "signalCount"),
)


def _build_comparison_bars(comparison: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not comparison:
        return []
    district = comparison.get("district") or {}
    city = comparison.get("cityAvg") or {}
    vals: list[float] = []
    for _, pct_key, _ in _COMPARE_METRICS:
        vals.append(float(district.get(pct_key) or 0))
        vals.append(float(city.get(pct_key) or 0))
    scale = max(vals) if vals else 1.0
    if scale <= 0:
        scale = 1.0
    rows = []
    for label, pct_key, count_key in _COMPARE_METRICS:
        d = float(district.get(pct_key) or 0)
        c = float(city.get(pct_key) or 0)
        rows.append(
            {
                "label": label,
                "district_pct": d,
                "city_pct": c,
                "district_count": int(district.get(count_key) or 0),
                "city_count": int(city.get(count_key) or 0),
                "district_bar": round(d / scale * 100, 1),
                "city_bar": round(c / scale * 100, 1),
            }
        )
    return rows

def _build_severity_chart(series: list[dict[str, Any]] | None) -> dict[str, Any] | None:
    if not series:
        return None
    w, h = 520, 200
    pad_l, pad_r, pad_t, pad_b = 36, 24, 16, 36
    plot_w = w - pad_l - pad_r
    plot_h = h - pad_t - pad_b
    n = len(series)
    max_v = 1.0
    for p in series:
        counts = p.get("counts") or {}
        for k in _SEVERITY_KEYS:
            max_v = max(max_v, float(counts.get(k) or 0))
    # nice max (대시보드와 비슷하게)
    padded = max_v * 1.12
    step = 10 if padded <= 50 else 25 if padded <= 200 else 50
    max_y = int(__import__("math").ceil(padded / step) * step)

    def x_at(i: int) -> float:
        if n <= 1:
            return pad_l + plot_w / 2
        return pad_l + (i / (n - 1)) * plot_w

    def y_at(v: float) -> float:
        return pad_t + plot_h - (v / max_y) * plot_h

    lines = []
    for key in _SEVERITY_KEYS:
        pts = []
        for i, p in enumerate(series):
            counts = p.get("counts") or {}
            pts.append(f"{x_at(i):.1f},{y_at(float(counts.get(key) or 0)):.1f}")
        lines.append(
            {
                "key": key,
                "color": _SEVERITY_COLORS[key],
                "points": " ".join(pts),
            }
        )

    labels = []
    for i, p in enumerate(series):
        labels.append(
            {
                "x": x_at(i),
                "text": p.get("label") or "",
                "forecast": p.get("kind") == "forecast",
            }
        )

    ticks = list(range(0, max_y + 1, step if step else 10))
    if ticks[-1] != max_y:
        ticks.append(max_y)

    return {
        "width": w,
        "height": h,
        "pad_l": pad_l,
        "pad_t": pad_t,
        "plot_w": plot_w,
        "plot_h": plot_h,
        "max_y": max_y,
        "y_ticks": [{"v": t, "y": y_at(t)} for t in ticks],
        "lines": lines,
        "labels": labels,
        "legend": [
            {"key": k, "color": _SEVERITY_COLORS[k]} for k in _SEVERITY_KEYS
        ],
    }

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
    dashboard: dict[str, Any] | None = None,
) -> bytes:
    """Build GOV admin PDF from dashboard snapshot, or re-run predict as fallback."""
    if dashboard:
        comparison = dashboard.get("comparison")
        context = {
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "author_name": (작성자 or "").strip() or "-",
            "org_name": (기관 or "").strip() or "-",
            "district_name": 지역,
            "period_label": dashboard.get("period_label") or "-",
            "top3": dashboard.get("top3") or [],
            "selected": dashboard.get("selected") or {},
            "recommendation": (
                f"대시보드 스냅샷 기준 · "
                f"예상사고 {(dashboard.get('selected') or {}).get('count', 0)}건"
            ),
            "comparison": comparison,
            "comparisonBars": _build_comparison_bars(comparison),
            "suggestions": dashboard.get("suggestions") or [],
            "severityLatest": dashboard.get("severityLatest") or [],
            "severityChart": _build_severity_chart(
                dashboard.get("severitySeries")
            ),
            "includeSummary": bool(dashboard.get("includeSummary", True)),
        }
    else:
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
            "comparison": None,
            "comparisonBars": [],
            "suggestions": [],
            "severityLatest": [],
            "severityChart": None,
            "includeSummary": True,
        }

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    html = env.get_template("gov_admin_report.html").render(**context)
    return _html_to_pdf_bytes(html)