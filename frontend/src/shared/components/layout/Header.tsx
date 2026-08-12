import { Link, useLocation } from 'react-router-dom';
import type { UserRole } from '../../types/auth';
import { DAEGU_DISTRICTS } from '../../constants/daeguBoundaries';
import { ROUTES } from '../../constants/routes';
import { useDistrictStore } from '../../stores/districtStore';
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
  const location = useLocation();
  const selectedCode = useDistrictStore((s) => s.selectedCode);
  const setSelectedCode = useDistrictStore((s) => s.setSelectedCode);
  const periodLabel = useDistrictStore((s) => s.periodLabel);
  const showGovFilters = isGov && location.pathname === ROUTES.DASHBOARD_GOV;

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
      {showGovFilters ? (
        <div className={styles.right}>
          <div className={styles.regionFilters}>
            <select
              className={styles.regionSelect}
              value="daegu"
              aria-label="시도 선택"
              disabled
            >
              <option value="daegu">대구광역시</option>
            </select>
            <select
              className={styles.regionSelect}
              value={selectedCode ?? ''}
              aria-label="구군 선택"
              onChange={(e) => setSelectedCode(e.target.value || null)}
            >
              <option value="">구·군 선택</option>
              {DAEGU_DISTRICTS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
            {/* TODO: 기간 필터 API 생기면 as_of로 재호출. 지금은 스냅샷 라벨 표시 전용. */}
            <select
              className={`${styles.regionSelect} ${styles.periodSelect}`}
              value="period"
              aria-label="기간"
              disabled
            >
              <option value="period">{periodLabel ?? '기간 정보 없음'}</option>
            </select>
          </div>
          <Link
            className={styles.downloadBtn}
            to={ROUTES.REPORTS}
            aria-label="상세 리포트로 이동"
            title="상세 리포트"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 4v10m0 0 4-4m-4 4-4-4M5 18h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      ) : null}
    </header>
  );
}