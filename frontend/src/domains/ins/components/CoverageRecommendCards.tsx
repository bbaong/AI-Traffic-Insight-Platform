import type { CoverageRecommendItem } from '../types/prediction';
import styles from './CoverageRecommendCards.module.css';

interface Props {
  items: CoverageRecommendItem[];
}

export function CoverageRecommendCards({ items }: Props) {
  if (!items.length) {
    return (
      <p className={styles.empty}>분석 후 6대 담보 추천이 표시됩니다.</p>
    );
  }

  return (
    <ul className={styles.grid}>
      {items.map((item) => (
        <li
          key={item.id}
          className={`${styles.card} ${
            item.recommended ? styles.cardOn : styles.cardOff
          }`}
        >
          <div className={styles.head}>
            <h3 className={styles.name}>{item.name}</h3>
            <span className={styles.badge}>
              {item.recommended ? '추천' : '비추천'}
            </span>
          </div>
          <p className={styles.script}>{item.script}</p>
          <p className={styles.reason}>근거: {item.reason}</p>
        </li>
      ))}
    </ul>
  );
}