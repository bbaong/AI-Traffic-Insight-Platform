# -*- coding: utf-8 -*-
"""ETL: CSV → district_monthly_trend (구·군 × 월 사고 실적).

지역비교 추세 실선용. gov pkl과 무관.
  trend_month = YYYY-MM
  accident_count = 해당 월 사고 건수
  severe_death_count = 사망+중상 건수

기본 기간: CSV 최신 연도 기준 **직전 3개 연도** (예: 2023-01 ~ 2025-12)
  → 분기 차트에 최소 4~8분기 이상 확보
  ETL_PERIOD_START=YYYY-MM-DD
  ETL_PERIOD_END=YYYY-MM-DD
  ETL_ALL=1 이면 CSV 전체 기간
  ETL_YEARS_BACK=N  (기본 3, ETL_ALL/기간 지정 없을 때)
  ETL_CSV=... (선택)
  ETL_DRY_RUN=1 이면 DB 미기록

사용:
  python scripts/etl_district_monthly_trend.py
  ETL_DRY_RUN=1 python scripts/etl_district_monthly_trend.py
"""

from __future__ import annotations

import os
from datetime import date, datetime
from pathlib import Path
from urllib.parse import unquote, urlparse

import pandas as pd
import pymysql

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CSV = ROOT / "data" / "raw" / "사고분석_2016~2025_원본합본.csv"
SEVERE = {"사망사고", "중상사고"}


def load_database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if url:
        return url
    env_path = ROOT.parent / "backend" / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit(
        "DATABASE_URL 이 없습니다. 환경변수 또는 backend/.env 를 설정하세요."
    )


def parse_mysql_url(url: str) -> dict:
    u = urlparse(url)
    if u.scheme not in ("mysql", "mysql+pymysql"):
        raise SystemExit(f"지원하지 않는 DATABASE_URL scheme: {u.scheme}")
    return {
        "host": u.hostname or "127.0.0.1",
        "port": u.port or 3306,
        "user": unquote(u.username or ""),
        "password": unquote(u.password or ""),
        "database": (u.path or "").lstrip("/"),
        "charset": "utf8mb4",
        "cursorclass": pymysql.cursors.DictCursor,
        "autocommit": False,
    }


def parse_ymd(s: str) -> date:
    return datetime.strptime(s.strip(), "%Y-%m-%d").date()


def load_accidents(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        raise SystemExit(
            f"CSV 없음: {csv_path}\n"
            "ai/data/raw/ 에 사고분석_2016~2025_원본합본.csv 를 두거나 "
            "ETL_CSV=경로 로 지정하세요."
        )
    df = pd.read_csv(
        csv_path,
        encoding="utf-8-sig",
        usecols=["발생년월", "시군구", "사고내용"],
    )
    df["지역"] = (
        df["시군구"]
        .astype(str)
        .str.replace(r"^대구광역시\s*", "", regex=True)
        .str.strip()
    )
    text = df["발생년월"].astype(str).str.replace(" ", "", regex=False)
    year = text.str.extract(r"(\d{4})년")[0]
    month = text.str.extract(r"년(\d{1,2})월")[0]
    df = df.dropna(subset=["지역"])
    df = df[year.notna() & month.notna()].copy()
    df["연도"] = year.astype(int)
    df["월"] = month.astype(int)
    df["사고일"] = pd.to_datetime(
        dict(year=df["연도"], month=df["월"], day=1), errors="coerce"
    )
    df = df.dropna(subset=["사고일"])
    df["trend_month"] = df["사고일"].dt.strftime("%Y-%m")
    df["중대"] = df["사고내용"].astype(str).isin(SEVERE).astype(int)
    return df


def resolve_period(df: pd.DataFrame) -> tuple[date, date]:
    start_env = os.environ.get("ETL_PERIOD_START", "").strip()
    end_env = os.environ.get("ETL_PERIOD_END", "").strip()
    if start_env and end_env:
        return parse_ymd(start_env), parse_ymd(end_env)
    if start_env or end_env:
        raise SystemExit("ETL_PERIOD_START 와 ETL_PERIOD_END 를 함께 지정하세요.")

    if os.environ.get("ETL_ALL", "").strip() in ("1", "true", "True", "YES"):
        min_ts = df["사고일"].min()
        max_ts = df["사고일"].max()
        return min_ts.date().replace(day=1), date(max_ts.year, max_ts.month, 1)

    years_back = int(os.environ.get("ETL_YEARS_BACK", "3") or "3")
    if years_back < 1:
        years_back = 1
    max_year = int(df["연도"].max())
    start_year = max_year - years_back + 1
    return date(start_year, 1, 1), date(max_year, 12, 1)


def month_range(start: date, end: date) -> list[str]:
    """inclusive YYYY-MM list from start month through end month."""
    cur = date(start.year, start.month, 1)
    end_m = date(end.year, end.month, 1)
    out: list[str] = []
    while cur <= end_m:
        out.append(cur.strftime("%Y-%m"))
        if cur.month == 12:
            cur = date(cur.year + 1, 1, 1)
        else:
            cur = date(cur.year, cur.month + 1, 1)
    return out


def aggregate(
    df: pd.DataFrame, period_start: date, period_end: date
) -> pd.DataFrame:
    start_ts = pd.Timestamp(date(period_start.year, period_start.month, 1))
    end_ts = pd.Timestamp(date(period_end.year, period_end.month, 1))
    work = df[(df["사고일"] >= start_ts) & (df["사고일"] <= end_ts)].copy()
    if work.empty:
        raise SystemExit(
            f"기간 {period_start}~{period_end} 에 해당하는 사고가 없습니다."
        )

    g = (
        work.groupby(["지역", "trend_month"], as_index=False)
        .agg(
            accident_count=("trend_month", "size"),
            severe_death_count=("중대", "sum"),
        )
    )

    regions = sorted(work["지역"].unique().tolist())
    months = month_range(period_start, period_end)
    grid = pd.MultiIndex.from_product(
        [regions, months], names=["지역", "trend_month"]
    ).to_frame(index=False)
    out = grid.merge(g, on=["지역", "trend_month"], how="left")
    out["accident_count"] = out["accident_count"].fillna(0).astype(int)
    out["severe_death_count"] = out["severe_death_count"].fillna(0).astype(int)
    return out


def main() -> None:
    dry = os.environ.get("ETL_DRY_RUN", "").strip() in ("1", "true", "True", "YES")
    csv_path = Path(os.environ.get("ETL_CSV", str(DEFAULT_CSV)))

    print("=== ETL district_monthly_trend ===")
    print(f"CSV: {csv_path}")
    raw = load_accidents(csv_path)
    period_start, period_end = resolve_period(raw)
    print(f"period: {period_start} ~ {period_end}")

    agg = aggregate(raw, period_start, period_end)
    months = month_range(period_start, period_end)
    print(
        f"agg rows: {len(agg)} "
        f"(regions={agg['지역'].nunique()} × months={len(months)})"
    )
    print(
        f"  total accidents: {int(agg['accident_count'].sum())}  "
        f"severe+death: {int(agg['severe_death_count'].sum())}"
    )
    print(f"  sample months: {months[:3]} ... {months[-3:]}")

    cfg = parse_mysql_url(load_database_url())
    print(f"DB: {cfg['host']}/{cfg['database']}  dry_run={dry}")

    conn = pymysql.connect(**cfg)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT district_id, district_name FROM districts")
            name_to_id = {
                str(r["district_name"]).strip(): int(r["district_id"])
                for r in cur.fetchall()
            }
            if not name_to_id:
                raise SystemExit("districts 테이블이 비어 있습니다.")

            missing = sorted(set(agg["지역"].astype(str)) - set(name_to_id.keys()))
            if missing:
                raise SystemExit(
                    f"districts 에 없는 지역: {missing}. "
                    f"DB 구명={sorted(name_to_id.keys())}"
                )

            rows = []
            for _, r in agg.iterrows():
                did = name_to_id[str(r["지역"])]
                rows.append(
                    (
                        did,
                        str(r["trend_month"]),
                        int(r["accident_count"]),
                        int(r["severe_death_count"]),
                    )
                )

            if dry:
                print(f"DRY_RUN: would upsert {len(rows)} rows")
                for sample in rows[:8]:
                    print(" ", sample)
                return

            # 기간 내 월만 교체 (다른 연도 데이터 보존)
            month_list = months
            placeholders = ",".join(["%s"] * len(month_list))
            cur.execute(
                f"""
                DELETE FROM district_monthly_trend
                WHERE trend_month IN ({placeholders})
                """,
                month_list,
            )
            deleted = cur.rowcount

            cur.executemany(
                """
                INSERT INTO district_monthly_trend (
                  district_id, trend_month, accident_count, severe_death_count
                ) VALUES (%s, %s, %s, %s)
                """,
                rows,
            )
        conn.commit()
        print(f"OK deleted={deleted} inserted={len(rows)}")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
