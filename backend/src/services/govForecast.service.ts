import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

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