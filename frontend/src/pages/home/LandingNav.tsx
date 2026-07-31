import { Link } from 'react-router-dom';
import { ROUTES } from '../../shared/constants/routes';
import { clearAuthStorage, useAuthStore } from '../../stores/authStore';
import buttonStyles from './landingButtons.module.css';
import styles from './LandingNav.module.css';

function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function LandingNav() {
  const user = useAuthStore((s) => s.user);

  const dashboardPath =
    user?.role === 'ROLE_A'
      ? ROUTES.DASHBOARD_GOV
      : user?.role === 'ROLE_B'
        ? ROUTES.DASHBOARD_INS
        : null;

  function handleLogout(): void {
    clearAuthStorage();
    window.location.replace(ROUTES.LANDING);
  }

  return (
    <header className={styles.nav}>
      <Link to={ROUTES.LANDING} className={styles.brand} aria-label="AI Traffic Insight 홈">
        <img
          src="/icon_logo.png"
          alt=""
          className={styles.logoMark}
          aria-hidden="true"
        />
        <span className={styles.brandName}>AI Traffic Insight</span>
      </Link>

      <nav className={styles.actions} aria-label="랜딩 내비게이션">
        <button
          type="button"
          className={styles.anchorLink}
          onClick={() => scrollToId('intro')}
        >
          서비스 소개
        </button>
        <button
          type="button"
          className={styles.anchorLink}
          onClick={() => scrollToId('data')}
        >
          데이터 기준
        </button>

        {user && dashboardPath ? (
          <>
            {user.name ? (
              <span className={styles.userName}>{user.name}</span>
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
      </nav>
    </header>
  );
}