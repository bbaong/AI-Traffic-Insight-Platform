import type { ReactNode } from 'react';
import styles from './DashboardCard.module.css';

export interface DashboardCardProps {
  title: string;
  children: ReactNode;
  /** 헤더 왼쪽(제목 뒤)에 표시 */
  leading?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function DashboardCard({
  title,
  children,
  leading,
  action,
  className,
}: DashboardCardProps) {
  return (
    <section className={`${styles.card} ${className ?? ''}`}>
      <div className={styles.head}>
        <div className={styles.headStart}>
          <h2 className={styles.title}>{title}</h2>
          {leading}
        </div>
        {action}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
