import {
  INS_DATA_NOTICE,
  INS_DISCLAIMER,
} from '../../constants/notice';
import styles from './InsDataNoticeFooter.module.css';

/** Tabler `info-circle` 상응 — 보험사 고지 전용 */
function InfoCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
      <path d="M12 9h.01" />
      <path d="M11 12h1v4h1" />
    </svg>
  );
}

/** 보험사 대시보드 전용 데이터 기준 고지. GOV에는 사용하지 않는다. */
export function InsDataNoticeFooter() {
  return (
    <footer className={styles.footer} role="note">
      <span className={styles.icon} aria-hidden="true">
        <InfoCircleIcon />
      </span>
      <p className={styles.text}>
        <span className={styles.notice}>{INS_DATA_NOTICE}</span>
        <span className={styles.sep}> · </span>
        <span className={styles.disclaimer}>{INS_DISCLAIMER}</span>
      </p>
    </footer>
  );
}
