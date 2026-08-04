# -*- coding: utf-8 -*-
"""
InsureGuard AI v1.0.2 진입점 (보관)

학습·재현은 같은 폴더의 ins_v1_0_2.py 를 사용하세요.

  python scripts/archive/ins_v1_0_2.py
"""

from __future__ import annotations

import runpy
from pathlib import Path


if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).with_name("ins_v1_0_2.py")), run_name="__main__")
