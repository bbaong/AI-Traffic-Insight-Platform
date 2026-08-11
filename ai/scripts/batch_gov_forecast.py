# -*- coding: utf-8 -*-
"""GovGuard 배치: pkl 예측 → gov_forecast_runs / gov_forecast_districts INSERT."""

from __future__ import annotations

import os
import pickle
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlparse

import pymysql

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "models" / "gov_model_v1.0.4.pkl"
SCRIPT_PATH = ROOT / "scripts" / "gov_v1_0_4.py"


def load_database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if url:
        return url
    # backend/.env 에서 읽기 (선택)
    env_path = ROOT.parent / "backend" / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("DATABASE_URL 이 없습니다. 환경변수 또는 backend/.env 를 설정하세요.")


def parse_mysql_url(url: str) -> dict:
    # mysql://user:pass@host:3306/db  or mysql://user:pass@host/db
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


def load_gov_mod():
    import importlib.util

    spec = importlib.util.spec_from_file_location("gov_v1_0_4", SCRIPT_PATH)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


def main() -> None:
    as_of = os.environ.get("GOV_AS_OF")  # 예: 2025Q3, 없으면 pkl 최신
    freq = os.environ.get("GOV_FREQ", "Q").upper()
    scope = os.environ.get("GOV_SCOPE", "DAEGU")

    print("Loading pkl...")
    with open(MODEL_PATH, "rb") as f:
        package = pickle.load(f)

    mod = load_gov_mod()
    print("Predicting...")
    if freq == "H":
        rows = mod.predict_next_half(package, 지역=None, as_of_연도반기=as_of)
    else:
        rows = mod.predict_next_quarter(package, 지역=None, as_of_연도분기=as_of)

    if isinstance(rows, dict):
        rows = [rows]
    if not rows:
        raise SystemExit("예측 결과가 비었습니다.")

    # 건수 내림차순 순위
    rows = sorted(rows, key=lambda r: int(r.get("예측사고건수") or 0), reverse=True)
    for i, r in enumerate(rows, start=1):
        r["_rank"] = i

    as_of_label = str(rows[0].get("기준분기") or as_of or "")
    forecast_label = str(rows[0].get("예측분기") or "") or None
    model_version = str(rows[0].get("버전") or package.get("version") or "1.0.4")

    cfg = parse_mysql_url(load_database_url())
    print(f"DB {cfg['host']}/{cfg['database']}  rows={len(rows)} as_of={as_of_label}")

    conn = pymysql.connect(**cfg)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO gov_forecast_runs
                  (freq, as_of_label, forecast_label, model_version, scope, status, started_at)
                VALUES (%s, %s, %s, %s, %s, 'RUNNING', %s)
                """,
                (freq, as_of_label, forecast_label, model_version, scope, datetime.now()),
            )
            run_id = cur.lastrowid

            # district_name → district_id
            cur.execute("SELECT district_id, district_name FROM districts")
            name_to_id = {r["district_name"]: int(r["district_id"]) for r in cur.fetchall()}

            inserted = 0
            missing = []
            for r in rows:
                name = str(r.get("지역") or "").strip()
                did = name_to_id.get(name)
                if did is None:
                    missing.append(name)
                    continue
                cur.execute(
                    """
                    INSERT INTO gov_forecast_districts (
                      run_id, district_id,
                      predicted_accident_count,
                      predicted_severe_rate_pct,
                      predicted_share_pct,
                      cap_applied,
                      priority_rank
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        run_id,
                        did,
                        int(r.get("예측사고건수") or 0),
                        r.get("예측중대사고율_퍼센트"),
                        r.get("예측사고율_퍼센트"),
                        1 if r.get("건수캡_적용") else 0,
                        int(r["_rank"]),
                    ),
                )
                inserted += 1

            if missing:
                msg = f"districts 에 없는 지역: {missing}"
                cur.execute(
                    """
                    UPDATE gov_forecast_runs
                    SET status='FAILED', error_message=%s, finished_at=%s, district_count=%s
                    WHERE run_id=%s
                    """,
                    (msg[:500], datetime.now(), inserted, run_id),
                )
                conn.commit()
                raise SystemExit(msg)

            cur.execute(
                """
                UPDATE gov_forecast_runs
                SET status='SUCCEEDED', finished_at=%s, district_count=%s, error_message=NULL
                WHERE run_id=%s
                """,
                (datetime.now(), inserted, run_id),
            )
        conn.commit()
        print(f"OK run_id={run_id} inserted={inserted}")
    except Exception as exc:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()