import { Link } from 'react-router-dom';
import { ROUTES } from '../../shared/constants/routes';
import { useAuthStore } from '../../stores/authStore';
import buttonStyles from './landingButtons.module.css';
import styles from './SolutionHero.module.css';

type SolutionTone = 'gov' | 'ins';

interface SolutionHeroProps {
  tone: SolutionTone;
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
}

export function SolutionHero({
  tone,
  eyebrow,
  title,
  body,
  image,
  imageAlt,
}: SolutionHeroProps) {
  const user = useAuthStore((s) => s.user);

  const dashboardPath =
    user?.role === 'ROLE_A'
      ? ROUTES.DASHBOARD_GOV
      : user?.role === 'ROLE_B'
        ? ROUTES.DASHBOARD_INS
        : null;

  return (
    <section
      className={`${styles.section} ${tone === 'ins' ? styles.ins : styles.gov}`}
      aria-labelledby="solution-hero-heading"
    >
      <div className={styles.inner}>
        <div className={styles.copy}>
          <Link to={{ pathname: ROUTES.LANDING, hash: '#intro' }} className={styles.back}>
            ← 전체 서비스 보기
          </Link>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id="solution-hero-heading" className={styles.title}>
            {title}
          </h1>
          <p className={styles.body}>{body}</p>
          <div className={styles.actions}>
            {user && dashboardPath ? (
              <Link
                to={dashboardPath}
                className={`${buttonStyles.button} ${buttonStyles.primary}`}
              >
                내 대시보드 보기
              </Link>
            ) : (
              <>
                <Link
                  to={ROUTES.SIGNUP}
                  className={`${buttonStyles.button} ${buttonStyles.primary}`}
                >
                  도입 문의하기 →
                </Link>
                <Link
                  to={ROUTES.LOGIN}
                  className={`${buttonStyles.button} ${buttonStyles.outline}`}
                >
                  로그인
                </Link>
              </>
            )}
          </div>
        </div>

        <div className={styles.preview}>
          <img src={image} alt={imageAlt} className={styles.previewImage} />
        </div>
      </div>
    </section>
  );
}
