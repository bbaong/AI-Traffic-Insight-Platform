import { DashboardCard } from '../../../shared/components/dashboard';
import type { RegionCompareInsight } from '../api/govRegionCompare';
import { insightIcon } from '../utils/regionCompareUi';
import surface from './compareSurface.module.css';
import styles from './CompareInsightsCard.module.css';

function Icon({ name }: { name: string }) {
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
  if (name === 'chart') {
    return (
      <svg {...common}>
        <path d="M4 19V5M4 19h16" />
        <path d="M8 15l4-5 3 3 5-7" />
      </svg>
    );
  }
  if (name === 'parking') {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 17V7h5a3 3 0 0 1 0 6H9" />
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

export function CompareInsightsCard({
  insights,
}: {
  insights: RegionCompareInsight[];
}) {
  return (
    <DashboardCard title="비교 인사이트" className={`${surface.card} ${styles.card}`}>
      {insights.length === 0 ? (
        <p className={styles.empty}>표시할 인사이트가 없습니다.</p>
      ) : (
        <ul className={styles.list}>
          {insights.map((item, i) => (
            <li key={`${item.key}-${item.districtId ?? 'rel'}-${i}`}>
              <span className={styles.icon}>
                <Icon name={insightIcon(item.key)} />
              </span>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
