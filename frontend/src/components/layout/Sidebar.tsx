import { Link, NavLink } from 'react-router-dom';
import { SIDEBAR_MENUS } from '../../constants/sidebarMenus';
import { ROUTES } from '../../constants/routes';
import { clearAuthStorage, useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types/auth';
import styles from './Sidebar.module.css';

export interface SidebarProps {
  role: UserRole;
  open?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ role, open = false, onNavigate }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const menus = SIDEBAR_MENUS[role];
  const isGov = role === 'ROLE_A';

  function handleLogout(): void {
    clearAuthStorage();
    window.location.replace(ROUTES.LANDING);
  }

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
      <Link
        to={ROUTES.LANDING}
        className={styles.brand}
        aria-label="AI Traffic Insight 홈"
        onClick={onNavigate}
      >
        <img
          src="/icon_logo.png"
          alt=""
          className={styles.logoMark}
          aria-hidden="true"
        />
        <span className={styles.brandName}>AI Traffic Insight</span>
      </Link>

      <nav className={styles.nav} aria-label="주 메뉴">
        {menus.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `${styles.link} ${
                isActive
                  ? isGov
                    ? styles.activeTeal
                    : styles.activeAmber
                  : ''
              }`
            }
            end={item.id === 'dashboard'}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        {user ? <p className={styles.userName}>{user.name}</p> : null}
        <button
          type="button"
          className={`${styles.logout} ${isGov ? '' : styles.logoutAmber}`}
          onClick={handleLogout}
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}