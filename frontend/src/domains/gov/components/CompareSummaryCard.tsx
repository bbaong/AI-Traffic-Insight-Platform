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
import { GovHint } from './GovHint';
import { GovMaterialIcon, isGovMaterialIcon } from './GovMaterialIcon';
import surface from './compareSurface.module.css';
import styles from './CompareSummaryCard.module.css';

function TagIcon({ name }: { name: string }) {
  if (isGovMaterialIcon(name)) {
    return <GovMaterialIcon name={name} size={16} />;
  }
  return <GovMaterialIcon name="info" size={16} />;
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
        <GovHint
          nowrap
          text={'종합 위험도 · 예측 사고 · 구 순위와 특이사항입니다.\n1위는 중대율이 가장 높은 구입니다.'}
        >
          <span className={surface.info}>
            <GovMaterialIcon name="info" size={16} />
          </span>
        </GovHint>
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
