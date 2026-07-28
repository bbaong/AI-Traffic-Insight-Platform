import type { ReactNode } from 'react';
import styles from './DashboardCard.module.css';

export interface DashboardCardProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function DashboardCard({
  title,
  children,
  action,
  className,
}: DashboardCardProps) {
  return (
    <section className={`${styles.card} ${className ?? ''}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {action}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
