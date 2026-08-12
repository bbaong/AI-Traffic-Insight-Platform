import { DashboardCard } from '../../../shared/components/dashboard';
import type { GovSuggestionItem } from '../api/govDashboard';
import styles from './SuggestionsCard.module.css';

const ICON_EMOJI: Record<string, string> = {
  bulb: '💡',
  'traffic-light': '🚦',
  pedestrian: '🚶',
  parking: '🅿️',
};

export interface SuggestionsCardProps {
  data: GovSuggestionItem[] | null;
  loading?: boolean;
  error?: string | null;
}

function errorText(error: string | null): string {
  if (!error) return '';
  if (error.includes('형식이 올바르지') || error.includes('districtId')) {
    return 'id 형식이 올바르지 않습니다.';
  }
  if (error.includes('없습니다')) {
    return '해당 구 데이터가 없습니다';
  }
  return error;
}

export function SuggestionsCard({
  data,
  loading,
  error,
}: SuggestionsCardProps) {
  const title = 'AI 우선점검 제안';

  if (loading && !data) {
    return (
      <DashboardCard title={title}>
        <p className={styles.hint} aria-busy="true">
          제안을 불러오는 중…
        </p>
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

  if (!data || data.length === 0) {
    return (
      <DashboardCard title={title}>
        <p className={styles.hint}>현재 개선 제안이 없습니다</p>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title}>
      <ul className={styles.list}>
        {data.map((item) => (
          <li key={item.key} className={styles.item}>
            <span className={styles.icon} aria-hidden="true">
              {ICON_EMOJI[item.icon] ?? '📌'}
            </span>
            <div className={styles.body}>
              <p className={styles.itemTitle}>{item.title}</p>
              <p className={styles.desc}>{item.desc}</p>
            </div>
            <span className={styles.chevron} aria-hidden="true">
              ›
            </span>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
