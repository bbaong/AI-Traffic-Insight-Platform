"""데이터 전처리 모듈."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from src import DATA_PROCESSED, DATA_RAW

ACCIDENT_PATH = DATA_RAW / "사고분석.csv"
POP_PATH = DATA_RAW / "대구_구군_연령별_주민등록인구_2020_2025.csv"
JOIN_OUT_PATH = DATA_PROCESSED / "사고분석_인구_join.csv"
RISK_RATE_OUT_PATH = DATA_PROCESSED / "인구대비_가중사고비율.csv"

FEATURE_COLS = [
    "구군",
    "가해운전자 연령대",
    "가해운전자 성별",
    "가해운전자 차종",
    "주야",
]
TARGET_COL = "사고내용"

RISK_SCORE = {
    "부상신고사고": 20.0,
    "경상사고": 40.0,
    "중상사고": 75.0,
    "사망사고": 100.0,
}

SEVERITY_WEIGHT = {
    "사망사고": 12.0,
    "중상사고": 5.0,
    "경상사고": 1.0,
    "부상신고사고": 0.3,
}


def accident_period(발생년월: str) -> str:
    """'2020년 1월' → '2020.1/2' (1~6월=1/2, 7~12월=2/2)."""
    text = str(발생년월).replace(" ", "")
    year = text.split("년")[0]
    month = int(text.split("년")[1].replace("월", ""))
    half = "1/2" if month <= 6 else "2/2"
    return f"{year}.{half}"


def normalize_district(df: pd.DataFrame) -> pd.DataFrame:
    """시군구 열에서 '대구광역시 ' 접두어를 제거해 구군 열을 생성."""
    out = df.copy()
    out["구군"] = out["시군구"].astype(str).str.replace(
        r"^대구광역시\s*", "", regex=True
    )
    return out


def prepare_training_data(path: Path | None = None) -> pd.DataFrame:
    """모델 학습·평가용 데이터를 전처리합니다."""
    df = pd.read_csv(path or ACCIDENT_PATH, encoding="utf-8")
    df = normalize_district(df)
    use = df[FEATURE_COLS + [TARGET_COL]].dropna()
    for col in FEATURE_COLS:
        use = use[~use[col].astype(str).str.contains("기타불명", na=False)]
    use = use[use[TARGET_COL].isin(RISK_SCORE.keys())].reset_index(drop=True)
    return use


def load_population(path: Path | None = None) -> pd.DataFrame:
    """인구 CSV → 구군·기간당 1행, 연령대별 계/남자/여자 열."""
    raw = pd.read_csv(path or POP_PATH, header=None, encoding="utf-8")
    periods = raw.iloc[0, 2:].tolist()
    sexes = raw.iloc[1, 2:].tolist()

    df = raw.iloc[2:].copy()
    df.columns = ["행정구역", "연령별"] + [
        f"{period}|{sex}" for period, sex in zip(periods, sexes)
    ]
    df = df[df["행정구역"] != "합계"].reset_index(drop=True)

    long = df.melt(id_vars=["행정구역", "연령별"], var_name="기간_성별", value_name="인구")
    long[["기간", "성별"]] = long["기간_성별"].str.split("|", n=1, expand=True)
    long = long.drop(columns=["기간_성별"])
    long["인구"] = pd.to_numeric(long["인구"], errors="coerce")

    age_label = long["연령별"].where(long["연령별"] != "계", "총")
    long["열"] = "인구_" + age_label + "_" + long["성별"]

    wide = (
        long.pivot_table(
            index=["행정구역", "기간"],
            columns="열",
            values="인구",
            aggfunc="first",
        )
        .reset_index()
        .rename_axis(None, axis=1)
    )
    return wide


def load_total_population(path: Path | None = None) -> pd.DataFrame:
    """구군·기간별 총인구(계)만 추출."""
    raw = pd.read_csv(path or POP_PATH, header=None, encoding="utf-8")
    periods = raw.iloc[0, 2:].tolist()
    sexes = raw.iloc[1, 2:].tolist()

    df = raw.iloc[2:].copy()
    df.columns = ["행정구역", "연령별"] + [
        f"{period}|{sex}" for period, sex in zip(periods, sexes)
    ]
    df = df[(df["행정구역"] != "합계") & (df["연령별"] == "계")].copy()

    long = df.melt(id_vars=["행정구역", "연령별"], var_name="기간_성별", value_name="인구")
    long[["기간", "성별"]] = long["기간_성별"].str.split("|", n=1, expand=True)
    long = long[long["성별"] == "계"].drop(columns=["기간_성별", "연령별", "성별"])
    long["인구"] = pd.to_numeric(long["인구"], errors="coerce")
    return long.rename(columns={"행정구역": "구군"})


def join_accidents_with_population(
    accident_path: Path | None = None,
    pop_path: Path | None = None,
    out_path: Path | None = None,
) -> pd.DataFrame:
    """사고분석.csv와 인구 CSV를 구군·시기로 join합니다."""
    accidents = pd.read_csv(accident_path or ACCIDENT_PATH, encoding="utf-8")
    population = load_population(pop_path)

    accidents = normalize_district(accidents)
    accidents["기간"] = accidents["발생년월"].map(accident_period)

    merged = accidents.merge(
        population,
        left_on=["구군", "기간"],
        right_on=["행정구역", "기간"],
        how="left",
    )
    merged = merged.drop(columns=["행정구역"], errors="ignore")

    out = out_path or JOIN_OUT_PATH
    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    merged.to_csv(out, index=False, encoding="utf-8-sig")
    return merged


def compute_risk_rates(
    accident_path: Path | None = None,
    pop_path: Path | None = None,
    out_path: Path | None = None,
) -> pd.DataFrame:
    """구군·반기별 인구 대비 가중 사고비율을 계산합니다."""
    accidents = pd.read_csv(accident_path or ACCIDENT_PATH, encoding="utf-8")
    population = load_total_population(pop_path)

    accidents = normalize_district(accidents)
    accidents["기간"] = accidents["발생년월"].map(accident_period)
    accidents["가중점수"] = accidents["사고내용"].map(SEVERITY_WEIGHT).fillna(0.0)
    accidents["인원가중점수"] = (
        accidents["사망자수"].fillna(0) * 12
        + accidents["중상자수"].fillna(0) * 5
        + accidents["경상자수"].fillna(0) * 1
    )

    grouped = (
        accidents.groupby(["구군", "기간"], as_index=False)
        .agg(
            사고건수=("사고내용", "size"),
            가중점수=("가중점수", "sum"),
            인원가중점수=("인원가중점수", "sum"),
            사망사고=("사고내용", lambda s: (s == "사망사고").sum()),
            중상사고=("사고내용", lambda s: (s == "중상사고").sum()),
            경상사고=("사고내용", lambda s: (s == "경상사고").sum()),
            부상신고사고=("사고내용", lambda s: (s == "부상신고사고").sum()),
        )
    )

    result = grouped.merge(population, on=["구군", "기간"], how="left")
    result["인구10만당_건수"] = result["사고건수"] / result["인구"] * 100_000
    result["인구10만당_가중"] = result["가중점수"] / result["인구"] * 100_000
    result["인구10만당_인원가중"] = result["인원가중점수"] / result["인구"] * 100_000
    result = result.sort_values(["기간", "인구10만당_가중"], ascending=[True, False])

    out = out_path or RISK_RATE_OUT_PATH
    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    result.to_csv(out, index=False, encoding="utf-8-sig")
    return result


def main() -> None:
    """전처리 파이프라인: join → 가중 사고비율."""
    merged = join_accidents_with_population()
    pop_cols = [c for c in merged.columns if c.startswith("인구_")]
    print(f"저장 완료: {JOIN_OUT_PATH}")
    print(f"join 결과: {len(merged):,}행 / 인구 열: {len(pop_cols)}개")

    result = compute_risk_rates()
    print(f"저장 완료: {RISK_RATE_OUT_PATH}")
    print(f"행 수: {len(result):,}")


if __name__ == "__main__":
    main()
