import { DashboardCard } from '../../../shared/components/dashboard';
import type { ComparisonMetrics, GovComparisonData } from '../api/govDashboard';
import {
  barWidthPct,
  calcBarScaleMax,
  calcDeltaPctPoints,
  formatCount,
  formatDeltaBadge,
  formatPct1,
} from '../utils/comparisonFormat';
import { GovMaterialIcon } from './GovMaterialIcon';
import styles from './ComparisonCard.module.css';

const METRICS = [
  {
    id: 'pedestrian',
    label: '보행자 사고',
    pctKey: 'pedestrianPct',
    countKey: 'pedestrianCount',
    icon: 'walk',
  },
  {
    id: 'night',
    label: '야간 사고',
    pctKey: 'nightPct',
    countKey: 'nightCount',
    icon: 'moon',
  },
  {
    id: 'serious',
    label: '중상 이상',
    pctKey: 'seriousPct',
    countKey: 'seriousCount',
    icon: 'shield',
  },
  {
    id: 'signal',
    label: '신호위반',
    pctKey: 'signalPct',
    countKey: 'signalCount',
    icon: 'traffic',
  },
] as const;

type MetricIcon = (typeof METRICS)[number]['icon'];
type PctKey = (typeof METRICS)[number]['pctKey'];
type CountKey = (typeof METRICS)[number]['countKey'];

export interface ComparisonCardProps {
  districtName: string | null;
  data: GovComparisonData | null;
  loading?: boolean;
  error?: string | null;
}

function MetricIconSvg({ name }: { name: MetricIcon }) {
  return <GovMaterialIcon name={name} size={14} />;
}

function readPct(m: ComparisonMetrics, key: PctKey): number {
  return Number(m[key]) || 0;
}

function readCount(m: ComparisonMetrics, key: CountKey): number {
  return Number(m[key]) || 0;
}

function errorText(error: string | null): string {
  if (!error) return '';
  if (error.includes('형식이 올바르지') || error.includes('districtId')) {
    return 'id 형식이 올바르지 않습니다.';
  }
  if (
    error.includes('없습니다') ||
    error.includes('404') ||
    error === '해당 구 데이터가 없습니다'
  ) {
    return '해당 구의 비교 데이터가 없습니다';
  }
  return error;
}

function SkeletonRows() {
  return (
    <div className={styles.fill}>
      <ul className={styles.list} aria-busy="true" aria-label="비교 지표 로딩">
        {METRICS.map((m) => (
          <li key={m.id} className={`${styles.rowCard} ${styles.skeletonRow}`}>
            <div className={styles.skelBlock} />
            <div className={styles.skelMid}>
              <div className={styles.skelBlock} />
              <div className={styles.skelBlock} />
            </div>
            <div className={styles.skelBadge} />
          </li>
        ))}
      </ul>
    </div>
  );
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
      <DashboardCard title={title} className={styles.card}>
        <p className={styles.hint}>지도에서 구·군을 선택하세요.</p>
      </DashboardCard>
    );
  }

  if (loading && !data) {
    return (
      <DashboardCard title={title} className={styles.card}>
        <SkeletonRows />
      </DashboardCard>
    );
  }

  if (error && !data) {
    return (
      <DashboardCard title={title} className={styles.card}>
        <p className={styles.hint} role="alert">
          {errorText(error)}
        </p>
      </DashboardCard>
    );
  }

  if (!data) {
    return (
      <DashboardCard title={title} className={styles.card}>
        <p className={styles.hint}>해당 구의 비교 데이터가 없습니다</p>
      </DashboardCard>
    );
  }

  const { district, cityAvg } = data;
  const scaleMax = calcBarScaleMax(
    METRICS.flatMap((m) => [
      readPct(district, m.pctKey),
      readPct(cityAvg, m.pctKey),
    ]),
  );

  const districtTotal = formatCount(district.totalCount);
  const cityTotal = formatCount(cityAvg.totalCount);

  return (
    <DashboardCard
      title={title}
      className={styles.card}
      action={
        <div className={styles.totalPills} aria-label="전체 사고 건수 요약">
          <span className={`${styles.pill} ${styles.pillDistrict}`}>
            {districtName} 전체 {districtTotal}건
          </span>
          <span className={`${styles.pill} ${styles.pillCity}`}>
            대구 평균 전체 {cityTotal}건
          </span>
        </div>
      }
    >
      <p className={styles.periodNote}>2016.10~2025.09 누적 기준</p>
      <div className={styles.fill}>
        <ul className={styles.list}>
          {METRICS.map((metric) => {
            const dPct = readPct(district, metric.pctKey);
            const cPct = readPct(cityAvg, metric.pctKey);
            const dCount = readCount(district, metric.countKey);
            const delta = calcDeltaPctPoints(dPct, cPct);
            const up = delta > 0;
            const down = delta < 0;
            const dBar = barWidthPct(dPct, scaleMax);
            const cBar = barWidthPct(cPct, scaleMax);
            const countTitle =
              '비율과 전체 건수로 역산한 추정값입니다. 항목 간 합산은 전체와 일치하지 않을 수 있습니다.';

            return (
              <li key={metric.id} className={styles.rowCard}>
                <div className={styles.metricHead}>
                  <span className={styles.iconWrap}>
                    <MetricIconSvg name={metric.icon} />
                  </span>
                  <span className={styles.metricLabel}>{metric.label}</span>
                </div>

                <div className={styles.compareCols}>
                  <div className={styles.sideBlock}>
                    <span className={styles.sideLabel}>{districtName}</span>
                    <span
                      className={styles.sideValue}
                      title={countTitle}
                    >
                      {formatPct1(dPct)}{' '}
                      <span className={styles.countHint}>
                        ({formatCount(dCount)}건)
                      </span>
                    </span>
                    <span
                      className={styles.miniTrack}
                      role="img"
                      aria-label={`${districtName} ${metric.label} 비율 ${formatPct1(dPct)}`}
                    >
                      <span
                        className={`${styles.miniFill} ${styles.miniDistrict}`}
                        style={{ width: `${dBar}%` }}
                      />
                    </span>
                  </div>

                  <div className={styles.sideBlock}>
                    <span className={styles.sideLabel}>대구 평균</span>
                    <span
                      className={styles.sideValue}
                      title={countTitle}
                    >
                      {formatPct1(cPct)}{' '}
                      
                    </span>
                    <span
                      className={styles.miniTrack}
                      role="img"
                      aria-label={`대구 평균 ${metric.label} 비율 ${formatPct1(cPct)}`}
                    >
                      <span
                        className={`${styles.miniFill} ${styles.miniCity}`}
                        style={{ width: `${cBar}%` }}
                      />
                    </span>
                  </div>
                </div>

                <span
                  className={`${styles.deltaBadge} ${
                    up
                      ? styles.deltaUp
                      : down
                        ? styles.deltaDown
                        : styles.deltaFlat
                  }`}
                  aria-label={
                    up
                      ? `대구 평균 대비 ${Math.abs(delta).toFixed(1)}퍼센트포인트 높음`
                      : down
                        ? `대구 평균 대비 ${Math.abs(delta).toFixed(1)}퍼센트포인트 낮음`
                        : '대구 평균과 동일'
                  }
                >
                  {formatDeltaBadge(delta)}
                </span>
              </li>
            );
          })}
        </ul>

        <p className={styles.unitNote}>
          (단위: %, %p, 건 · 건수는 비율 역산 추정값)
        </p>
      </div>
    </DashboardCard>
  );
}
