import { useEffect, useMemo, useRef, useState } from 'react';
import { DashboardCard } from '../../../shared/components/dashboard';
import type {
  RegionCompareDistrict,
  RegionCompareEntity,
  TrendPoint,
} from '../api/govRegionCompare';
import {
  formatQuarterLabel,
  formatQuarterLabelAxis,
  CITY_AVG_COLOR,
  districtColor,
} from '../utils/regionCompareUi';
import surface from './compareSurface.module.css';
import styles from './CompareTrendCard.module.css';

const CHART = {
  width: 640,
  height: 260,
  padTop: 28,
  padRight: 56,
  padBottom: 44,
  padLeft: 44,
};

/** 실적 마지막 점과 예측 점 사이 추가 간격 */
const FORECAST_GAP = 40;

const Y_TICK_STEP = 100;
const HOVER_DELAY_MS = 220;

type AxisLabel = {
  key: string;
  raw: string;
  forecast: boolean;
};

type SeriesDef = {
  id: string;
  name: string;
  color: string;
  entity: RegionCompareEntity;
  isCity: boolean;
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

function xAt(index: number, axis: AxisLabel[]): number {
  const n = axis.length;
  const plotW = CHART.width - CHART.padLeft - CHART.padRight;
  if (n <= 1) return CHART.padLeft + plotW / 2;

  const firstFc = axis.findIndex((a) => a.forecast);
  const extra = firstFc > 0 ? FORECAST_GAP : 0;
  const step = (plotW - extra) / (n - 1);
  const x = CHART.padLeft + index * step;
  return firstFc > 0 && index >= firstFc ? x + extra : x;
}

function yAt(value: number, maxY: number): number {
  const h = CHART.height - CHART.padTop - CHART.padBottom;
  if (maxY <= 0) return CHART.padTop + h;
  return CHART.padTop + h - (value / maxY) * h;
}

/** Y축 상한을 100 단위로 맞춤 */
function niceMax(raw: number): number {
  if (raw <= 0) return Y_TICK_STEP;
  const padded = raw * 1.15;
  return Math.max(Y_TICK_STEP, Math.ceil(padded / Y_TICK_STEP) * Y_TICK_STEP);
}

function polyline(points: { x: number; y: number }[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function defaultAxisIndex(axis: AxisLabel[]): number {
  if (axis.length === 0) return 0;
  const fc = axis.findIndex((a) => a.forecast);
  if (fc > 0) return fc - 1;
  if (fc === 0) return 0;
  return axis.length - 1;
}

export function CompareTrendCard({
  districts,
  cityAvg,
}: {
  districts: RegionCompareDistrict[];
  cityAvg: RegionCompareEntity;
}) {
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allSeries: SeriesDef[] = useMemo(
    () => [
      {
        id: 'city',
        name: '대구 평균',
        color: CITY_AVG_COLOR,
        entity: cityAvg,
        isCity: true,
      },
      ...districts.map((d) => ({
        id: String(d.districtId),
        name: d.districtName,
        color: districtColor(d.districtName),
        entity: d as RegionCompareEntity,
        isCity: false,
      })),
    ],
    [cityAvg, districts],
  );

  const axis = useMemo(
    () => collectAxis(allSeries.map((s) => s.entity)),
    [allSeries],
  );

  const [hoverIdx, setHoverIdx] = useState(() => defaultAxisIndex(axis));

  useEffect(() => {
    setHoverIdx(defaultAxisIndex(axis));
  }, [axis]);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  const values = allSeries.flatMap((s) => {
    const m = pointMap(s.entity);
    return axis
      .map((a) => m.get(a.key)?.total)
      .filter((n): n is number => n != null);
  });
  const maxY = niceMax(Math.max(0, ...values));
  const ticks: number[] = [];
  for (let v = 0; v <= maxY; v += Y_TICK_STEP) ticks.push(v);

  const firstForecastIdx = axis.findIndex((a) => a.forecast);
  const splitX =
    firstForecastIdx > 0 ? xAt(firstForecastIdx - 1, axis) : null;

  function scheduleHover(index: number) {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (hoverIdx === index) return;
    if (hoverIdx != null) {
      setHoverIdx(index);
      return;
    }
    hoverTimer.current = setTimeout(() => {
      setHoverIdx(index);
      hoverTimer.current = null;
    }, HOVER_DELAY_MS);
  }

  const activeIdx =
    axis.length === 0
      ? null
      : Math.min(Math.max(0, hoverIdx), axis.length - 1);
  const activeLabel = activeIdx != null ? axis[activeIdx] : null;
  const hoverX =
    activeIdx != null ? xAt(activeIdx, axis) : CHART.padLeft;

  const hoverRows =
    activeLabel == null
      ? []
      : (() => {
          const rows = allSeries
            .map((s) => {
              const p = pointMap(s.entity).get(activeLabel.key);
              if (p == null) return null;
              return {
                name: s.name,
                color: s.color,
                total: p.total,
                isCity: s.isCity,
              };
            })
            .filter((r): r is NonNullable<typeof r> => r != null);
          const city = rows.filter((r) => r.isCity);
          const rest = rows
            .filter((r) => !r.isCity)
            .sort((a, b) => b.total - a.total);
          return [...city, ...rest];
        })();

  const hoverAnchorY =
    activeLabel == null || hoverRows.length === 0
      ? CHART.padTop + 24
      : Math.min(...hoverRows.map((r) => yAt(r.total, maxY)));

  const tooltipLeftPct = (hoverX / CHART.width) * 100;
  const tooltipTopPct = (hoverAnchorY / CHART.height) * 100;
  const tooltipPlaceBelow = hoverAnchorY < CHART.padTop + 56;

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
                className={
                  s.isCity ? styles.legendDash : styles.legendLine
                }
                style={{ borderColor: s.color }}
              />
              {s.name}
            </li>
          ))}
        </ul>
      }
    >
      <p className={styles.caption}>실선 실적 · 점선 다음 분기 예측</p>
      <div className={styles.chartWrap}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          overflow="visible"
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
                <text
                  x={CHART.padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className={styles.tick}
                >
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

          {activeIdx != null ? (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={CHART.padTop}
              y2={CHART.height - CHART.padBottom}
              stroke={activeLabel?.forecast ? '#21adc4' : '#64748b'}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity={0.9}
              pointerEvents="none"
            />
          ) : null}

          {allSeries.map((s, si) => {
            const byQ = pointMap(s.entity);
            const coords = axis.map((a, i) => {
              const p = byQ.get(a.key);
              if (p == null) return null;
              return {
                x: xAt(i, axis),
                y: yAt(p.total, maxY),
                total: p.total,
                forecast: a.forecast || p.isForecast,
                index: i,
              };
            });
            const drawn = coords.filter(
              (p): p is NonNullable<typeof p> => p != null,
            );
            const hist = drawn.filter((p) => !p.forecast);
            const forecasts = drawn.filter((p) => p.forecast);
            const lastHist = hist[hist.length - 1];
            const firstFc = forecasts[0];
            const city = s.isCity;

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
                {drawn.map((p) => {
                  const active = activeIdx === p.index;
                  return (
                    <g key={`${s.id}-${p.index}`}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={14}
                        fill="transparent"
                        className={styles.dotHit}
                        onMouseEnter={() => scheduleHover(p.index)}
                      />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={
                          active
                            ? p.forecast
                              ? 4.2
                              : 3.8
                            : p.forecast
                              ? 3.4
                              : 3
                        }
                        fill={p.forecast ? '#fff' : s.color}
                        stroke={s.color}
                        strokeWidth={active ? 2.2 : 1.7}
                        pointerEvents="none"
                      />
                      <text
                        x={
                          p.x +
                          (axis.length <= 2
                            ? (si - (allSeries.length - 1) / 2) * 34
                            : 0)
                        }
                        y={p.y - 8}
                        textAnchor="middle"
                        className={styles.value}
                        fill={s.color}
                        pointerEvents="none"
                      >
                        {Math.round(p.total).toLocaleString('ko-KR')}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {axis.map((_, i) => {
            const cx = xAt(i, axis);
            const prevX = i > 0 ? xAt(i - 1, axis) : CHART.padLeft;
            const nextX =
              i < axis.length - 1
                ? xAt(i + 1, axis)
                : CHART.width - 4;
            const left = i === 0 ? CHART.padLeft : (prevX + cx) / 2;
            const right = (cx + nextX) / 2;
            return (
              <rect
                key={`hit-${i}`}
                x={left}
                y={CHART.padTop}
                width={Math.max(18, right - left)}
                height={CHART.height - CHART.padTop - CHART.padBottom}
                fill="transparent"
                className={styles.colHit}
                onMouseEnter={() => scheduleHover(i)}
              />
            );
          })}

          {axis.map((label, i) => {
            const prev = i > 0 ? axis[i - 1].raw : null;
            return (
              <text
                key={label.key}
                x={xAt(i, axis)}
                y={CHART.height - 14}
                textAnchor="middle"
                className={`${styles.tick} ${
                  activeIdx === i ? styles.tickActive : ''
                }`}
              >
                {formatQuarterLabelAxis(label.raw, prev)}
                {label.forecast ? ' 예측' : ''}
              </text>
            );
          })}
        </svg>

        {/* 박스·세로선 선택 분기: 마우스를 치워도 유지 */}
        {activeLabel && hoverRows.length > 0 ? (
          <div
            className={`${styles.tooltipAnchor} ${
              tooltipPlaceBelow
                ? styles.tooltipAnchorBelow
                : styles.tooltipAnchorAbove
            }`}
            style={{ left: `${tooltipLeftPct}%`, top: `${tooltipTopPct}%` }}
            role="tooltip"
          >
            <div className={styles.tooltip}>
              <p className={styles.tooltipTitle}>
                {formatQuarterLabel(activeLabel.raw)}
                {activeLabel.forecast ? (
                  <span className={styles.tooltipForecast}> 예측</span>
                ) : null}
              </p>
              {hoverRows.map((r) => (
                <p key={r.name} className={styles.tooltipRow}>
                  <span
                    className={styles.tooltipSwatch}
                    style={{ background: r.color }}
                  />
                  {r.name}{' '}
                  <strong>
                    {Math.round(r.total).toLocaleString('ko-KR')}건
                  </strong>
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </DashboardCard>
  );
}
