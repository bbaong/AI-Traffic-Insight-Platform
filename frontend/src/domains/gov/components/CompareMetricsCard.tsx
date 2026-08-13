import { DashboardCard } from '../../../shared/components/dashboard';
import type {
  ComparisonMetrics,
  RegionCompareDistrict,
  RegionCompareEntity,
} from '../api/govRegionCompare';
import { CITY_AVG_COLOR, districtColor } from '../utils/regionCompareUi';
import { formatPct1 } from '../utils/comparisonFormat';
import surface from './compareSurface.module.css';
import styles from './CompareMetricsCard.module.css';

const METRICS = [
  { id: 'pedestrian', label: '보행자 사고 비율', key: 'pedestrianPct' },
  { id: 'night', label: '야간 사고 비율', key: 'nightPct' },
  { id: 'serious', label: '중상 이상 비율', key: 'seriousPct' },
  { id: 'signal', label: '신호위반 비율', key: 'signalPct' },
] as const;

type PctKey = (typeof METRICS)[number]['key'];

function readPct(m: ComparisonMetrics, key: PctKey): number {
  return Number(m[key]) || 0;
}

function niceAxisMax(raw: number): number {
  if (raw <= 0) return 10;
  const padded = raw * 1.2;
  const step = padded <= 20 ? 5 : 10;
  return Math.ceil(padded / step) * step;
}

export function CompareMetricsCard({
  districts,
  cityAvg,
}: {
  districts: RegionCompareDistrict[];
  cityAvg: RegionCompareEntity;
}) {
  const scaleMax = niceAxisMax(
    Math.max(
      0,
      ...districts.flatMap((d) => METRICS.map((m) => readPct(d.metrics, m.key))),
      ...METRICS.map((m) => readPct(cityAvg.metrics, m.key)),
    ),
  );
  const tickStep = scaleMax <= 20 ? 5 : 10;
  const ticks: number[] = [];
  for (let v = 0; v <= scaleMax; v += tickStep) ticks.push(v);

  return (
    <DashboardCard
      title="핵심 지표 비교"
      className={`${surface.card} ${styles.card}`}
      leading={
        <span
          className={styles.info}
          title="선택 지역과 대구 평균의 보행·야간·중상·신호위반 비율입니다."
        >
          i
        </span>
      }
      action={
        <ul className={styles.legend}>
          {districts.map((d) => (
            <li key={d.districtId}>
              <i style={{ background: districtColor(d.districtName) }} />
              {d.districtName}
            </li>
          ))}
          <li>
            <span className={styles.avgLegendMark} aria-hidden>
              <span className={styles.diamond} />
              <span className={styles.dash} />
            </span>
            대구 평균
          </li>
        </ul>
      }
    >
      <ul className={styles.list}>
        {METRICS.map((metric) => {
          const cityPct = readPct(cityAvg.metrics, metric.key);
          const cityLeft = scaleMax > 0 ? (cityPct / scaleMax) * 100 : 0;

          return (
            <li key={metric.id} className={styles.row}>
              <p className={styles.rowLabel}>{metric.label}</p>
              <div className={styles.plot}>
                <div
                  className={styles.plotInner}
                  role="img"
                  aria-label={`${metric.label}. ${districts
                    .map(
                      (d) =>
                        `${d.districtName} ${formatPct1(readPct(d.metrics, metric.key))}`,
                    )
                    .join(', ')}. 대구 평균 ${formatPct1(cityPct)}`}
                >
                  {districts.map((d) => {
                    const pct = readPct(d.metrics, metric.key);
                    const w = scaleMax > 0 ? (pct / scaleMax) * 100 : 0;
                    const color = districtColor(d.districtName);
                    return (
                      <div key={d.districtId} className={styles.barRow}>
                        <span
                          className={styles.bar}
                          style={{ width: `${w}%`, background: color }}
                        />
                        <em
                          className={styles.barVal}
                          style={{ left: `calc(${w}% + 8px)`, color }}
                        >
                          {formatPct1(pct)}
                        </em>
                      </div>
                    );
                  })}
                  <span
                    className={styles.avgLine}
                    style={{ left: `${cityLeft}%`, borderColor: CITY_AVG_COLOR }}
                  >
                    <span
                      className={styles.avgDiamond}
                      style={{ background: CITY_AVG_COLOR }}
                    />
                    <span
                      className={styles.avgLabel}
                      style={{ color: CITY_AVG_COLOR }}
                    >
                      평균 {formatPct1(cityPct)}
                    </span>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className={styles.axis} aria-hidden>
        <span />
        <div className={styles.axisTrack}>
          {ticks.map((n) => (
            <span key={n}>{n}%</span>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
