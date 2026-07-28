import styles from './LandingFooter.module.css';

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.notice}>
          공개 통계 기반 참고 지표이며, 행정 처분 · 보험료 산출 · 인수 심사의
          직접 근거가 아닙니다
          <br />
          출처 도로교통공단 TAAS · 공공데이터포털
        </p>
        <p className={styles.copy}>© 2026 AI Traffic Insight</p>
      </div>
    </footer>
  );
}
