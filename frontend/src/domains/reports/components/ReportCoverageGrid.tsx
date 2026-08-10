import type { CoverageRecommendItem } from '../../ins/types/prediction';
import styles from './ReportCoverageGrid.module.css';

/** ai/src/coverage_rules.py id 매핑 */
const ICONS: Record<string, string> = {
  bodily_i: '①',
  bodily_ii: '👤',
  property: '👥',
  personal_injury: '🚙',
  own_damage: '🚗',
  uninsured: '🛣',
};

type Props = { items: CoverageRecommendItem[] };

export function ReportCoverageGrid({ items }: Props) {
  if (!items.length) {
    return <p className={styles.empty}>담보 추천 데이터가 없습니다.</p>;
  }

  return (
    <ul className={styles.grid}>
      {items.map((item) => (
        <li
          key={item.id}
          className={`${styles.card} ${item.recommended ? styles.on : styles.off}`}
        >
          <div className={styles.icon} aria-hidden>
            {ICONS[item.id] ?? '•'}
          </div>
          <div className={styles.body}>
            <div className={styles.head}>
              <h3 className={styles.name}>{item.name}</h3>
              <span
                className={
                  item.recommended ? styles.badgeOn : styles.badgeOff
                }
              >
                {item.recommended ? '추천' : '제외'}
              </span>
            </div>
            <p className={styles.script}>{item.script}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}