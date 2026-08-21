const SEVERITY_KEYS = [
  '사망사고',
  '중상사고',
  '경상사고',
  '부상신고사고',
] as const;

const SEVERITY_COLORS: Record<(typeof SEVERITY_KEYS)[number], string> = {
  사망사고: '#E53935',
  중상사고: '#FF8A4C',
  경상사고: '#F0B429',
  부상신고사고: '#43A047',
};

const COMPARE_METRICS: Array<[string, string, string]> = [
  ['보행자 사고', 'pedestrianPct', 'pedestrianCount'],
  ['야간 사고', 'nightPct', 'nightCount'],
  ['중상 이상', 'seriousPct', 'seriousCount'],
  ['신호위반', 'signalPct', 'signalCount'],
];

export type ComparisonBarRow = {
  label: string;
  district_pct: number;
  city_pct: number;
  district_count: number;
  city_count: number;
  district_bar: number;
  city_bar: number;
};

export type SeverityChart = {
  width: number;
  height: number;
  pad_l: number;
  pad_t: number;
  plot_w: number;
  plot_h: number;
  max_y: number;
  y_ticks: Array<{ v: number; y: number }>;
  lines: Array<{ key: string; color: string; points: string }>;
  labels: Array<{ x: number; text: string; forecast: boolean }>;
  legend: Array<{ key: string; color: string }>;
};

/** FE dashboard.comparison → PDF 막대용 rows */
export function buildComparisonBars(
  comparison: Record<string, any> | null | undefined,
): ComparisonBarRow[] {
  if (!comparison) return [];

  const district = comparison.district || {};
  const city = comparison.cityAvg || {};

  const vals: number[] = [];
  for (const [, pctKey] of COMPARE_METRICS) {
    vals.push(Number(district[pctKey] || 0));
    vals.push(Number(city[pctKey] || 0));
  }
  let scale = vals.length ? Math.max(...vals) : 1;
  if (scale <= 0) scale = 1;

  return COMPARE_METRICS.map(([label, pctKey, countKey]) => {
    const d = Number(district[pctKey] || 0);
    const c = Number(city[pctKey] || 0);
    return {
      label,
      district_pct: d,
      city_pct: c,
      district_count: Number(district[countKey] || 0) | 0,
      city_count: Number(city[countKey] || 0) | 0,
      district_bar: Math.round((d / scale) * 1000) / 10,
      city_bar: Math.round((c / scale) * 1000) / 10,
    };
  });
}

/** FE dashboard.severitySeries → SVG용 chart context */
export function buildSeverityChart(
  series: Array<Record<string, any>> | null | undefined,
): SeverityChart | null {
  if (!series || !series.length) return null;

  const w = 520;
  const h = 200;
  const pad_l = 36;
  const pad_r = 24;
  const pad_t = 16;
  const pad_b = 36;
  const plot_w = w - pad_l - pad_r;
  const plot_h = h - pad_t - pad_b;
  const n = series.length;

  let max_v = 1;
  for (const p of series) {
    const counts = p.counts || {};
    for (const k of SEVERITY_KEYS) {
      max_v = Math.max(max_v, Number(counts[k] || 0));
    }
  }

  const padded = max_v * 1.12;
  const step = padded <= 50 ? 10 : padded <= 200 ? 25 : 50;
  const max_y = Math.ceil(padded / step) * step;

  const xAt = (i: number) =>
    n <= 1 ? pad_l + plot_w / 2 : pad_l + (i / (n - 1)) * plot_w;

  const yAt = (v: number) => pad_t + plot_h - (v / max_y) * plot_h;

  const lines = SEVERITY_KEYS.map((key) => {
    const pts = series.map((p, i) => {
      const counts = p.counts || {};
      const x = xAt(i).toFixed(1);
      const y = yAt(Number(counts[key] || 0)).toFixed(1);
      return `${x},${y}`;
    });
    return {
      key,
      color: SEVERITY_COLORS[key],
      points: pts.join(' '),
    };
  });

  const labels = series.map((p, i) => ({
    x: xAt(i),
    text: String(p.label || ''),
    forecast: p.kind === 'forecast',
  }));

  const ticks: number[] = [];
  for (let t = 0; t <= max_y; t += step || 10) ticks.push(t);
  if (ticks[ticks.length - 1] !== max_y) ticks.push(max_y);

  return {
    width: w,
    height: h,
    pad_l,
    pad_t,
    plot_w,
    plot_h,
    max_y,
    y_ticks: ticks.map((t) => ({ v: t, y: yAt(t) })),
    lines,
    labels,
    legend: SEVERITY_KEYS.map((k) => ({
      key: k,
      color: SEVERITY_COLORS[k],
    })),
  };
}