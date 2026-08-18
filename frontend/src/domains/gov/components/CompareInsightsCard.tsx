import { useEffect, useMemo, useState } from 'react';
import { DashboardCard } from '../../../shared/components/dashboard';
import type { RegionCompareInsight } from '../api/govRegionCompare';
import {
  districtColor,
  insightIcon,
  onDistrictColor,
} from '../utils/regionCompareUi';
import { GovMaterialIcon, isGovMaterialIcon } from './GovMaterialIcon';
import surface from './compareSurface.module.css';
import styles from './CompareInsightsCard.module.css';

function Icon({ name }: { name: string }) {
  if (isGovMaterialIcon(name)) {
    return <GovMaterialIcon name={name} size={16} />;
  }
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
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
  const districts = useMemo(() => {
    const seen = new Map<number, string>();
    for (const item of insights) {
      if (item.districtId == null || !item.districtName) continue;
      if (!seen.has(item.districtId)) seen.set(item.districtId, item.districtName);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [insights]);

  const [filterId, setFilterId] = useState<number | null>(null);

  useEffect(() => {
    if (filterId != null && !districts.some((d) => d.id === filterId)) {
      setFilterId(null);
    }
  }, [districts, filterId]);

  const visible =
    filterId == null
      ? insights
      : insights.filter((item) => item.districtId === filterId);

  return (
    <DashboardCard
      title="비교 인사이트"
      className={`${surface.card} ${styles.card}`}
      action={
        districts.length > 0 ? (
          <div className={styles.filters} role="tablist" aria-label="인사이트 지역 필터">
            <button
              type="button"
              role="tab"
              aria-selected={filterId == null}
              className={`${styles.filter} ${filterId == null ? styles.filterAllOn : ''}`}
              onClick={() => setFilterId(null)}
            >
              전체
            </button>
            {districts.map((d) => {
              const on = filterId === d.id;
              const color = districtColor(d.name);
              return (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={styles.filter}
                  style={
                    on
                      ? {
                          background: color,
                          color: onDistrictColor(color),
                          borderColor: color,
                        }
                      : undefined
                  }
                  onClick={() => setFilterId(d.id)}
                >
                  <i style={{ background: color }} aria-hidden />
                  {d.name}
                </button>
              );
            })}
          </div>
        ) : undefined
      }
    >
      {insights.length === 0 || visible.length === 0 ? (
        <p className={styles.empty}>
          {insights.length === 0
            ? '표시할 인사이트가 없습니다.'
            : '이 지역의 인사이트가 없습니다.'}
        </p>
      ) : (
        <div className={styles.scroll}>
          <ul className={styles.list}>
            {visible.map((item, i) => (
              <li key={`${item.key}-${item.districtId ?? 'rel'}-${i}`}>
                <span className={styles.icon}>
                  <Icon name={insightIcon(item.key)} />
                </span>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  );
}
