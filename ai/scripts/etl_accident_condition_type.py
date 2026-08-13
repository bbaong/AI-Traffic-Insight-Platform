# -*- coding: utf-8 -*-
"""ETL: CSV → accident_condition_stats (ACCIDENT_TYPE 대분류).

지역비교 A안용. gov pkl과 무관.
  dimension = ACCIDENT_TYPE
  dimension_value ∈ {차대차, 차대사람, 차량단독}

기본 기간: CSV에 존재하는 최신 연도의 1/1~12/31
  ETL_PERIOD_START=YYYY-MM-DD
  ETL_PERIOD_END=YYYY-MM-DD
  ETL_CSV=... (선택)
  ETL_DRY_RUN=1 이면 DB 미기록

사용:
  python scripts/etl_accident_condition_type.py
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
TYPE_ORDER = ["차대차", "차대사람", "차량단독"]
SEVERE = {"사망사고", "중상사고"}
DIMENSION = "ACCIDENT_TYPE"


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
        raise SystemExit(f"CSV 없음: {csv_path}")
    df = pd.read_csv(
        csv_path,
        encoding="utf-8-sig",
        usecols=["발생년월", "시군구", "사고유형", "사고내용"],
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
    df["사고유형대분류"] = (
        df["사고유형"].astype(str).str.split(" - ").str[0].str.strip()
    )
    df = df[df["사고유형대분류"].isin(TYPE_ORDER)]
    df["중대"] = df["사고내용"].astype(str).isin(SEVERE).astype(int)
    return df


def resolve_period(df: pd.DataFrame) -> tuple[date, date]:
    start_env = os.environ.get("ETL_PERIOD_START", "").strip()
    end_env = os.environ.get("ETL_PERIOD_END", "").strip()
    if start_env and end_env:
        return parse_ymd(start_env), parse_ymd(end_env)
    if start_env or end_env:
        raise SystemExit("ETL_PERIOD_START 와 ETL_PERIOD_END 를 함께 지정하세요.")
    max_year = int(df["연도"].max())
    return date(max_year, 1, 1), date(max_year, 12, 31)


def aggregate(
    df: pd.DataFrame, period_start: date, period_end: date
) -> pd.DataFrame:
    start_ts = pd.Timestamp(period_start)
    # 월 단위 CSV이므로 period_end 월의 1일을 포함
    end_ts = pd.Timestamp(date(period_end.year, period_end.month, 1))
    work = df[(df["사고일"] >= start_ts) & (df["사고일"] <= end_ts)].copy()
    if work.empty:
        raise SystemExit(
            f"기간 {period_start}~{period_end} 에 해당하는 사고가 없습니다."
        )
    g = (
        work.groupby(["지역", "사고유형대분류"], as_index=False)
        .agg(accident_count=("사고유형대분류", "size"), severe_death_count=("중대", "sum"))
    )
    # 구×3유형 격자 (0건도 행 유지)
    regions = sorted(work["지역"].unique().tolist())
    grid = pd.MultiIndex.from_product(
        [regions, TYPE_ORDER], names=["지역", "사고유형대분류"]
    ).to_frame(index=False)
    out = grid.merge(g, on=["지역", "사고유형대분류"], how="left")
    out["accident_count"] = out["accident_count"].fillna(0).astype(int)
    out["severe_death_count"] = out["severe_death_count"].fillna(0).astype(int)
    return out


def main() -> None:
    dry = os.environ.get("ETL_DRY_RUN", "").strip() in ("1", "true", "True", "YES")
    csv_path = Path(os.environ.get("ETL_CSV", str(DEFAULT_CSV)))

    print("=== ETL accident_condition_stats / ACCIDENT_TYPE ===")
    print(f"CSV: {csv_path}")
    raw = load_accidents(csv_path)
    period_start, period_end = resolve_period(raw)
    print(f"period: {period_start} ~ {period_end}")

    agg = aggregate(raw, period_start, period_end)
    print(f"agg rows: {len(agg)} (regions×types)")
    for t in TYPE_ORDER:
        print(f"  {t}: {int(agg.loc[agg['사고유형대분류']==t, 'accident_count'].sum())}")

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

            missing = sorted(
                set(agg["지역"].astype(str)) - set(name_to_id.keys())
            )
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
                        period_start,
                        period_end,
                        DIMENSION,
                        str(r["사고유형대분류"]),
                        int(r["accident_count"]),
                        int(r["severe_death_count"]),
                    )
                )

            if dry:
                print(f"DRY_RUN: would delete+insert {len(rows)} rows")
                for sample in rows[:6]:
                    print(" ", sample)
                return

            cur.execute(
                """
                DELETE FROM accident_condition_stats
                WHERE dimension = %s
                  AND period_start = %s
                  AND period_end = %s
                """,
                (DIMENSION, period_start, period_end),
            )
            deleted = cur.rowcount

            cur.executemany(
                """
                INSERT INTO accident_condition_stats (
                  district_id, period_start, period_end,
                  dimension, dimension_value,
                  accident_count, severe_death_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
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
