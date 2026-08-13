import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroGovMock, HeroInsMock } from './HeroDashboardMocks';
import { ROUTES } from '../../shared/constants/routes';
import { useAuthStore } from '../../stores/authStore';
import buttonStyles from './landingButtons.module.css';
import styles from './HeroSection.module.css';
import { scrollToLandingSection } from './scrollToLandingSection';
import { useFadeInClassName } from './useFadeInClassName';

export function HeroSection() {
  const { ref, className } = useFadeInClassName();
  const user = useAuthStore((s) => s.user);
  const [slide, setSlide] = useState(0);
  const [cycle, setCycle] = useState(0);

  const dashboardPath =
    user?.role === 'ROLE_A'
      ? ROUTES.DASHBOARD_GOV
      : user?.role === 'ROLE_B'
        ? ROUTES.DASHBOARD_INS
        : null;

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) return;

    const id = window.setInterval(() => {
      setSlide((prev) => (prev === 0 ? 1 : 0));
    }, 5000);

    return () => window.clearInterval(id);
  }, [cycle]);

  function goToSlide(next: number): void {
    setSlide(next);
    setCycle((n) => n + 1);
  }

  return (
    <section
      id="hero"
      ref={ref}
      className={`${styles.section} ${className}`}
      aria-labelledby="hero-heading"
    >
      <div className={styles.bgPattern} aria-hidden="true">
        <div className={styles.bgGrid} />
      </div>

      <div className={styles.inner}>
        <div className={styles.header}>
          <p className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden="true" />
            AI 기반 교통사고 위험 분석 및 예측 플랫폼
          </p>
          <h1 id="hero-heading" className={styles.headline}>
            같은 사고 데이터,
            <br />
            <span>당신의 업무에 딱 맞는 답</span>을 제시합니다
          </h1>
          <p className={styles.sub}>
            지자체와 보험사 각각의 목적에 최적화된 전용 AI 대시보드를 확인하세요.
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
              onClick={() => scrollToLandingSection('intro')}
            >
              서비스 소개 보기
            </button>
          </div>
        </div>

        <div className={styles.deviceWrap}>
          <div className={styles.device}>
            <div className={styles.chassis}>
              <div className={styles.screen}>
                <span className={styles.camera} aria-hidden="true" />
                <div className={styles.display}>
                  <div
                    className={`${styles.slide} ${slide === 0 ? styles.slideActive : ''}`}
                    aria-hidden={slide !== 0}
                  >
                    <HeroGovMock />
                  </div>
                  <div
                    className={`${styles.slide} ${slide === 1 ? styles.slideActive : ''}`}
                    aria-hidden={slide !== 1}
                  >
                    <HeroInsMock />
                  </div>
                  <div
                    className={styles.pager}
                    role="tablist"
                    aria-label="대시보드 미리보기"
                  >
                    <button
                      type="button"
                      role="tab"
                      className={`${styles.pagerDot} ${slide === 0 ? styles.pagerDotActive : ''}`}
                      aria-label="지자체 대시보드"
                      aria-selected={slide === 0}
                      onClick={() => goToSlide(0)}
                    />
                    <button
                      type="button"
                      role="tab"
                      className={`${styles.pagerDot} ${slide === 1 ? styles.pagerDotActive : ''}`}
                      aria-label="보험사 대시보드"
                      aria-selected={slide === 1}
                      onClick={() => goToSlide(1)}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.chin} aria-hidden="true" />
            </div>
            <div className={styles.neck} aria-hidden="true" />
            <div className={styles.foot} aria-hidden="true" />
            <span className={styles.contactShadow} aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
