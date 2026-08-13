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
  const title = '우선점검 제안';

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
      <DashboardCard title={title} className={styles.card}>
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            ✓
          </span>
          <p className={styles.emptyTitle}>현재 개선 제안이 없습니다</p>
          <p className={styles.emptyDesc}>
            선택 구 지표가 대구 평균 이하입니다.
          </p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title={title} className={styles.card}>
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
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
