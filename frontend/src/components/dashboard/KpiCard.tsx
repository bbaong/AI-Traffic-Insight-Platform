import type { KpiData } from '../../types/dashboard';
import styles from './KpiCard.module.css';

export interface KpiCardProps {
  data: KpiData;
}

export function KpiCard({ data }: KpiCardProps) {
  const deltaClass =
    data.delta?.direction === 'up'
      ? styles.deltaUp
      : data.delta?.direction === 'down'
        ? styles.deltaDown
        : undefined;

  return (
    <article className={styles.card}>
      <p className={styles.label}>{data.label}</p>
      <p className={styles.value}>{data.value}</p>
      {data.delta ? (
        <p className={`${styles.delta} ${deltaClass ?? ''}`}>{data.delta.label}</p>
      ) : null}
    </article>
  );
}
