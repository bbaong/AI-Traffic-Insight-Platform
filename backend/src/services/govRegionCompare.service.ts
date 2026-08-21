import { prisma } from '../lib/prisma';
import { mapMetricsWithCounts } from './govComparison.service';
import {
  listTrendByDistrictIds,
  suggestionsFromMetrics,
} from './govForecast.service';
/** UI 기본 3, 서버 상한 8 */
export const REGION_COMPARE_MAX_DISTRICTS = 8;

const ACCIDENT_TYPE_KEYS = ['차대차', '차대사람', '차량단독'] as const;

/** 종합 위험도 가중치 (합=1) — 튜닝 시 여기만 수정 */
const RISK_WEIGHTS = {
  scale: 0.3, // 예측 점유율
  severity: 0.3, // 중상 이상 비율
  pedestrian: 0.13,
  night: 0.13,
  signal: 0.14,
} as const;

const TAG_BY_SUGGESTION_KEY: Record<string, string> = {
  night_lighting: '야간사고 높음',
  signal_system: '신호위반 주의',
  elderly_pedestrian: '보행자 주의',
  illegal_parking: '주정차·보행 주의',
};

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** 시 평균=50 기준. value/avg 비율 → 0~100 */
function scoreVsAvg(value: number, avg: number): number {
  if (!(avg > 0)) return 50;
  return clamp(50 * (value / avg), 0, 100);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function parseDistrictIdsQuery(raw: unknown): number[] | null {
  if (raw == null || raw === '') return null;
  const parts = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const ids: number[] = [];
  const seen = new Set<number>();
  for (const p of parts) {
    const id = Number(p);
    if (!Number.isInteger(id) || id <= 0) return null;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function computeRiskScore(input: {
  sharePct: number;
  shareAvg: number;
  seriousPct: number;
  seriousAvg: number;
  pedestrianPct: number;
  pedestrianAvg: number;
  nightPct: number;
  nightAvg: number;
  signalPct: number;
  signalAvg: number;
}): number {
  const scale = scoreVsAvg(input.sharePct, input.shareAvg);
  const severity = scoreVsAvg(input.seriousPct, input.seriousAvg);
  const pedestrian = scoreVsAvg(input.pedestrianPct, input.pedestrianAvg);
  const night = scoreVsAvg(input.nightPct, input.nightAvg);
  const signal = scoreVsAvg(input.signalPct, input.signalAvg);

  return round1(
    RISK_WEIGHTS.scale * scale +
      RISK_WEIGHTS.severity * severity +
      RISK_WEIGHTS.pedestrian * pedestrian +
      RISK_WEIGHTS.night * night +
      RISK_WEIGHTS.signal * signal,
  );
}

async function loadLatestForecastRun() {
  const run = await prisma.gov_forecast_runs.findFirst({
    where: { status: 'SUCCEEDED', freq: 'Q', scope: 'DAEGU' },
    orderBy: { finished_at: 'desc' },
  });
  if (!run) return null;

  const rows = await prisma.gov_forecast_districts.findMany({
    where: { run_id: run.run_id },
    include: { districts: true },
  });

  return { run, rows };
}

async function loadAccidentTypeMix(districtIds: number[]) {
  const emptyCity = { 차대차: 0, 차대사람: 0, 차량단독: 0 };
  const latest = await prisma.accident_condition_stats.findFirst({
    where: { dimension: 'ACCIDENT_TYPE' },
    orderBy: { period_end: 'desc' },
    select: { period_end: true },
  });
  if (!latest) {
    return {
      periodEnd: null as Date | null,
      byDistrict: new Map<
        number,
        Record<(typeof ACCIDENT_TYPE_KEYS)[number], number>
      >(),
      cityAvg: emptyCity,
    };
  }

  // 시 구성·구별 비율: 동일 period_end 전 구 로드 후 필터
  const allRows = await prisma.accident_condition_stats.findMany({
    where: {
      dimension: 'ACCIDENT_TYPE',
      period_end: latest.period_end,
    },
    select: {
      district_id: true,
      dimension_value: true,
      accident_count: true,
    },
  });

  const cityTotals: Record<(typeof ACCIDENT_TYPE_KEYS)[number], number> = {
    차대차: 0,
    차대사람: 0,
    차량단독: 0,
  };
  const byDistrict = new Map<
    number,
    Record<(typeof ACCIDENT_TYPE_KEYS)[number], number>
  >();

  for (const r of allRows) {
    const key = r.dimension_value as (typeof ACCIDENT_TYPE_KEYS)[number];
    if (!(key in cityTotals)) continue;
    cityTotals[key] += r.accident_count;

    if (!byDistrict.has(r.district_id)) {
      byDistrict.set(r.district_id, {
        차대차: 0,
        차대사람: 0,
        차량단독: 0,
      });
    }
    byDistrict.get(r.district_id)![key] += r.accident_count;
  }

  const citySum = ACCIDENT_TYPE_KEYS.reduce((a, k) => a + cityTotals[k], 0) || 1;
  const cityAvg = {
    차대차: round1((cityTotals.차대차 / citySum) * 100),
    차대사람: round1((cityTotals.차대사람 / citySum) * 100),
    차량단독: round1((cityTotals.차량단독 / citySum) * 100),
  };

  const byDistrictPct = new Map<
    number,
    Record<(typeof ACCIDENT_TYPE_KEYS)[number], number>
  >();
  for (const id of districtIds) {
    const counts = byDistrict.get(id) ?? emptyCity;
    const sum = ACCIDENT_TYPE_KEYS.reduce((a, k) => a + counts[k], 0) || 1;
    byDistrictPct.set(id, {
      차대차: round1((counts.차대차 / sum) * 100),
      차대사람: round1((counts.차대사람 / sum) * 100),
      차량단독: round1((counts.차량단독 / sum) * 100),
    });
  }

  return { periodEnd: latest.period_end, byDistrict: byDistrictPct, cityAvg };
}

/** 구·군 분기 건수의 산술평균 (합 아님) */
async function loadCityAvgTrendSafe() {
  const rows = await prisma.$queryRaw<
    { quarter_label: string; avg_total: unknown; avg_serious: unknown }[]
  >`
    SELECT
      q.quarter_label,
      AVG(q.total) AS avg_total,
      AVG(q.serious_above) AS avg_serious
    FROM (
      SELECT
        district_id,
        CONCAT(
          YEAR(STR_TO_DATE(CONCAT(trend_month, '-01'), '%Y-%m-%d')),
          '-Q',
          CEILING(MONTH(STR_TO_DATE(CONCAT(trend_month, '-01'), '%Y-%m-%d')) / 3)
        ) AS quarter_label,
        SUM(accident_count) AS total,
        SUM(severe_death_count) AS serious_above
      FROM district_monthly_trend
      GROUP BY
        district_id,
        YEAR(STR_TO_DATE(CONCAT(trend_month, '-01'), '%Y-%m-%d')),
        CEILING(MONTH(STR_TO_DATE(CONCAT(trend_month, '-01'), '%Y-%m-%d')) / 3)
    ) AS q
    GROUP BY q.quarter_label
    ORDER BY q.quarter_label
  `;

  return rows.map((r) => ({
    quarterLabel: String(r.quarter_label),
    total: Math.round(Number(r.avg_total)),
    seriousAbove: Math.round(Number(r.avg_serious)),
  }));
}

function buildRelativeInsights(
  selected: {
    districtId: number;
    districtName: string;
    metrics: {
      pedestrianPct: number;
      nightPct: number;
      seriousPct: number;
      signalPct: number;
    };
  }[],
) {
  if (selected.length < 2) return [] as { key: string; text: string }[];

  const pickMax = (
    key: keyof (typeof selected)[0]['metrics'],
    label: string,
  ) => {
    let best = selected[0];
    for (const s of selected) {
      if (s.metrics[key] > best.metrics[key]) best = s;
    }
    return {
      key: `rel_${key}`,
      text: `${best.districtName}은(는) 선택 구 중 ${label}이(가) 가장 높습니다.`,
    };
  };

  return [
    pickMax('nightPct', '야간 사고 비율'),
    pickMax('pedestrianPct', '보행자 사고 비율'),
    pickMax('seriousPct', '중상 이상 비율'),
    pickMax('signalPct', '신호위반 비율'),
  ];
}

/**
 * GET /api/gov/region-compare?districtIds=1,3,5
 * — 선택 구 + 대구 평균 고정
 */
export async function getRegionCompare(districtIds: number[]) {
  if (districtIds.length === 0) {
    return { error: 'empty' as const };
  }
  if (districtIds.length > REGION_COMPARE_MAX_DISTRICTS) {
    return { error: 'too_many' as const };
  }

  const forecast = await loadLatestForecastRun();
  if (!forecast) {
    return { error: 'no_forecast' as const };
  }

  const { run, rows: forecastRows } = forecast;
  const shareValues = forecastRows
    .map((r) => toNum(r.predicted_share_pct))
    .filter((n) => n > 0);
  const shareAvg =
    shareValues.length > 0
      ? shareValues.reduce((a, b) => a + b, 0) / shareValues.length
      : 0;

  const cityBenchmark = await prisma.district_benchmark_metrics.findFirst({
    where: { district_id: null },
    orderBy: { period_end: 'desc' },
  });
  if (!cityBenchmark) {
    return { error: 'no_benchmark' as const };
  }

  const citySerious = toNum(cityBenchmark.serious_pct);
  const cityPed = toNum(cityBenchmark.pedestrian_pct);
  const cityNight = toNum(cityBenchmark.night_pct);
  const citySignal = toNum(cityBenchmark.signal_violation_pct);

  // 전 구 점수로 순위
  const allBenchmarks = await prisma.district_benchmark_metrics.findMany({
    where: {
      district_id: { not: null },
      period_end: cityBenchmark.period_end,
    },
  });
  const benchById = new Map(
    allBenchmarks.map((b) => [b.district_id as number, b]),
  );

  const scoredAll = forecastRows
    .map((fr) => {
      const b = benchById.get(fr.district_id);
      if (!b) return null;
      const score = computeRiskScore({
        sharePct: toNum(fr.predicted_share_pct),
        shareAvg,
        seriousPct: toNum(b.serious_pct),
        seriousAvg: citySerious,
        pedestrianPct: toNum(b.pedestrian_pct),
        pedestrianAvg: cityPed,
        nightPct: toNum(b.night_pct),
        nightAvg: cityNight,
        signalPct: toNum(b.signal_violation_pct),
        signalAvg: citySignal,
      });
      return {
        districtId: fr.district_id,
        districtName: fr.districts.district_name,
        score,
        predictedAccidentCount: fr.predicted_accident_count,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.score - a.score);

  const rankById = new Map<number, number>();
  scoredAll.forEach((row, i) => rankById.set(row.districtId, i + 1));

  const cityRiskScore = round1(
    scoredAll.length
      ? scoredAll.reduce((a, b) => a + b.score, 0) / scoredAll.length
      : 50,
  );


  const typeMix = await loadAccidentTypeMix(districtIds);
  const cityTrend = await loadCityAvgTrendSafe();
  const trendById = await listTrendByDistrictIds(districtIds);

  const districts = [];
  for (const id of districtIds) {
    const fr = forecastRows.find((r) => r.district_id === id);
    const name = fr?.districts.district_name;
    if (!name) {
      return { error: 'unknown_district' as const, districtId: id };
    }

    const bench = benchById.get(id);
    if (!bench) {
      return { error: 'no_benchmark' as const };
    }

    const suggestions = suggestionsFromMetrics(bench, cityBenchmark);
    const tags = suggestions
      .map((s) => TAG_BY_SUGGESTION_KEY[s.key] ?? s.title)
      .slice(0, 2);

    const scored = scoredAll.find((s) => s.districtId === id);
    const trendHistory = trendById.get(id) ?? [];

    const forecastPoint = {
      quarterLabel: run.forecast_label ?? 'forecast',
      total: fr?.predicted_accident_count ?? 0,
      seriousAbove: null as number | null,
      isForecast: true as const,
    };

    districts.push({
      districtId: id,
      districtName: name,
      summary: {
        riskScore: scored?.score ?? 0,
        rank: rankById.get(id) ?? null,
        rankTotal: scoredAll.length,
        tags,
        predictedAccidentCount: fr?.predicted_accident_count ?? 0,
        predictedSharePct:
          fr?.predicted_share_pct != null ? toNum(fr.predicted_share_pct) : null,
        predictedSevereRatePct:
          fr?.predicted_severe_rate_pct != null
            ? toNum(fr.predicted_severe_rate_pct)
            : null,
      },
      metrics: mapMetricsWithCounts(bench),
      accidentTypes: typeMix.byDistrict.get(id) ?? {
        차대차: 0,
        차대사람: 0,
        차량단독: 0,
      },
      trend: {
        history: trendHistory.map((p) => ({ ...p, isForecast: false as const })),
        forecast: forecastPoint,
      },
      suggestions,
    });
  }

  const cityForecastAvg = Math.round(
    forecastRows.reduce((a, r) => a + r.predicted_accident_count, 0) /
      (forecastRows.length || 1),
  );

  const relativeInsights = buildRelativeInsights(
    districts.map((d) => ({
      districtId: d.districtId,
      districtName: d.districtName,
      metrics: d.metrics,
    })),
  );

  const insightLines = [
    ...districts.flatMap((d) =>
      d.suggestions.map((s) => ({
        districtId: d.districtId,
        districtName: d.districtName,
        key: s.key,
        text: `${d.districtName}: ${s.desc}`,
      })),
    ),
    ...relativeInsights.map((r) => ({
      districtId: null as number | null,
      districtName: null as string | null,
      key: r.key,
      text: r.text,
    })),
  ];

  return {
    error: null as null,
    meta: {
      asOf: run.as_of_label,
      forecastLabel: run.forecast_label,
      modelVersion: run.model_version,
      benchmarkPeriodEnd: cityBenchmark.period_end,
      benchmarkCalculatedAt: cityBenchmark.calculated_at,
      accidentTypePeriodEnd: typeMix.periodEnd,
      riskWeights: RISK_WEIGHTS,
      maxDistricts: REGION_COMPARE_MAX_DISTRICTS,
    },
    cityAvg: {
      summary: {
        riskScore: cityRiskScore,
        rank: null as number | null,
        rankTotal: scoredAll.length,
        tags: [] as string[],
        predictedAccidentCount: cityForecastAvg,
        predictedSharePct: round1(shareAvg),
        predictedSevereRatePct: citySerious,
      },
      metrics: mapMetricsWithCounts(cityBenchmark),
      accidentTypes: typeMix.cityAvg,
      trend: {
        history: cityTrend.map((p) => ({ ...p, isForecast: false as const })),
        forecast: {
          quarterLabel: run.forecast_label ?? 'forecast',
          total: cityForecastAvg,
          seriousAbove: null as number | null,
          isForecast: true as const,
        },
      },
    },
    districts,
    insights: insightLines,
  };
}
