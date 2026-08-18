import type { CSSProperties } from 'react';
import { DashboardCard } from '../../../shared/components/dashboard';
import type { RiskLevel } from '../../../shared/types/dashboard';
import { getRiskMeta } from '../../../shared/utils/riskMeta';
import type {
  RegionCompareDistrict,
  RegionCompareEntity,
} from '../api/govRegionCompare';
import { formatCount } from '../utils/comparisonFormat';
import { formatPeriodLabel } from '../utils/govFormat';
import {
  districtColor,
  insightIcon,
  onDistrictColor,
} from '../utils/regionCompareUi';
import surface from './compareSurface.module.css';
import styles from './CompareSummaryCard.module.css';

function TagIcon({ name }: { name: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  if (name === 'moon') {
    return (
      <svg {...common}>
        <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
      </svg>
    );
  }
  if (name === 'walk') {
    return (
      <svg {...common}>
        <circle cx="12" cy="5" r="2" />
        <path d="M10 22l2-6 2 2 2 4M12 9l-2 4h4l-1 3" />
      </svg>
    );
  }
  if (name === 'traffic') {
    return (
      <svg {...common}>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <circle cx="12" cy="7" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="17" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}

/** 지도 범례와 동일: ≥35 매우높음 / ≥28 높음 / ≥22 보통 */
function severeRateToRisk(ratePct: number | null): RiskLevel {
  if (ratePct == null) return 'MODERATE';
  if (ratePct >= 35) return 'CRITICAL';
  if (ratePct >= 28) return 'HIGH';
  if (ratePct >= 22) return 'MODERATE';
  return 'LOW';
}

function CountDelta({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className={styles.deltaFlat}>대구 평균과 같음</span>;
  }
  const up = delta > 0;
  return (
    <span className={up ? styles.deltaUp : styles.deltaDown}>
      {up ? '↑' : '↓'} {formatCount(Math.abs(delta))}건
    </span>
  );
}

export function CompareSummaryCard({
  districts,
  cityAvg,
  forecastLabel,
}: {
  districts: RegionCompareDistrict[];
  cityAvg: RegionCompareEntity;
  forecastLabel?: string | null;
}) {
  const cityCount = Math.round(cityAvg.summary.predictedAccidentCount || 0);
  const period = forecastLabel ? formatPeriodLabel(forecastLabel) : null;

  const caption = [
    period ? `예측 ${period}` : null,
    `대구 평균 ${formatCount(cityCount)}건`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <DashboardCard
      title="비교 요약"
      className={`${surface.card} ${styles.card}`}
      leading={
        <span
          className={styles.info}
          title="종합 위험도 점수, 다음 분기 예측 사고 건수, 대구 전체 순위와 주요 특이사항입니다. 1위는 중대율이 가장 높은 구입니다."
        >
          i
        </span>
      }
    >
      <p className={styles.caption}>{caption}</p>
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${Math.max(districts.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {districts.map((d) => {
          const rank = d.summary.rank;
          const rankTotal = d.summary.rankTotal;
          const color = districtColor(d.districtName);
          const onColor = onDistrictColor(color);
          const riskScore = Math.round(d.summary.riskScore);
          const count = Math.round(d.summary.predictedAccidentCount || 0);
          const delta = count - cityCount;
          const severe = d.summary.predictedSevereRatePct;
          const risk = getRiskMeta(severeRateToRisk(severe));
          const tag = d.summary.tags[0] ?? '특이사항 없음';

          return (
            <article
              key={d.districtId}
              className={styles.unit}
              style={{ '--unit-color': color } as CSSProperties}
            >
              <p className={styles.name} style={{ color: onColor }}>
                {d.districtName}
              </p>

              <div className={styles.block}>
                <p className={styles.label}>종합 위험도</p>
                <p className={styles.score}>{riskScore}점</p>
              </div>

              <div className={styles.block}>
                <p className={styles.label}>예측 사고</p>
                <p className={styles.count}>{formatCount(count)}건</p>
                <CountDelta delta={delta} />
              </div>

              <div className={styles.block}>
                <p className={styles.label}>
                  {rankTotal ? `구 순위 (대구 ${rankTotal}개 구 중)` : '구 순위'}
                </p>
                <p className={styles.rankValue}>
                  {rank != null ? `${rank}위` : '—'}
                </p>
                <span
                  className={styles.risk}
                  style={{ color: risk.colorVar }}
                >
                  {risk.icon} {risk.label}
                </span>
              </div>

              <p className={styles.tag}>
                <TagIcon name={insightIcon(tag)} />
                {tag}
              </p>
            </article>
          );
        })}
      </div>
    </DashboardCard>
  );
}
