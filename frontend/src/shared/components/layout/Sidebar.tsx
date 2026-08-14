import { Link, NavLink } from 'react-router-dom';
import {
  SIDEBAR_MENUS,
  type SidebarIcon,
} from '../../constants/sidebarMenus';
import { ROUTES } from '../../constants/routes';
import { clearAuthStorage, useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types/auth';
import styles from './Sidebar.module.css';

export interface SidebarProps {
  role: UserRole;
  open?: boolean;
  onNavigate?: () => void;
}

function MenuIcon({ name }: { name: SidebarIcon }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }
  if (name === 'compare') {
    return (
      <svg {...common}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20V8" />
      </svg>
    );
  }
  if (name === 'user') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 19.5c.8-3.2 3.4-5 7-5s6.2 1.8 7 5" />
      </svg>
    );
  }
  if (name === 'file') {
    return (
      <svg {...common}>
        <path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
        <path d="M14 3.5V9h5.5" />
      </svg>
    );
  }
  if (name === 'settings') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2.2M12 18.3V20.5M4.8 7.2l1.9 1.1M17.3 15.7l1.9 1.1M4.8 16.8l1.9-1.1M17.3 8.3l1.9-1.1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="9" cy="8" r="2.8" />
      <path d="M4 18.5c.6-2.6 2.6-4 5-4s4.4 1.4 5 4" />
      <circle cx="16.5" cy="9" r="2.2" />
      <path d="M15 18.5c.4-1.8 1.8-3 3.6-3 1.2 0 2.2.5 2.9 1.3" />
    </svg>
  );
}

export function Sidebar({ role, open = false, onNavigate }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const sections = SIDEBAR_MENUS[role];
  const isGov = role === 'ROLE_A';

  function handleLogout(): void {
    clearAuthStorage();
    window.location.replace(ROUTES.LANDING);
  }

  return (
    <aside
      className={`${styles.sidebar} ${isGov ? styles.sidebarGov : styles.sidebarIns} ${open ? styles.open : ''}`}
    >
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
        {sections.map((section) => (
          <div key={section.id} className={styles.section}>
            <p className={styles.sectionTitle}>{section.title}</p>
            {section.items.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `${styles.link} ${isActive ? styles.linkActive : ''}`
                }
                end={item.id === 'dashboard'}
              >
                <span className={styles.icon}>
                  <MenuIcon name={item.icon} />
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.account}>
          {user ? <p className={styles.userName}>{user.name}</p> : null}
          <p className={styles.userRole}>{isGov ? '지자체' : '보험사'}</p>
          <button type="button" className={styles.logout} onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </div>
    </aside>
  );
}
