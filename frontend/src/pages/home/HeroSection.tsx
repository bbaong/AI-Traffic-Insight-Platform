import { Link } from 'react-router-dom';
import heroBg from '../../assets/images/hero-traffic-bg.png';
import { ROUTES } from '../../shared/constants/routes';
import { useAuthStore } from '../../stores/authStore';
import buttonStyles from './landingButtons.module.css';
import styles from './HeroSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

const HERO_STATS = [
  { value: '121,361', label: '분석에 사용된\n실제 사고 건수' },
  { value: '9년', label: '2016~2025년\n누적 데이터' },
  { value: '9개', label: '대구 전 구·군\n커버리지' },
  { value: '5분', label: '분석부터 PDF\n리포트 발송까지' },
] as const;

function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function HeroSection() {
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
      id="hero"
      ref={ref}
      className={`${styles.section} ${className}`}
      aria-labelledby="hero-heading"
    >
      <div
        className={styles.bg}
        style={{ backgroundImage: `url(${heroBg})` }}
        aria-hidden="true"
      />
      <div className={styles.bgWash} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>대구시 교통사고 빅데이터 기반</p>
          <h1 id="hero-heading" className={styles.headline}>
            같은 사고 데이터,
            <br />
            당신의 업무에 맞는 답
          </h1>
          <p className={styles.sub}>
            시군구별 사고 위험도와 그 원인을 AI가 분해해 보여줍니다.
            <br />
            점수만이 아니라, 왜 그런지까지.
          </p>
          <div className={styles.actions}>
            {user && dashboardPath ? (
              <Link
                to={dashboardPath}
                className={`${buttonStyles.button} ${buttonStyles.primary}`}
              >
                내 대시보드 보기
              </Link>
            ) : (
              <Link
                to={ROUTES.LOGIN}
                className={`${buttonStyles.button} ${buttonStyles.primary}`}
              >
                서비스 시작하기 →
              </Link>
            )}
            <button
              type="button"
              className={`${buttonStyles.button} ${buttonStyles.outline}`}
              onClick={() => scrollToId('intro')}
            >
              서비스 소개 보기
            </button>
          </div>
        </div>

        <div className={styles.stats} aria-label="핵심 지표">
          {HERO_STATS.map((stat) => (
            <div key={stat.value} className={styles.stat}>
              <p className={styles.statValue}>{stat.value}</p>
              <p className={styles.statLabel}>
                {stat.label.split('\n').map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
