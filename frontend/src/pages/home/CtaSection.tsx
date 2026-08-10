import { Link } from 'react-router-dom';
import { ROUTES } from '../../shared/constants/routes';
import { useAuthStore } from '../../stores/authStore';
import buttonStyles from './landingButtons.module.css';
import styles from './CtaSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

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
      ref={ref}
      className={`${styles.section} ${className}`}
      aria-labelledby="cta-heading"
    >
      <div className={styles.inner}>
        {user && dashboardPath ? (
          <>
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
            <p className={styles.hint}>
              {user.role === 'ROLE_A'
                ? '지자체 대시보드에서 시군구 위험도를 확인하세요'
                : '보험 상담 대시보드에서 고객 상담을 이어가세요'}
            </p>
          </>
        ) : (
          <>
            <h2 id="cta-heading" className={styles.title}>
              지금 시작하세요
            </h2>
            <p className={styles.subtitle}>회원가입은 1분이면 끝납니다.</p>
            <div className={styles.actions}>
              <Link
                to={ROUTES.LOGIN}
                className={`${buttonStyles.button} ${buttonStyles.outlineOnDark}`}
              >
                로그인
              </Link>
              <Link
                to={ROUTES.SIGNUP}
                className={`${buttonStyles.button} ${buttonStyles.primary}`}
              >
                회원가입
              </Link>
            </div>
            <p className={styles.hint}>
              가입할 때 지자체 · 보험사 중 업무 유형을 선택합니다
            </p>
          </>
        )}
      </div>
    </section>
  );
}
