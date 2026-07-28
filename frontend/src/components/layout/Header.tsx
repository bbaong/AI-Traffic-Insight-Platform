import type { UserRole } from '../../types/auth';
import styles from './Header.module.css';

export interface HeaderProps {
  title: string;
  role: UserRole;
}

export function Header({ title, role }: HeaderProps) {
  const isGov = role === 'ROLE_A';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>{title}</h1>
        <span
          className={`${styles.badge} ${isGov ? styles.badgeTeal : styles.badgeAmber}`}
        >
          {isGov ? '지자체' : '보험사'}
        </span>
      </div>
      <button type="button" className={styles.period} disabled>
        최근 12개월 ▾
      </button>
    </header>
  );
}
