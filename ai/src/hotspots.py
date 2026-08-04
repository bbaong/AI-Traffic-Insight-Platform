"""지자체별 교통사고 다발지역 (공식 TOP3) — KOROAD REST + 파일 캐시.

출처: 한국도로교통공단 OpenAPI
예:
  https://opendata.koroad.or.kr/data/rest/frequentzone/lg
    ?authKey=...&searchYearCd=2025119&sido=27&guGun=260&type=json

주의: searchYearCd 는 캘린더 연도(2024)가 아니라
      포털 「요청변수 코드」의 값(예: 2025119)인 경우가 많습니다.

환경변수:
  KOROAD_AUTH_KEY 또는 DATA_GO_KR_SERVICE_KEY  (필수)
  HOTSPOT_DEFAULT_YEAR    (searchYearCd, 기본 2025119)
  HOTSPOT_CACHE_TTL_HOURS (선택, 기본 168=7일)
"""

from __future__ import annotations

import json
import os
import time
from typing import Any
from urllib.parse import unquote

import httpx

from src import ROOT

API_URL = "https://opendata.koroad.or.kr/data/rest/frequentzone/lg"
CACHE_DIR = ROOT / "data" / "cache" / "hotspots"

# 대구광역시 법정동: sido=27, guGun=시군구코드 뒤 3자리
DAEGU_SIDO = "27"
DAEGU_GUGUN: dict[str, str] = {
    "중구": "110",
    "동구": "140",
    "서구": "170",
    "남구": "200",
    "북구": "230",
    "수성구": "260",
    "달서구": "290",
    "달성군": "710",
    "군위군": "720",
}

# 사용자가 확인한 유효 searchYearCd (캘린더 연도 ≠ 코드)
DEFAULT_SEARCH_YEAR_CD = 2025119

SOURCE_LABEL = "한국도로교통공단(TAAS) 지자체별 교통사고 다발지역"


def _auth_key() -> str:
    key = (
        os.getenv("KOROAD_AUTH_KEY")
        or os.getenv("DATA_GO_KR_SERVICE_KEY")
        or os.getenv("SERVICE_KEY")
        or ""
    ).strip().strip('"').strip("'")
    if not key:
        raise RuntimeError(
            "KOROAD_AUTH_KEY(또는 DATA_GO_KR_SERVICE_KEY) 환경변수가 없습니다. "
            "도로교통공단 OpenAPI 인증키를 ai/.env 에 설정하세요."
        )
    return unquote(key)


def _cache_ttl_seconds() -> float:
    # 기본 7일 — 공식 다발은 연 단위라 KOROAD 호출을 줄임
    hours = float(os.getenv("HOTSPOT_CACHE_TTL_HOURS", "168"))
    return max(hours, 0.0) * 3600.0


def _cache_path(sido: str, year_cd: int):
    return CACHE_DIR / f"hotspots_sido{sido}_{year_cd}.json"


def _default_year_cd() -> int:
    raw = (os.getenv("HOTSPOT_DEFAULT_YEAR") or "").strip()
    if raw:
        return int(raw)
    return DEFAULT_SEARCH_YEAR_CD


def _normalize_item(
    raw: dict[str, Any], *, year: int, 지역: str | None
) -> dict[str, Any] | None:
    try:
        lat = float(raw.get("la_crd"))
        lon = float(raw.get("lo_crd"))
    except (TypeError, ValueError):
        return None
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None

    def _int(key: str) -> int:
        try:
            return int(float(raw.get(key) or 0))
        except (TypeError, ValueError):
            return 0

    return {
        "lat": lat,
        "lon": lon,
        "name": str(raw.get("spot_nm") or ""),
        "region_label": str(raw.get("sido_sgg_nm") or ""),
        "지역": 지역,
        "count": _int("occrrnc_cnt"),
        "casualties": _int("caslt_cnt"),
        "fatal": _int("dth_dnv_cnt"),
        "severe": _int("se_dnv_cnt"),
        "slight": _int("sl_dnv_cnt"),
        "injury_report": _int("wnd_dnv_cnt"),
        "spot_code": str(raw.get("spot_cd") or ""),
        "afos_id": str(raw.get("afos_id") or ""),
        "year": year,
        "source": SOURCE_LABEL,
        "geom_json": raw.get("geom_json"),
    }


def _result_meta(payload: dict[str, Any]) -> tuple[str, str]:
    """resultCode / resultMsg — KOROAD 평탄 응답과 data.go.kr 래퍼 모두 지원."""
    if "resultCode" in payload or "resultMsg" in payload:
        return (
            str(payload.get("resultCode", "00")),
            str(payload.get("resultMsg") or ""),
        )
    body = payload.get("response")
    if isinstance(body, dict):
        header = body.get("header") or {}
        if isinstance(header, dict):
            return (
                str(header.get("resultCode", "00")),
                str(header.get("resultMsg") or ""),
            )
        if "resultCode" in body:
            return (
                str(body.get("resultCode", "00")),
                str(body.get("resultMsg") or ""),
            )
    return "00", ""


def _raw_items_node(payload: dict[str, Any]) -> Any:
    """items 노드 추출."""
    if "items" in payload:
        return payload.get("items")
    body = payload.get("response")
    if isinstance(body, dict):
        if "items" in body:
            return body.get("items")
        nested = body.get("body")
        if isinstance(nested, dict):
            return nested.get("items")
    return None


def _parse_items(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []

    code, msg = _result_meta(payload)
    # 03: 데이터 없음 → 빈 목록 (에러 아님)
    if code in ("03", "3"):
        return []
    if code not in ("00", "0", "NORMAL_CODE", ""):
        raise RuntimeError(f"공공데이터 API 오류[{code}]: {msg or code}")

    items = _raw_items_node(payload)
    if items is None or items == "" or items == {}:
        return []
    if isinstance(items, list):
        return [x for x in items if isinstance(x, dict)]
    if isinstance(items, dict):
        item = items.get("item")
        if item is None:
            return []
        if isinstance(item, list):
            return [x for x in item if isinstance(x, dict)]
        if isinstance(item, dict):
            return [item]
    return []


def _fetch_gugun(
    client: httpx.Client,
    *,
    year_cd: int,
    sido: str,
    gugun: str,
) -> list[dict[str, Any]]:
    # 사용자 확인 URL: searchYearCd + sido + guGun
    params = {
        "authKey": _auth_key(),
        "searchYearCd": str(year_cd),
        "sido": sido,
        "guGun": gugun,
        "type": "json",
        "numOfRows": "20",
        "pageNo": "1",
    }
    r = client.get(API_URL, params=params)
    r.raise_for_status()
    try:
        data = r.json()
    except json.JSONDecodeError as exc:
        text = r.text[:200]
        raise RuntimeError(f"JSON 파싱 실패 (구군={gugun}): {text}") from exc
    return _parse_items(data)


def _strip_polygons(payload: dict[str, Any], include: bool) -> dict[str, Any]:
    if include:
        return payload
    out = dict(payload)
    pts = []
    for p in payload.get("points") or []:
        q = dict(p)
        q.pop("geom_json", None)
        pts.append(q)
    out["points"] = pts
    return out


def fetch_hotspots(
    *,
    year: int,
    sido: str,
    regions: dict[str, str],
    include_polygon: bool = False,
    force_refresh: bool = False,
) -> dict[str, Any]:
    """year = KOROAD searchYearCd (예: 2025119)."""
    cache_file = _cache_path(sido, year)
    ttl = _cache_ttl_seconds()

    if not force_refresh and cache_file.exists():
        age = time.time() - cache_file.stat().st_mtime
        if age <= ttl:
            cached = json.loads(cache_file.read_text(encoding="utf-8"))
            if cached.get("points"):
                return _strip_polygons(cached, include_polygon)

    _auth_key()

    points: list[dict[str, Any]] = []
    errors: list[str] = []

    timeout = httpx.Timeout(30.0, connect=10.0)
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        for name, gugun in regions.items():
            try:
                raw_items = _fetch_gugun(
                    client, year_cd=year, sido=sido, gugun=gugun
                )
                for raw in raw_items:
                    row = _normalize_item(raw, year=year, 지역=name)
                    if row:
                        points.append(row)
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{name}({gugun}): {exc}")

    if not points and errors:
        raise RuntimeError(
            "다발지역을 가져오지 못했습니다. " + " | ".join(errors[:3])
        )

    payload = {
        "year": year,
        "searchYearCd": str(year),
        "sido": sido,
        "source": SOURCE_LABEL,
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "count": len(points),
        "points": points,
        "partial_errors": errors,
    }

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return _strip_polygons(payload, include_polygon)


def fetch_daegu_hotspots(
    year: int,
    *,
    include_polygon: bool = False,
    force_refresh: bool = False,
) -> dict[str, Any]:
    """대구 전 구·군 TOP3 다발지 조회 (파일 캐시)."""
    return fetch_hotspots(
        year=year,
        sido=DAEGU_SIDO,
        regions=DAEGU_GUGUN,
        include_polygon=include_polygon,
        force_refresh=force_refresh,
    )


def _year_cd_candidates(explicit: int | None) -> list[int]:
    if explicit is not None:
        return [int(explicit)]
    out: list[int] = []
    for y in (_default_year_cd(), DEFAULT_SEARCH_YEAR_CD):
        if y not in out:
            out.append(y)
    # 과거 캘린더 연도도 후보로 남겨 둠 (일부 데이터셋은 YYYY)
    import datetime as _dt

    y0 = int(_dt.date.today().year)
    for y in range(y0, y0 - 8, -1):
        if y not in out:
            out.append(y)
    return out


def fetch_daegu_hotspots_auto_year(
    *,
    year: int | None = None,
    include_polygon: bool = False,
    force_refresh: bool = False,
) -> dict[str, Any]:
    """year 미지정 시 HOTSPOT_DEFAULT_YEAR / 2025119 등 후보 순 조회."""
    candidates = _year_cd_candidates(year)
    last_err: Exception | None = None
    empty_tried: list[int] = []

    for y in candidates:
        cache_file = _cache_path(DAEGU_SIDO, y)
        if not force_refresh and cache_file.exists():
            age = time.time() - cache_file.stat().st_mtime
            if age <= _cache_ttl_seconds():
                cached = json.loads(cache_file.read_text(encoding="utf-8"))
                if cached.get("points"):
                    return _strip_polygons(cached, include_polygon)
        try:
            result = fetch_daegu_hotspots(
                y,
                include_polygon=include_polygon,
                force_refresh=force_refresh,
            )
            if result.get("points"):
                return result
            empty_tried.append(y)
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            continue

    if last_err:
        raise last_err
    raise RuntimeError(
        "사용 가능한 다발지역 데이터를 찾지 못했습니다. "
        f"시도한 searchYearCd={empty_tried or candidates}. "
        "HOTSPOT_DEFAULT_YEAR 또는 ?year= 에 요청변수 코드를 넣으세요 (예: 2025119)."
    )
