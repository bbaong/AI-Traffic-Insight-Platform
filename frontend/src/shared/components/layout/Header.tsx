import type { UserRole } from '../../types/auth';
import styles from './Header.module.css';

export interface HeaderProps {
  title: string;
  role: UserRole;
  onMenuClick?: () => void;
  menuOpen?: boolean;
}

export function Header({
  title,
  role,
  onMenuClick,
  menuOpen = false,
}: HeaderProps) {
  const isGov = role === 'ROLE_A';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={menuOpen}
        >
          <span className={styles.menuIcon} aria-hidden="true" />
        </button>
        <h1 className={styles.title}>{title}</h1>
        <span
          className={`${styles.badge} ${isGov ? styles.badgeTeal : styles.badgeAmber}`}
        >
          {isGov ? '지자체' : '보험사'}
        </span>
      </div>
    </header>
  );
}
