"""지자체별 교통사고 다발지역 (공식 TOP3) — 공공데이터 REST 클라이언트 + 파일 캐시.

출처: 한국도로교통공단 / TAAS
API: https://apis.data.go.kr/B552061/frequentzoneLg/getRestFrequentzoneLg

환경변수:
  DATA_GO_KR_SERVICE_KEY  (필수) 공공데이터포털 인증키
  HOTSPOT_CACHE_TTL_HOURS (선택, 기본 24)
  HOTSPOT_DEFAULT_YEAR    (선택, 없으면 최근 연도부터 탐색)
"""

from __future__ import annotations

import datetime as dt
import json
import os
import time
from typing import Any

import httpx

from src import ROOT

API_URL = "https://opendata.koroad.or.kr/data/rest/frequentzone/lg?"
CACHE_DIR = ROOT / "data" / "cache" / "hotspots"

# 대구광역시 법정동: siDo=27, guGun=시군구코드 뒤 3자리
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

SOURCE_LABEL = "한국도로교통공단(TAAS) 지자체별 교통사고 다발지역"


def _service_key() -> str:
    key = (
        os.getenv("DATA_GO_KR_SERVICE_KEY")
        or os.getenv("SERVICE_KEY")
        or ""
    ).strip()
    if not key:
        raise RuntimeError(
            "DATA_GO_KR_SERVICE_KEY 환경변수가 없습니다. "
            "공공데이터포털에서 발급받은 인증키를 ai/.env 에 설정하세요."
        )
    return key


def _cache_ttl_seconds() -> float:
    hours = float(os.getenv("HOTSPOT_CACHE_TTL_HOURS", "24"))
    return max(hours, 0.0) * 3600.0


def _cache_path(sido: str, year: int):
    return CACHE_DIR / f"hotspots_sido{sido}_{year}.json"


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


def _parse_items(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    body = payload.get("response", payload)
    if not isinstance(body, dict):
        return []
    header = body.get("header") or {}
    code = str(header.get("resultCode", "00"))
    if code not in ("00", "0", "NORMAL_CODE", ""):
        msg = header.get("resultMsg") or code
        raise RuntimeError(f"공공데이터 API 오류: {msg}")

    items = (body.get("body") or {}).get("items")
    if items is None or items == "" or items == {}:
        return []
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
    year: int,
    sido: str,
    gugun: str,
) -> list[dict[str, Any]]:
    params = {
        "serviceKey": _service_key(),
        "searchYearCd": str(year),
        "siDo": sido,
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
    cache_file = _cache_path(sido, year)
    ttl = _cache_ttl_seconds()

    if not force_refresh and cache_file.exists():
        age = time.time() - cache_file.stat().st_mtime
        if age <= ttl:
            cached = json.loads(cache_file.read_text(encoding="utf-8"))
            return _strip_polygons(cached, include_polygon)

    # 루프 전에 한 번만 검증 (구군별 동일 에러 반복 방지)
    _service_key()

    points: list[dict[str, Any]] = []
    errors: list[str] = []

    timeout = httpx.Timeout(30.0, connect=10.0)
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        for name, gugun in regions.items():
            try:
                raw_items = _fetch_gugun(
                    client, year=year, sido=sido, gugun=gugun
                )
                for raw in raw_items:
                    row = _normalize_item(raw, year=year, 지역=name)
                    if row:
                        points.append(row)
            except Exception as exc:  # noqa: BLE001 — 구군 단위 부분 실패 허용
                errors.append(f"{name}({gugun}): {exc}")

    if not points and errors:
        raise RuntimeError(
            "다발지역을 가져오지 못했습니다. " + " | ".join(errors[:3])
        )

    payload = {
        "year": year,
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


def fetch_daegu_hotspots_auto_year(
    *,
    year: int | None = None,
    include_polygon: bool = False,
    force_refresh: bool = False,
) -> dict[str, Any]:
    """연도 미지정 시 캐시·최신 후보 순으로 조회."""
    if year is not None:
        return fetch_daegu_hotspots(
            year,
            include_polygon=include_polygon,
            force_refresh=force_refresh,
        )

    candidates: list[int] = []
    env_y = os.getenv("HOTSPOT_DEFAULT_YEAR")
    if env_y:
        candidates.append(int(env_y))
    y0 = int(dt.date.today().year)
    for y in range(y0, y0 - 6, -1):
        if y not in candidates:
            candidates.append(y)

    last_err: Exception | None = None
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
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            continue

    if last_err:
        raise last_err
    raise RuntimeError("사용 가능한 다발지역 연도 데이터를 찾지 못했습니다.")
