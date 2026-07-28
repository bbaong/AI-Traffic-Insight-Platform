import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import styles from './AuthTopBar.module.css';

export interface AuthTopBarProps {
  /** 우측 단계/화면 라벨. 예: "Step 1 · 업무 유형", "로그인" */
  label: string;
  /** 로고 마크 accent. 기본 teal */
  accent?: 'teal' | 'amber';
}

/** 로그인·회원가입 공통 네이비 상단바 */
export function AuthTopBar({ label, accent = 'teal' }: AuthTopBarProps) {
  return (
    <header className={styles.topBar}>
      <Link
        to={ROUTES.LANDING}
        className={styles.brand}
        aria-label="AI Traffic Insight 홈"
      >
        <span
          className={`${styles.logoMark} ${accent === 'amber' ? styles.logoAmber : ''}`}
          aria-hidden="true"
        />
        <span className={styles.brandName}>AI Traffic Insight</span>
      </Link>
      <p className={styles.label}>{label}</p>
    </header>
  );
}
