import type { CSSProperties } from 'react';
import { DashboardCard } from '../../../shared/components/dashboard';
import type {
  RegionCompareDistrict,
  RegionCompareEntity,
} from '../api/govRegionCompare';
import { insightIcon, districtColor } from '../utils/regionCompareUi';
import surface from './compareSurface.module.css';
import styles from './CompareSummaryCard.module.css';

function TagIcon({ name }: { name: string }) {
  const common = {
    width: 12,
    height: 12,
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
  if (name === 'star') {
    return (
      <svg {...common} fill="currentColor" stroke="none">
        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
    </svg>
  );
}

function Crown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 18h18l-1.5-9-5 4-4.5-8-4.5 8-5-4L3 18z" />
    </svg>
  );
}

export function CompareSummaryCard({
  districts,
  cityAvg,
}: {
  districts: RegionCompareDistrict[];
  cityAvg: RegionCompareEntity;
}) {
  return (
    <DashboardCard
      title="비교 요약"
      className={`${surface.card} ${styles.card}`}
      leading={
        <span
          className={styles.info}
          title="위험 점수와 대구 전체 순위, 주요 특이사항입니다."
        >
          i
        </span>
      }
    >
      <div className={styles.banner}>
        대구 평균 {Math.round(cityAvg.summary.riskScore)}점
      </div>
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${Math.max(districts.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {districts.map((d) => {
          const rank = d.summary.rank;
          const first = rank === 1;
          const color = districtColor(d.districtName);
          const tags = d.summary.tags.length ? d.summary.tags : ['특이사항 없음'];
          return (
            <article
              key={d.districtId}
              className={styles.unit}
              style={{ '--unit-color': color } as CSSProperties}
            >
              <p className={styles.name}>{d.districtName}</p>
              <p className={styles.score}>{Math.round(d.summary.riskScore)}점</p>
              <p className={`${styles.rank} ${first ? styles.rankFirst : ''}`}>
                {first ? <Crown /> : null}
                {rank != null ? `${rank}위` : '—'}
                {d.summary.rankTotal ? (
                  <span> / {d.summary.rankTotal}</span>
                ) : null}
              </p>
              <ul className={styles.tags}>
                {tags.map((tag) => (
                  <li key={tag}>
                    <TagIcon name={insightIcon(tag)} />
                    {tag}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </DashboardCard>
  );
}
