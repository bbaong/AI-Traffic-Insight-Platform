import { Link } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import styles from './AuthTopBar.module.css';

export interface AuthTopBarProps {
  /** 우측 단계/화면 라벨. 예: "Step 1 · 업무 유형". 없으면 우측 비움 */
  label?: string;
}

/** 로그인·회원가입 공통 상단바 (랜딩·대시보드와 동일 톤) */
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
      {label ? <p className={styles.label}>{label}</p> : null}
    </header>
  );
}
