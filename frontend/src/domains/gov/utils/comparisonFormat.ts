/** 대구 평균 대비 비교 — 표시용 순수 함수 */

export function formatPct1(n: number): string {
  return `${Number(n).toFixed(1)}%`;
}

export function formatCount(n: number): string {
  return Math.round(Number(n)).toLocaleString('ko-KR');
}

/** districtPct - cityAvgPct → 소수 1자리 */
export function calcDeltaPctPoints(
  districtPct: number,
  cityAvgPct: number,
): number {
  return Math.round((districtPct - cityAvgPct) * 10) / 10;
}

export function formatDeltaBadge(delta: number): string {
  const abs = Math.abs(delta).toFixed(1);
  if (delta > 0) return `+${abs}%p ↑`;
  if (delta < 0) return `-${abs}%p ↓`;
  return `0.0%p`;
}

/**
 * 4개 지표 공통 미니바 스케일 (행마다 제각각 금지).
 * 표시된 Pct 최댓값 기준, 최소 1.
 */
export function calcBarScaleMax(pcts: number[]): number {
  const max = Math.max(0, ...pcts.map((p) => Number(p) || 0));
  return Math.max(1, max);
}

export function barWidthPct(value: number, scaleMax: number): number {
  if (scaleMax <= 0) return 0;
  return Math.min(100, Math.max(0, (value / scaleMax) * 100));
}
