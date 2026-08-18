#!/usr/bin/env bash
# Gov 예측 스냅샷 배치 래퍼 — AI 서버 cron/systemd용.
# PC(Windows 작업 스케줄러)에는 등록하지 마세요. DB와 AI가 달라도
# 이 스크립트는 AI 호스트에서 실행하고 DATABASE_URL 만 remote MySQL을 가리키면 됩니다.
set -euo pipefail

AI_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$AI_ROOT"

mkdir -p logs
LOG="logs/gov_forecast_batch_$(date +%Y%m%d_%H%M%S).log"

export GOV_FREQ="${GOV_FREQ:-Q}"
export GOV_SCOPE="${GOV_SCOPE:-DAEGU}"
# GOV_AS_OF, DATABASE_URL — cron/환경에서 설정. 미설정 시 batch 스크립트가 backend/.env 시도(로컬용).

PYTHON="${PYTHON:-python3}"
if [[ -x "$AI_ROOT/.venv/bin/python" ]]; then
  PYTHON="$AI_ROOT/.venv/bin/python"
fi

{
  echo "[$(date -Iseconds)] start GOV_FREQ=$GOV_FREQ GOV_SCOPE=$GOV_SCOPE"
  "$PYTHON" scripts/gov_batch_forecast.py
  echo "[$(date -Iseconds)] ok"
} 2>&1 | tee -a "$LOG"
