import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import buttonStyles from './landingButtons.module.css';
import styles from './LandingNav.module.css';

function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function LandingNav() {
  return (
    <header className={styles.nav}>
      <Link to={ROUTES.LANDING} className={styles.brand} aria-label="AI Traffic Insight 홈">
        <span className={styles.logoMark} aria-hidden="true" />
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
      </nav>
    </header>
  );
}
