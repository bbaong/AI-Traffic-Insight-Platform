import { Link } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import styles from './AuthTopBar.module.css';

export interface AuthTopBarProps {
  /** 우측 단계/화면 라벨. 예: "Step 1 · 업무 유형", "로그인" */
  label: string;
}

/** 로그인·회원가입 공통 네이비 상단바 */
export function AuthTopBar({ label }: AuthTopBarProps) {
  return (
    <header className={styles.topBar}>
      <Link
        to={ROUTES.LANDING}
        className={styles.brand}
        aria-label="AI Traffic Insight 홈"
      >
        <img
          src="/icon_logo.png"
          alt=""
          className={styles.logoMark}
          aria-hidden="true"
        />
        <span className={styles.brandName}>AI Traffic Insight</span>
      </Link>
      <p className={styles.label}>{label}</p>
    </header>
  );
}
