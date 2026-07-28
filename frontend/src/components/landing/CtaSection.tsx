import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import buttonStyles from './landingButtons.module.css';
import styles from './CtaSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

export function CtaSection() {
  const { ref, className } = useFadeInClassName();

  return (
    <section
      ref={ref}
      className={`${styles.section} ${className}`}
      aria-labelledby="cta-heading"
    >
      <div className={styles.inner}>
        <h2 id="cta-heading" className={styles.title}>
          지금 시작하세요
        </h2>
        <p className={styles.subtitle}>회원가입은 1분이면 끝납니다.</p>
        <div className={styles.actions}>
          <Link
            to={ROUTES.SIGNUP}
            className={`${buttonStyles.button} ${buttonStyles.primary}`}
          >
            회원가입
          </Link>
          <Link
            to={ROUTES.LOGIN}
            className={`${buttonStyles.button} ${buttonStyles.outlineOnDark}`}
          >
            로그인
          </Link>
        </div>
        <p className={styles.hint}>
          가입할 때 지자체 · 보험사 중 업무 유형을 선택합니다
        </p>
      </div>
    </section>
  );
}
