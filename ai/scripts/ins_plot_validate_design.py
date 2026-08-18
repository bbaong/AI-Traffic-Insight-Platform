# -*- coding: utf-8 -*-
"""검증 실험(A~C) 설계 설명 그래프 생성."""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "docs" / "figures" / "validation_v1_0_3"


def _setup() -> None:
    plt.rcParams["font.family"] = "Malgun Gothic"
    plt.rcParams["axes.unicode_minus"] = False
    OUT_DIR.mkdir(parents=True, exist_ok=True)


def box(ax, xy, w, h, text, fc, ec="#333", fontsize=9, fw="normal", tc=None):
    r = FancyBboxPatch(
        xy,
        w,
        h,
        boxstyle="round,pad=0.02,rounding_size=0.05",
        facecolor=fc,
        edgecolor=ec,
        linewidth=1.2,
    )
    ax.add_patch(r)
    ax.text(
        xy[0] + w / 2,
        xy[1] + h / 2,
        text,
        ha="center",
        va="center",
        fontsize=fontsize,
        fontweight=fw,
        color=tc or "#222",
    )


def arrow(ax, p1, p2, color="#555"):
    ax.annotate(
        "",
        xy=p2,
        xytext=p1,
        arrowprops=dict(arrowstyle="->", color=color, lw=1.5),
    )


def plot_overview() -> None:
    fig, ax = plt.subplots(figsize=(12, 7))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8)
    ax.axis("off")
    ax.set_title("InsureGuard v1.0.4 — 검증 실험 설계 개요 (A~C)", fontsize=14, pad=12)

    headers = [
        (0.3, "ref\n현행 학습", "#4C78A8"),
        (3.2, "A\nTime split", "#72B7B2"),
        (6.1, "B\nTrain-only 타깃", "#F58518"),
        (9.0, "C\n개별 EPDO", "#E45756"),
    ]
    for x, title, c in headers:
        box(ax, (x, 6.8), 2.6, 0.7, title, c, fontsize=10, fw="bold", tc="white")

    contents = [
        (
            0.3,
            "Split\nrandom 80/20",
            "타깃\n전체 기간\n프로파일 점수",
            "평가\nR2 on\n위험점수",
        ),
        (
            3.2,
            "Split\n~2023 train\n24-25 test",
            "타깃\n전체 기간\n프로파일 점수\n(약한 누수)",
            "평가\n미래 연도\n재현도",
        ),
        (
            6.1,
            "Split\ntime 또는\nrandom",
            "타깃\ntrain만 집계\n-> test 매핑",
            "평가\n누수 제거 후\nR2",
        ),
        (
            9.0,
            "Split\ntime/random",
            "타깃\n행 단위 EPDO\n(log1p)",
            "평가\n개별 경중\n예측력",
        ),
    ]
    ys = [5.2, 3.2, 1.2]
    for x, a, b, c in contents:
        box(ax, (x, ys[0]), 2.6, 1.3, a, "#E8F0FE", fontsize=8)
        box(ax, (x, ys[1]), 2.6, 1.5, b, "#FFF3E0", fontsize=8)
        box(ax, (x, ys[2]), 2.6, 1.3, c, "#E8F5E9", fontsize=8)
        arrow(ax, (x + 1.3, ys[0]), (x + 1.3, ys[1] + 1.5))
        arrow(ax, (x + 1.3, ys[1]), (x + 1.3, ys[2] + 1.3))

    ax.text(
        6,
        0.35,
        "파랑 계열=프로파일 스코어카드 재현  |  빨강=개별 사고 경중 baseline",
        ha="center",
        fontsize=9,
        color="#444",
    )
    fig.tight_layout()
    fig.savefig(OUT_DIR / "experiment_overview.png", dpi=140, bbox_inches="tight")
    plt.close()


def plot_A() -> None:
    fig, ax = plt.subplots(figsize=(11, 3.8))
    ax.set_xlim(2015.5, 2026)
    ax.set_ylim(0, 3)
    ax.set_title("실험 A — 연도 Time-based Split", fontsize=13)
    for y in range(2016, 2026):
        c = "#4C78A8" if y <= 2023 else "#E45756"
        ax.bar(y, 1.2, width=0.8, bottom=1.0, color=c, edgecolor="white")
        ax.text(
            y,
            1.6,
            str(y),
            ha="center",
            va="center",
            fontsize=8,
            color="white",
            fontweight="bold",
        )
    ax.text(
        2019.5,
        2.5,
        "TRAIN (2016-2023)",
        ha="center",
        fontsize=11,
        color="#4C78A8",
        fontweight="bold",
    )
    ax.text(
        2024.5,
        2.5,
        "TEST (2024-2025)",
        ha="center",
        fontsize=11,
        color="#E45756",
        fontweight="bold",
    )
    ax.text(
        2020.5,
        0.45,
        "질문: 과거 연도로 학습한 프로파일->점수 매핑이 미래 연도에도 유지되는가?",
        ha="center",
        fontsize=9,
    )
    ax.set_yticks([])
    for s in ("left", "right", "top"):
        ax.spines[s].set_visible(False)
    fig.tight_layout()
    fig.savefig(OUT_DIR / "experiment_A_time_split.png", dpi=140, bbox_inches="tight")
    plt.close()


def plot_B() -> None:
    fig, ax = plt.subplots(figsize=(11, 5.5))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 6)
    ax.axis("off")
    ax.set_title("실험 B — 프로파일 통계를 Train에서만 집계", fontsize=13, pad=8)

    box(ax, (0.3, 4.2), 2.4, 1.2, "Train 데이터\n(사고 행)", "#4C78A8", fontsize=10, fw="bold", tc="white")
    box(
        ax,
        (3.5, 4.2),
        3.2,
        1.2,
        "프로파일별\nEPDO·빈도·순위\n-> 위험점수 표",
        "#F58518",
        fontsize=9,
        fw="bold",
        tc="white",
    )
    box(
        ax,
        (7.5, 4.2),
        3.0,
        1.2,
        "Train 행에\n위험점수 y 부여",
        "#72B7B2",
        fontsize=10,
        fw="bold",
        tc="white",
    )
    arrow(ax, (2.7, 4.8), (3.5, 4.8))
    arrow(ax, (6.7, 4.8), (7.5, 4.8))

    box(ax, (0.3, 1.8), 2.4, 1.2, "Test 데이터\n(사고 행)", "#E45756", fontsize=10, fw="bold", tc="white")
    box(
        ax,
        (3.5, 1.8),
        3.2,
        1.2,
        "Train 점수표로\n프로파일 매핑\n(없으면 평균)",
        "#FFF3E0",
        fontsize=9,
    )
    box(
        ax,
        (7.5, 1.8),
        3.0,
        1.2,
        "Test 행에\n위험점수 y 부여\n(누수 없음)",
        "#54A24B",
        fontsize=10,
        fw="bold",
        tc="white",
    )
    arrow(ax, (2.7, 2.4), (3.5, 2.4))
    arrow(ax, (6.7, 2.4), (7.5, 2.4))
    arrow(ax, (5.1, 4.2), (5.1, 3.0))
    ax.text(5.3, 3.5, "점수표\n재사용", fontsize=8, color="#F58518")

    box(
        ax,
        (2.0, 0.3),
        7.0,
        0.9,
        "모델: X(성별·연령·차종·지역+교차) -> y(위험점수)  |  Test로 R2 평가",
        "#E8F0FE",
        fontsize=9,
    )
    fig.tight_layout()
    fig.savefig(OUT_DIR / "experiment_B_trainonly.png", dpi=140, bbox_inches="tight")
    plt.close()


def plot_C() -> None:
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    ax = axes[0]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis("off")
    ax.set_title("프로파일 타깃 (ref / A / B)", fontsize=12, color="#4C78A8")
    box(ax, (1, 7.5), 8, 1.5, "같은 입력 4개 조합\n= 같은 프로파일", "#E8F0FE", fontsize=10)
    box(ax, (1, 5.2), 8, 1.5, "그룹 통계로\n하나의 위험점수 y", "#4C78A8", fontsize=10, fw="bold", tc="white")
    box(ax, (1, 2.9), 8, 1.5, "행마다 y가 거의 결정적\n-> R2 매우 높음", "#72B7B2", fontsize=10, fw="bold", tc="white")
    arrow(ax, (5, 7.5), (5, 6.7))
    arrow(ax, (5, 5.2), (5, 4.4))
    ax.text(
        5,
        1.5,
        "예: 남|21-30|승용|중구\n-> 모든 해당 행이 동일 점수",
        ha="center",
        fontsize=9,
        color="#444",
    )

    ax = axes[1]
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis("off")
    ax.set_title("실험 C — 개별 EPDO 타깃", fontsize=12, color="#E45756")
    box(ax, (1, 7.5), 8, 1.5, "같은 입력 4개여도\n사고마다 경중이 다름", "#FFEBEE", fontsize=10)
    box(ax, (1, 5.2), 8, 1.5, "행마다 다른 EPDO y\n(사망/중상/경상...)", "#E45756", fontsize=10, fw="bold", tc="white")
    box(ax, (1, 2.9), 8, 1.5, "입력만으로 맞추기 어려움\n-> R2 음수", "#F58518", fontsize=10, fw="bold", tc="white")
    arrow(ax, (5, 7.5), (5, 6.7))
    arrow(ax, (5, 5.2), (5, 4.4))
    ax.text(
        5,
        1.5,
        "예: 동일 프로파일인데\n이번엔 경상 / 저번엔 중상",
        ha="center",
        fontsize=9,
        color="#444",
    )

    fig.suptitle(
        "실험 C: 프로파일 점수가 아니라 개별 사고 경중을 맞출 수 있는가?",
        fontsize=12,
        y=1.02,
    )
    fig.tight_layout()
    fig.savefig(OUT_DIR / "experiment_C_vs_profile.png", dpi=140, bbox_inches="tight")
    plt.close()


def plot_questions() -> None:
    fig, ax = plt.subplots(figsize=(11, 6.5))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8)
    ax.axis("off")
    ax.set_title("검증 질문 -> 실험 매핑", fontsize=14, pad=10)

    box(ax, (3.5, 6.8), 5, 0.8, "검증하고 싶은 질문", "#37474F", fontsize=11, fw="bold", tc="white")

    qs = [
        (0.4, 4.5, "미래 연도에도\n점수가 유지되나?", "A\nTime split", "#72B7B2"),
        (4.2, 4.5, "전체 통계 누수 없이도\nR2가 높은가?", "B\nTrain-only", "#F58518"),
        (8.0, 4.5, "개별 사고 경중도\n맞출 수 있나?", "C\n행 EPDO", "#E45756"),
    ]
    for x, y, q, a, c in qs:
        box(ax, (x, y), 3.4, 1.5, q, "#FAFAFA", fontsize=9)
        box(ax, (x + 0.3, 2.2), 2.8, 1.2, a, c, fontsize=11, fw="bold", tc="white")
        arrow(ax, (x + 1.7, y), (x + 1.7, 3.4))

    box(
        ax,
        (2, 0.4),
        8,
        1.0,
        "결과: A·B는 R2~0.97 유지  |  C는 R2<0  ->  높은 R2의 본질은 스코어카드 재현",
        "#E8F5E9",
        fontsize=9,
    )
    fig.tight_layout()
    fig.savefig(OUT_DIR / "experiment_questions.png", dpi=140, bbox_inches="tight")
    plt.close()


def main() -> None:
    _setup()
    plot_overview()
    plot_A()
    plot_B()
    plot_C()
    plot_questions()
    print("saved to", OUT_DIR)
    for p in sorted(OUT_DIR.glob("experiment_*.png")):
        print(" ", p.name)


if __name__ == "__main__":
    main()
