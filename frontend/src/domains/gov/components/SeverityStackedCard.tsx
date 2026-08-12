import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DashboardCard } from '../../../shared/components/dashboard';
import {
  GOV_SEVERITY_KEYS,
  toSeveritySeries,
  type GovHistoryResponse,
  type GovSeverityKey,
} from '../api/prediction';
import styles from './SeverityStackedCard.module.css';

const SEVERITY_COLORS: Record<GovSeverityKey, string> = {
  사망사고: '#E53935',
  중상사고: '#FF8A4C',
  경상사고: '#F0B429',
  부상신고사고: '#43A047',
};

const FORECAST_COLOR = '#21adc4';

const CHART = {
  width: 560,
  height: 228,
  padTop: 16,
  padRight: 36,
  padBottom: 42,
  padLeft: 36,
};

function formatPeriod(raw: string): string {
  const q = /^(\d{4})Q([1-4])$/i.exec(raw);
  if (q) return `${q[1].slice(2)}년 ${q[2]}분기`;
  return raw;
}

function getPlotSize() {
  return {
    w: CHART.width - CHART.padLeft - CHART.padRight,
    h: CHART.height - CHART.padTop - CHART.padBottom,
  };
}

function xAt(index: number, count: number): number {
  const { w } = getPlotSize();
  if (count <= 1) return CHART.padLeft + w / 2;
  return CHART.padLeft + (index / (count - 1)) * w;
}

function yAt(value: number, maxY: number): number {
  const { h } = getPlotSize();
  if (maxY <= 0) return CHART.padTop + h;
  return CHART.padTop + h - (value / maxY) * h;
}

function niceMaxY(raw: number): number {
  if (raw <= 0) return 1;
  const padded = raw * 1.12;
  const step = padded <= 50 ? 10 : padded <= 200 ? 25 : 50;
  return Math.ceil(padded / step) * step;
}

function yTicks(maxY: number): number[] {
  const step = maxY <= 50 ? 10 : maxY <= 200 ? 25 : 50;
  const ticks: number[] = [];
  for (let v = 0; v <= maxY; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== maxY) ticks.push(maxY);
  return ticks;
}

type HoverPoint = {
  key: GovSeverityKey;
  pointIndex: number;
};

type TooltipPlacement = 'above' | 'below';

type TooltipPos = {
  left: number;
  top: number;
  placement: TooltipPlacement;
};

const TOOLTIP_EST_HEIGHT = 78;
const TOOLTIP_GAP = 10;

export interface SeverityStackedCardProps {
  regionName: string | null;
  data: GovHistoryResponse | null;
  loading?: boolean;
  error?: string | null;
}

export function SeverityStackedCard({
  regionName,
  data,
  loading,
  error,
}: SeverityStackedCardProps) {
  const [hover, setHover] = useState<HoverPoint | null>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const title = regionName
    ? `사고 추세 및 예측 · ${regionName}`
    : '사고 추세 및 예측';

  if (!regionName) {
    return (
      <DashboardCard title={title}>
        <p className={styles.hint}>지도에서 구·군을 선택하세요.</p>
      </DashboardCard>
    );
  }

  const matched =
    data && regionName && data.지역 === regionName ? data : null;

  if (loading && !matched) {
    return (
      <DashboardCard title={title}>
        <p className={styles.hint} aria-busy="true">
          분석 중…
        </p>
      </DashboardCard>
    );
  }

  if (error && !matched) {
    return (
      <DashboardCard title={title}>
        <p className={styles.hint}>{error}</p>
      </DashboardCard>
    );
  }

  if (!matched) {
    return (
      <DashboardCard title={title}>
        <p className={styles.hint} aria-busy={loading}>
          {loading ? '분석 중…' : '데이터가 없습니다.'}
        </p>
      </DashboardCard>
    );
  }

  const series = toSeveritySeries(matched);
  const lastActualIdx = Math.max(0, series.length - 2);
  const hasForecast =
    series.length > 1 && series[series.length - 1]?.kind === 'forecast';

  const maxValue = Math.max(
    ...series.flatMap((p) =>
      GOV_SEVERITY_KEYS.map((key) => p.경중_건수[key] ?? 0),
    ),
    1,
  );
  const maxY = niceMaxY(maxValue);
  const ticks = yTicks(maxY);

  const yScale = (value: number) => yAt(value, maxY);

  const hoverPoint =
    hover != null ? series[hover.pointIndex] : null;
  const hoverValue =
    hoverPoint && hover
      ? (hoverPoint.경중_건수[hover.key] ?? 0)
      : 0;
  const hoverX =
    hover != null ? xAt(hover.pointIndex, series.length) : 0;
  const hoverY = hover != null ? yScale(hoverValue) : 0;

  function getTooltipPos(svgX: number, svgY: number): TooltipPos | null {
    const svg = svgRef.current;
    if (!svg) return null;

    const pt = svg.createSVGPoint();
    pt.x = svgX;
    pt.y = svgY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;

    const screen = pt.matrixTransform(ctm);
    const placement: TooltipPlacement =
      screen.y >= TOOLTIP_EST_HEIGHT + TOOLTIP_GAP ? 'above' : 'below';

    return {
      left: screen.x,
      top: screen.y,
      placement,
    };
  }

  const tooltipPos = hover ? getTooltipPos(hoverX, hoverY) : null;

  return (
    <DashboardCard
      title={title}
      className={styles.card}
      action={
        <p className={styles.sub}>
          직전 4분기 실적 + 다음 분기 예측 (상해정도별 건수)
        </p>
      }
    >
      <div
        ref={chartWrapRef}
        className={styles.chartWrap}
        role="img"
        aria-label="상해정도별 선 그래프"
        onMouseLeave={() => setHover(null)}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          className={styles.svg}
          preserveAspectRatio="xMidYMid meet"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={CHART.padLeft}
                y1={yScale(tick)}
                x2={CHART.width - CHART.padRight}
                y2={yScale(tick)}
                className={styles.gridLine}
              />
              <text
                x={CHART.padLeft - 8}
                y={yScale(tick)}
                className={styles.yLabel}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {tick}
              </text>
            </g>
          ))}

          {GOV_SEVERITY_KEYS.map((key) => {
            const color = SEVERITY_COLORS[key];
            const solidEnd = hasForecast ? lastActualIdx : series.length - 1;

            const solidPath = series
              .slice(0, solidEnd + 1)
              .map((point, i) => {
                const value = point.경중_건수[key] ?? 0;
                return `${i === 0 ? 'M' : 'L'} ${xAt(i, series.length)} ${yScale(value)}`;
              })
              .join(' ');

            const forecastPath =
              hasForecast && solidEnd >= 0
                ? (() => {
                    const from = series[solidEnd];
                    const to = series[series.length - 1];
                    const fromVal = from?.경중_건수[key] ?? 0;
                    const toVal = to?.경중_건수[key] ?? 0;
                    return `M ${xAt(solidEnd, series.length)} ${yScale(fromVal)} L ${xAt(series.length - 1, series.length)} ${yScale(toVal)}`;
                  })()
                : null;

            return (
              <g key={key}>
                {solidPath ? (
                  <path
                    d={solidPath}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {forecastPath ? (
                  <path
                    d={forecastPath}
                    fill="none"
                    stroke={FORECAST_COLOR}
                    strokeWidth={2.25}
                    strokeLinecap="round"
                    strokeDasharray="6 4"
                    className={styles.forecastLine}
                  />
                ) : null}
                {series.map((point, i) => {
                  const value = point.경중_건수[key] ?? 0;
                  const isForecast = point.kind === 'forecast';
                  const cx = xAt(i, series.length);
                  const cy = yScale(value);
                  const isActive =
                    hover?.key === key && hover.pointIndex === i;

                  return (
                    <g key={`${key}-${point.분기}`}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={10}
                        fill="transparent"
                        className={styles.dotHit}
                        onMouseEnter={() =>
                          setHover({ key, pointIndex: i })
                        }
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isActive ? (isForecast ? 5.5 : 4.5) : isForecast ? 4.5 : 3.5}
                        fill={isForecast ? '#fff' : color}
                        stroke={isForecast ? FORECAST_COLOR : '#fff'}
                        strokeWidth={isActive ? 2.5 : isForecast ? 2.25 : 1.5}
                        className={styles.dot}
                        pointerEvents="none"
                      />
                      {isForecast ? (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={2.5}
                          fill={color}
                          pointerEvents="none"
                        />
                      ) : null}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {series.map((point, i) => {
            const isForecast = point.kind === 'forecast';
            const x = xAt(i, series.length);

            return (
              <text
                key={`label-${point.분기}`}
                x={x}
                y={CHART.height - 12}
                className={`${styles.xLabel} ${isForecast ? styles.xLabelForecast : ''}`}
                textAnchor="middle"
              >
                {formatPeriod(point.분기)}
              </text>
            );
          })}
        </svg>
        {hover && hoverPoint && tooltipPos
          ? createPortal(
              <div
                className={`${styles.tooltip} ${
                  tooltipPos.placement === 'below'
                    ? styles.tooltipBelow
                    : styles.tooltipAbove
                }`}
                role="tooltip"
                style={{
                  left: tooltipPos.left,
                  top: tooltipPos.top,
                }}
              >
                <p className={styles.tooltipTitle}>
                  {formatPeriod(hoverPoint.분기)}
                  {hoverPoint.kind === 'forecast' ? (
                    <span className={styles.tooltipForecast}> 예측</span>
                  ) : null}
                </p>
                <p className={styles.tooltipRow}>
                  <span
                    className={styles.tooltipSwatch}
                    style={{ background: SEVERITY_COLORS[hover.key] }}
                  />
                  {hover.key.replace('사고', '')}{' '}
                  <strong>{hoverValue.toLocaleString('ko-KR')}건</strong>
                </p>
                <p className={styles.tooltipTotal}>
                  총 {hoverPoint.사고건수.toLocaleString('ko-KR')}건
                </p>
              </div>,
              document.body,
            )
          : null}
      </div>
      <ul className={styles.legend}>
        {GOV_SEVERITY_KEYS.map((key) => (
          <li key={key}>
            <span
              className={styles.swatch}
              style={{ background: SEVERITY_COLORS[key] }}
            />
            {key.replace('사고', '')}
          </li>
        ))}
        {hasForecast ? (
          <li className={styles.legendForecast}>
            <span className={styles.swatchDashed} />
            예측 구간
          </li>
        ) : null}
      </ul>
    </DashboardCard>
  );
}
