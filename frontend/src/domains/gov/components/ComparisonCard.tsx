import { DashboardCard } from '../../../shared/components/dashboard';
import type { GovComparisonData } from '../api/govDashboard';
import styles from './ComparisonCard.module.css';

const AXIS_MAX = 40;

const METRICS = [
  { key: 'pedestrianPct', label: '보행자 사고 비율' },
  { key: 'nightPct', label: '야간 사고 비율' },
  { key: 'seriousPct', label: '중상 이상 비율' },
  { key: 'signalPct', label: '신호위반 비율' },
] as const;

type MetricKey = (typeof METRICS)[number]['key'];

export interface ComparisonCardProps {
  districtName: string | null;
  data: GovComparisonData | null;
  loading?: boolean;
  error?: string | null;
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function formatDelta(n: number): string {
  const abs = Math.abs(n).toFixed(1);
  if (n > 0) return `↑ ${abs}%p`;
  if (n < 0) return `↓ ${abs}%p`;
  return `0.0%p`;
}

function barWidth(pct: number): string {
  return `${Math.min(100, Math.max(0, (pct / AXIS_MAX) * 100))}%`;
}

function errorText(error: string | null): string {
  if (!error) return '';
  if (error.includes('형식이 올바르지') || error.includes('districtId')) {
    return 'id 형식이 올바르지 않습니다.';
  }
  if (error === '해당 구 데이터가 없습니다' || error.includes('없습니다')) {
    return '해당 구 데이터가 없습니다';
  }
  return error;
}

export function ComparisonCard({
  districtName,
  data,
  loading,
  error,
}: ComparisonCardProps) {
  const title = '대구 평균 대비 비교';

  if (!districtName) {
    return (
      <DashboardCard title={title}>
        <p className={styles.hint}>지도에서 구·군을 선택하세요.</p>
      </DashboardCard>
    );
  }

  if (loading && !data) {
    return (
      <DashboardCard title={title}>
        <div className={styles.skeleton} aria-busy="true">
          <span className={styles.hint}>비교 지표를 불러오는 중…</span>
        </div>
      </DashboardCard>
    );
  }

  if (error && !data) {
    return (
      <DashboardCard title={title}>
        <p className={styles.hint} role="alert">
          {errorText(error)}
        </p>
      </DashboardCard>
    );
  }

  if (!data) {
    return (
      <DashboardCard title={title}>
        <p className={styles.hint}>해당 구 데이터가 없습니다</p>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title}>
      <ul className={styles.list}>
        {METRICS.map((metric) => {
          const districtVal = data.district[metric.key as MetricKey];
          const cityVal = data.cityAvg[metric.key as MetricKey];
          const delta = districtVal - cityVal;
          const up = delta > 0;
          const down = delta < 0;
          return (
            <li key={metric.key} className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.metricLabel}>{metric.label}</p>
                <div className={styles.bars}>
                  <div className={styles.barLine}>
                    <span className={styles.barTrack} aria-hidden="true">
                      <span
                        className={`${styles.barFill} ${styles.barDistrict}`}
                        style={{ width: barWidth(districtVal) }}
                      />
                    </span>
                    <span className={styles.barValue}>{formatPct(districtVal)}</span>
                  </div>
                  <div className={styles.barLine}>
                    <span className={styles.barTrack} aria-hidden="true">
                      <span
                        className={`${styles.barFill} ${styles.barCity}`}
                        style={{ width: barWidth(cityVal) }}
                      />
                    </span>
                    <span className={styles.barValue}>{formatPct(cityVal)}</span>
                  </div>
                </div>
              </div>
              <span
                className={`${styles.delta} ${
                  up ? styles.deltaUp : down ? styles.deltaDown : ''
                }`}
              >
                {formatDelta(delta)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className={styles.axis} aria-hidden="true">
        <span>0%</span>
        <span>10%</span>
        <span>20%</span>
        <span>30%</span>
        <span>40%</span>
      </div>
      <p className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.barDistrict}`} />
          {districtName}
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.barCity}`} />
          대구시 평균
        </span>
      </p>
    </DashboardCard>
  );
}
