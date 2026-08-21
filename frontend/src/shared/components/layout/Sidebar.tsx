import { Link, NavLink } from 'react-router-dom';
import {
  SIDEBAR_MENUS,
  type SidebarIcon,
} from '../../constants/sidebarMenus';
import { ROUTES } from '../../constants/routes';
import type { UserRole } from '../../types/auth';
import styles from './Sidebar.module.css';
import { signOut } from '../../../domains/auth/api/auth';
import { useAuthStore } from '../../stores/authStore';

/* 사이드바 프로퍼티 */
export interface SidebarProps {
  role: UserRole;
  open?: boolean;
  onNavigate?: () => void;
}

/* 메뉴 아이콘 경로 */
const MENU_ICON_PATH: Record<SidebarIcon, string> = {
  home: 'M520-600v-240h320v240H520ZM120-440v-400h320v400H120Zm400 320v-400h320v400H520Zm-400 0v-240h320v240H120Zm80-400h160v-240H200v240Zm400 320h160v-240H600v240Zm0-480h160v-80H600v80ZM200-200h160v-80H200v80Zm160-320Zm240-160Zm0 240ZM360-280Z',
  compare:
    'M80-120v-80h800v80H80Zm40-120v-280h120v280H120Zm200 0v-480h120v480H320Zm200 0v-360h120v360H520Zm200 0v-600h120v600H720Z',
  customers:
    'M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm1 240Zm-1-280Z',
  file: 'M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z',
  user: 'M367-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm296.5-343.5Q560-607 560-640t-23.5-56.5Q513-720 480-720t-56.5 23.5Q400-673 400-640t23.5 56.5Q447-560 480-560t56.5-23.5ZM480-640Zm0 400Z',
  settings:
    'm370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z',
};

function MenuIcon({ name }: { name: SidebarIcon }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden
    >
      <path d={MENU_ICON_PATH[name]} />
    </svg>
  );
}

/* 사이드바 컴포넌트 */
export function Sidebar({ role, open = false, onNavigate }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const sections = SIDEBAR_MENUS[role];
  const isGov = role === 'ROLE_A';

  async function handleLogout(): Promise<void> {
    await signOut(ROUTES.LANDING);
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
