import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapMetrics(row: {
  pedestrian_pct: unknown;
  night_pct: unknown;
  serious_pct: unknown;
  signal_violation_pct: unknown;
}) {
  return {
    pedestrianPct: toNum(row.pedestrian_pct),
    nightPct: toNum(row.night_pct),
    seriousPct: toNum(row.serious_pct),
    signalPct: toNum(row.signal_violation_pct),
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
    district: mapMetrics(districtRow),
    cityAvg: mapMetrics(cityRow),
  };
}