import { DashboardCard } from '../../../shared/components/dashboard';
import type {
  RegionCompareDistrict,
  RegionCompareEntity,
  TrendPoint,
} from '../api/govRegionCompare';
import { formatQuarterLabel, CITY_AVG_COLOR, districtColor } from '../utils/regionCompareUi';
import surface from './compareSurface.module.css';
import styles from './CompareTrendCard.module.css';

const CHART = {
  width: 640,
  height: 260,
  padTop: 28,
  padRight: 20,
  padBottom: 44,
  padLeft: 44,
};

type AxisLabel = {
  key: string;
  raw: string;
  forecast: boolean;
};

function quarterKey(raw: string): string {
  const m = /^(\d{4})-?Q([1-4])$/i.exec(raw.replace('-Q', 'Q'));
  return m ? `${m[1]}Q${m[2]}` : raw;
}

function collectAxis(entities: RegionCompareEntity[]): AxisLabel[] {
  const map = new Map<string, AxisLabel>();
  for (const e of entities) {
    for (const p of e.trend.history ?? []) {
      const key = quarterKey(p.quarterLabel);
      if (!map.has(key)) {
        map.set(key, { key, raw: p.quarterLabel, forecast: false });
      }
    }
    const f = e.trend.forecast;
    if (f?.quarterLabel) {
      const key = quarterKey(f.quarterLabel);
      map.set(key, { key, raw: f.quarterLabel, forecast: true });
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function pointMap(entity: RegionCompareEntity): Map<string, TrendPoint> {
  const next = new Map<string, TrendPoint>();
  for (const p of entity.trend.history ?? []) {
    next.set(quarterKey(p.quarterLabel), { ...p, isForecast: false });
  }
  const f = entity.trend.forecast;
  if (f?.quarterLabel) {
    next.set(quarterKey(f.quarterLabel), { ...f, isForecast: true });
  }
  return next;
}

function xAt(index: number, count: number): number {
  const w = CHART.width - CHART.padLeft - CHART.padRight;
  if (count <= 1) return CHART.padLeft + w / 2;
  return CHART.padLeft + (index / (count - 1)) * w;
}

function yAt(value: number, maxY: number): number {
  const h = CHART.height - CHART.padTop - CHART.padBottom;
  if (maxY <= 0) return CHART.padTop + h;
  return CHART.padTop + h - (value / maxY) * h;
}

function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const padded = raw * 1.22;
  const step = padded <= 50 ? 10 : padded <= 200 ? 25 : 50;
  return Math.ceil(padded / step) * step;
}

function polyline(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

export function CompareTrendCard({
  districts,
  cityAvg,
}: {
  districts: RegionCompareDistrict[];
  cityAvg: RegionCompareEntity;
}) {
  const allSeries = [
    { id: 'city', name: '대구 평균', color: CITY_AVG_COLOR, entity: cityAvg },
    ...districts.map((d) => ({
      id: String(d.districtId),
      name: d.districtName,
      color: districtColor(d.districtName),
      entity: d,
    })),
  ];

  const axis = collectAxis(allSeries.map((s) => s.entity));
  const values = allSeries.flatMap((s) => {
    const m = pointMap(s.entity);
    return axis.map((a) => m.get(a.key)?.total).filter((n): n is number => n != null);
  });
  const maxY = niceMax(Math.max(0, ...values));
  const tickStep = maxY <= 50 ? 10 : maxY <= 200 ? 25 : 50;
  const ticks: number[] = [];
  for (let v = 0; v <= maxY; v += tickStep) ticks.push(v);

  const firstForecastIdx = axis.findIndex((a) => a.forecast);
  const splitX =
    firstForecastIdx > 0 ? xAt(firstForecastIdx, axis.length) : null;

  return (
    <DashboardCard
      title="분기별 사고 추세 비교"
      className={`${surface.card} ${styles.card}`}
      leading={
        <span
          className={styles.info}
          title="실선은 분기 실적, 점선은 다음 분기 예측입니다."
        >
          i
        </span>
      }
      action={
        <ul className={styles.legend}>
          {allSeries.map((s) => (
            <li key={s.id}>
              <span
                className={s.id === 'city' ? styles.legendDash : styles.legendLine}
                style={{ borderColor: s.color }}
              />
              {s.name}
            </li>
          ))}
        </ul>
      }
    >
      <p className={styles.caption}>실선 실적 · 점선 다음 분기 예측</p>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        role="img"
        aria-label="분기별 사고 건수 추세"
      >
        {ticks.map((t) => {
          const y = yAt(t, maxY);
          return (
            <g key={t}>
              <line
                x1={CHART.padLeft}
                x2={CHART.width - CHART.padRight}
                y1={y}
                y2={y}
                stroke="var(--color-border-light)"
                strokeWidth="1"
              />
              <text x={CHART.padLeft - 8} y={y + 3} textAnchor="end" className={styles.tick}>
                {t.toLocaleString('ko-KR')}
              </text>
            </g>
          );
        })}

        {splitX != null ? (
          <g>
            <rect
              x={splitX}
              y={CHART.padTop}
              width={CHART.width - CHART.padRight - splitX}
              height={CHART.height - CHART.padTop - CHART.padBottom}
              fill="#21adc4"
              opacity="0.06"
            />
            <line
              x1={splitX}
              x2={splitX}
              y1={CHART.padTop}
              y2={CHART.height - CHART.padBottom}
              stroke="#21adc4"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          </g>
        ) : null}

        {allSeries.map((s, si) => {
          const byQ = pointMap(s.entity);
          const coords = axis.map((a, i) => {
            const p = byQ.get(a.key);
            if (p == null) return null;
            return {
              x: xAt(i, axis.length),
              y: yAt(p.total, maxY),
              total: p.total,
              forecast: a.forecast || p.isForecast,
            };
          });
          const drawn = coords.filter((p): p is NonNullable<typeof p> => p != null);
          const hist = drawn.filter((p) => !p.forecast);
          const forecasts = drawn.filter((p) => p.forecast);
          const lastHist = hist[hist.length - 1];
          const firstFc = forecasts[0];
          const city = s.id === 'city';

          return (
            <g key={s.id}>
              {hist.length > 1 ? (
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth={city ? 2 : 2.4}
                  strokeDasharray={city ? '5 4' : undefined}
                  points={polyline(hist)}
                />
              ) : null}
              {lastHist && firstFc ? (
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth={city ? 2 : 2.4}
                  strokeDasharray="5 4"
                  points={polyline([lastHist, firstFc, ...forecasts.slice(1)])}
                />
              ) : forecasts.length > 1 ? (
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth={city ? 2 : 2.4}
                  strokeDasharray="5 4"
                  points={polyline(forecasts)}
                />
              ) : null}
              {drawn.map((p, i) => (
                <g key={`${s.id}-${i}`}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={p.forecast ? 3.4 : 3}
                    fill={p.forecast ? '#fff' : s.color}
                    stroke={s.color}
                    strokeWidth="1.7"
                  />
                  <text
                    x={p.x + (axis.length <= 2 ? (si - (allSeries.length - 1) / 2) * 34 : 0)}
                    y={p.y - 8}
                    textAnchor="middle"
                    className={styles.value}
                    fill={s.color}
                  >
                    {Math.round(p.total).toLocaleString('ko-KR')}
                  </text>
                </g>
              ))}
            </g>
          );
        })}

        {axis.map((label, i) => (
          <text
            key={label.key}
            x={xAt(i, axis.length)}
            y={CHART.height - (label.forecast ? 8 : 14)}
            textAnchor="middle"
            className={styles.tick}
          >
            {formatQuarterLabel(label.raw)}
            {label.forecast ? ' 예측' : ''}
          </text>
        ))}
      </svg>
    </DashboardCard>
  );
}
