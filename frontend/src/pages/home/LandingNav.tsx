import type { MouseEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../shared/constants/routes';
import { signOut } from '../../domains/auth/api/auth';
import { useAuthStore } from '../../shared/stores/authStore';
import buttonStyles from './landingButtons.module.css';
import styles from './LandingNav.module.css';
import { scrollToLandingTop } from './scrollToLandingSection';

export function LandingNav() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardPath =
    user?.role === 'ROLE_A'
      ? ROUTES.DASHBOARD_GOV
      : user?.role === 'ROLE_B'
        ? ROUTES.DASHBOARD_INS
        : null;

  async function handleLogout(): Promise<void> {
    await signOut(ROUTES.LANDING);
  }

  function goToHomeTop(): void {
    if (location.pathname === ROUTES.LANDING) {
      if (location.hash) {
        navigate({ pathname: ROUTES.LANDING }, { replace: true });
      }
      scrollToLandingTop();
      return;
    }
    navigate(ROUTES.LANDING);
  }

  function handleLogoClick(e: MouseEvent<HTMLAnchorElement>): void {
    if (location.pathname !== ROUTES.LANDING) return;

    e.preventDefault();

    if (location.hash) {
      navigate({ pathname: ROUTES.LANDING }, { replace: true });
    }

    scrollToLandingTop();
  }

  return (
    <header className={styles.nav} data-landing-nav>
      <div className={styles.left}>
        <Link
          to={ROUTES.LANDING}
          className={styles.brand}
          aria-label="AI Traffic Insight 홈"
          onClick={handleLogoClick}
        >
          <img
            src={`${import.meta.env.BASE_URL}icon_logo.png`}
            alt=""
            className={styles.logoMark}
            aria-hidden="true"
          />
          <span className={styles.brandName}>AI Traffic Insight</span>
        </Link>

        <nav className={styles.navLinks} aria-label="랜딩 섹션">
          <button
            type="button"
            className={styles.anchorLink}
            onClick={goToHomeTop}
          >
            서비스 소개
          </button>
          <NavLink
            to={ROUTES.LANDING_GOV}
            className={({ isActive }) =>
              `${styles.anchorLink} ${isActive ? styles.anchorLinkActive : ''}`
            }
          >
            지자체 솔루션
          </NavLink>
          <NavLink
            to={ROUTES.LANDING_INS}
            className={({ isActive }) =>
              `${styles.anchorLink} ${isActive ? styles.anchorLinkActive : ''}`
            }
          >
            보험사 솔루션
          </NavLink>
        </nav>
      </div>

      <div className={styles.actions} aria-label="계정">
        {user && dashboardPath ? (
          <>
            {user.name ? (
              <div className={styles.userChip}>
                <span
                  className={`${styles.avatar} ${
                    user.role === 'ROLE_A' ? styles.avatarTeal : styles.avatarAmber
                  }`}
                  aria-hidden="true"
                >
                  {(user.name.trim().charAt(0) || '?').toUpperCase()}
                </span>
                <span className={styles.userName}>{user.name} 님</span>
              </div>
            ) : null}
            <button
              type="button"
              className={`${buttonStyles.button} ${buttonStyles.outline}`}
              onClick={handleLogout}
            >
              로그아웃
            </button>
            <Link
              to={dashboardPath}
              className={`${buttonStyles.button} ${buttonStyles.primary}`}
            >
              대시보드
            </Link>
          </>
        ) : (
          <>
            <Link
              to={ROUTES.LOGIN}
              className={`${buttonStyles.button} ${buttonStyles.outline}`}
            >
              로그인
            </Link>
            <Link
              to={ROUTES.SIGNUP}
              className={`${buttonStyles.button} ${buttonStyles.primary}`}
            >
              회원가입
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
