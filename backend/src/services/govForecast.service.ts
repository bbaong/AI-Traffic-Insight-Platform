import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

// ============================================================
// 제안 카드 규칙 (코드 상수로 관리 — DB 테이블 불필요)
// 각 구의 지표가 대구 전체 평균을 초과할 때 해당 카드 노출
// ============================================================
const SUGGESTION_RULES = [
  {
    key: 'night_lighting',
    icon: 'bulb',
    title: '야간 보행자 구간 조명 밝기 강화',
    desc: '야간 사고 비율이 평균 대비 높습니다.',
    condition: (d: { night_pct: unknown }, avg: { night_pct: unknown }) =>
      Number(d.night_pct) > Number(avg.night_pct),
  },
  {
    key: 'signal_system',
    icon: 'traffic-light',
    title: '교차로 신호체계 개선 검토',
    desc: '신호위반 비율이 평균 대비 높습니다.',
    condition: (
      d: { signal_violation_pct: unknown },
      avg: { signal_violation_pct: unknown },
    ) => Number(d.signal_violation_pct) > Number(avg.signal_violation_pct),
  },
  {
    key: 'elderly_pedestrian',
    icon: 'pedestrian',
    title: '고령 보행자 보호 구역 검토',
    desc: '보행자 사고 비율이 평균 대비 높습니다.',
    condition: (
      d: { pedestrian_pct: unknown },
      avg: { pedestrian_pct: unknown },
    ) => Number(d.pedestrian_pct) > Number(avg.pedestrian_pct),
  },
  {
    key: 'illegal_parking',
    icon: 'parking',
    title: '불법주정차 단속 및 계도 강화',
    desc: '신호위반·보행자 안전 확보에 기여합니다.',
    condition: (
      d: { signal_violation_pct: unknown; pedestrian_pct: unknown },
      avg: { signal_violation_pct: unknown; pedestrian_pct: unknown },
    ) =>
      Number(d.signal_violation_pct) > Number(avg.signal_violation_pct) &&
      Number(d.pedestrian_pct) > Number(avg.pedestrian_pct),
  },
] as const;

/**
 * 구별 우선점검 TOP N
 * gov_forecast_runs 최신 SUCCEEDED run → gov_forecast_districts + districts
 */
export async function listPriorityTop(limit: number) {
  const latestRun = await prisma.gov_forecast_runs.findFirst({
    where: { status: 'SUCCEEDED' },
    orderBy: { finished_at: 'desc' },
  });

  if (!latestRun) return null;

  const items = await prisma.gov_forecast_districts.findMany({
    where: {
      run_id: latestRun.run_id,
      priority_rank: { not: null },
    },
    orderBy: { priority_rank: 'asc' },
    take: limit,
    include: { districts: true },
  });

  return {
    asOfLabel: latestRun.as_of_label,
    forecastLabel: latestRun.forecast_label,
    items: items.map((item) => ({
      rank: item.priority_rank,
      districtId: item.district_id,
      district: item.districts.district_name,
      score:
        item.predicted_severe_rate_pct == null
          ? null
          : Number(item.predicted_severe_rate_pct),
      predictedAccidentCount: item.predicted_accident_count,
      trend: null as string | null,
    })),
  };
}

/**
 * AI 우선점검 제안 카드
 * district_benchmark_metrics 구 vs 대구 평균(null) 비교
 */
export async function listSuggestions(districtId: number) {
  const [district, cityAvg] = await Promise.all([
    prisma.district_benchmark_metrics.findFirst({
      where: { district_id: districtId },
      orderBy: { period_end: 'desc' },
    }),
    prisma.district_benchmark_metrics.findFirst({
      where: { district_id: null },
      orderBy: { period_end: 'desc' },
    }),
  ]);

  if (!district || !cityAvg) return [];

  return SUGGESTION_RULES.filter((rule) => rule.condition(district, cityAvg)).map(
    (rule) => ({
      key: rule.key,
      icon: rule.icon,
      title: rule.title,
      desc: rule.desc,
    }),
  );
}

/**
 * 분기별 사고 추세 (district_monthly_trend → 분기 집계)
 */
export async function listTrend(districtId: number) {
  const rows = await prisma.$queryRaw<
    { quarter_label: string; total: bigint; serious_above: bigint }[]
  >`
    SELECT
      CONCAT(
        YEAR(STR_TO_DATE(CONCAT(trend_month, '-01'), '%Y-%m-%d')),
        '-Q',
        CEILING(MONTH(STR_TO_DATE(CONCAT(trend_month, '-01'), '%Y-%m-%d')) / 3)
      ) AS quarter_label,
      SUM(accident_count)     AS total,
      SUM(severe_death_count) AS serious_above
    FROM district_monthly_trend
    WHERE district_id = ${districtId}
    GROUP BY
      YEAR(STR_TO_DATE(CONCAT(trend_month, '-01'), '%Y-%m-%d')),
      CEILING(MONTH(STR_TO_DATE(CONCAT(trend_month, '-01'), '%Y-%m-%d')) / 3)
    ORDER BY
      YEAR(STR_TO_DATE(CONCAT(trend_month, '-01'), '%Y-%m-%d')),
      CEILING(MONTH(STR_TO_DATE(CONCAT(trend_month, '-01'), '%Y-%m-%d')) / 3)
  `;

  return rows.map((r) => ({
    quarterLabel: r.quarter_label,
    total: Number(r.total),
    seriousAbove: Number(r.serious_above),
  }));
}
type ListOpts = {
  freq?: 'Q' | 'H';
  as_of?: string; // 예: 2025Q3 — 없으면 최신 SUCCEEDED
  scope?: string; // 기본 DAEGU
};

/** 최신(또는 지정) 배치 스냅샷 — 지도용 구·군 목록 */
export async function getLatestGovForecast(opts: ListOpts = {}) {
  const freq = opts.freq ?? 'Q';
  const scope = opts.scope ?? 'DAEGU';

  const run = await prisma.gov_forecast_runs.findFirst({
    where: {
      status: 'SUCCEEDED',
      freq,
      scope,
      ...(opts.as_of ? { as_of_label: opts.as_of } : {}),
    },
    orderBy: { finished_at: 'desc' },
  });

  if (!run) {
    return null;
  }

  const rows = await prisma.gov_forecast_districts.findMany({
    where: { run_id: run.run_id },
    include: { districts: true },
    orderBy: { priority_rank: 'asc' },
  });

  return {
    run: {
      runId: run.run_id.toString(),
      freq: run.freq,
      asOf: run.as_of_label,
      forecastLabel: run.forecast_label,
      modelVersion: run.model_version,
      scope: run.scope,
      districtCount: run.district_count,
      finishedAt: run.finished_at,
    },
    districts: rows.map((r) => ({
      districtId: r.district_id,
      지역: r.districts.district_name,
      예측사고건수: r.predicted_accident_count,
      예측중대사고율_퍼센트:
        r.predicted_severe_rate_pct != null
          ? Number(r.predicted_severe_rate_pct)
          : null,
      예측사고율_퍼센트:
        r.predicted_share_pct != null ? Number(r.predicted_share_pct) : null,
      건수캡_적용: r.cap_applied,
      priorityRank: r.priority_rank,
    })),
  };
}
