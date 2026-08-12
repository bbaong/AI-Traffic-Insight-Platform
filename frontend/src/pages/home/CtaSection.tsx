import { Link } from 'react-router-dom';
import { ROUTES } from '../../shared/constants/routes';
import { useAuthStore } from '../../stores/authStore';
import buttonStyles from './landingButtons.module.css';
import styles from './CtaSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function CtaSection() {
  const { ref, className } = useFadeInClassName();
  const user = useAuthStore((s) => s.user);

  const dashboardPath =
    user?.role === 'ROLE_A'
      ? ROUTES.DASHBOARD_GOV
      : user?.role === 'ROLE_B'
        ? ROUTES.DASHBOARD_INS
        : null;

  return (
    <section
      id="cta-section"
      ref={ref}
      className={`${styles.section} ${className}`}
      aria-labelledby="cta-heading"
    >
      <div className={styles.inner}>
        {user && dashboardPath ? (
          <>
            <p className={styles.eyebrow}>다시 이어가기</p>
            <h2 id="cta-heading" className={styles.title}>
              다시 분석을 이어가세요
            </h2>
            <p className={styles.subtitle}>
              {user.name}님, 대시보드에서 바로 확인할 수 있습니다.
            </p>
            <div className={styles.actions}>
              <Link
                to={dashboardPath}
                className={`${buttonStyles.button} ${buttonStyles.primary}`}
              >
                내 대시보드 보기
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className={styles.eyebrow}>지금 바로 시작하세요</p>
            <h2 id="cta-heading" className={styles.title}>
              도입이 궁금하신가요?
            </h2>
            <p className={styles.subtitle}>
              별도 설치 없이 웹 브라우저로 바로 사용 가능합니다. 도입 문의는
              무료입니다.
            </p>
            <div className={styles.actions}>
              <Link
                to={ROUTES.SIGNUP}
                className={`${buttonStyles.button} ${buttonStyles.primary}`}
              >
                도입 문의하기 →
              </Link>
              <button
                type="button"
                className={`${buttonStyles.button} ${buttonStyles.outlineOnDark}`}
                onClick={() => scrollToId('intro')}
              >
                서비스 다시 보기
              </button>
            </div>
          </>
        )}
        <p className={styles.note}>
          데이터 기준: 2016~2025년 대구시 교통사고 통계 (한국도로교통공단 TAAS)
          <br />
          본 서비스는 참고 지표이며 보험료 산출·인수 심사의 직접 근거가
          아닙니다.
        </p>
      </div>
    </section>
  );
}
