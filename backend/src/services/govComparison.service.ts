import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 비율(%) × 전체 건수 → 표시용 추정 건수 (항목 간 중복 가능) */
function calcCount(pct: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((pct / 100) * total);
}

function mapMetricsWithCounts(row: {
  pedestrian_pct: unknown;
  night_pct: unknown;
  serious_pct: unknown;
  signal_violation_pct: unknown;
  total_accident_count: number;
}) {
  const total = Number(row.total_accident_count) || 0;
  const pedestrianPct = toNum(row.pedestrian_pct);
  const nightPct = toNum(row.night_pct);
  const seriousPct = toNum(row.serious_pct);
  const signalPct = toNum(row.signal_violation_pct);

  return {
    pedestrianPct,
    nightPct,
    seriousPct,
    signalPct,
    pedestrianCount: calcCount(pedestrianPct, total),
    nightCount: calcCount(nightPct, total),
    seriousCount: calcCount(seriousPct, total),
    signalCount: calcCount(signalPct, total),
    totalCount: total,
  };
}

/**
 * GET /api/gov/comparison/:districtId
 * - district_id = districtId → 구 지표
 * - district_id = null → 대구 평균
 */
export async function getComparisonByDistrictId(districtId: number) {
  const [districtRow, cityRow] = await Promise.all([
    prisma.district_benchmark_metrics.findFirst({
      where: { district_id: districtId },
      orderBy: { period_end: 'desc' },
    }),
    prisma.district_benchmark_metrics.findFirst({
      where: { district_id: null },
      orderBy: { period_end: 'desc' },
    }),
  ]);

  if (!districtRow || !cityRow) {
    return null;
  }

  return {
    district: mapMetricsWithCounts(districtRow),
    cityAvg: mapMetricsWithCounts(cityRow),
  };
}
