import { Link } from 'react-router-dom';
import heroBg from '../../assets/images/hero-traffic-bg.png';
import { ROUTES } from '../../constants/routes';
import { landingHighlight } from '../../mocks/data/govDashboard.mock';
import { factorBarWidth, getRiskLevelMeta } from './riskDisplay';
import buttonStyles from './landingButtons.module.css';
import styles from './HeroSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

export function HeroSection() {
  const { ref, className } = useFadeInClassName();
  const risk = getRiskLevelMeta(landingHighlight.riskLevel);

  return (
    <section
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
          <p className={styles.eyebrow}>교통사고 위험 분석 플랫폼</p>
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
            <Link
              to={ROUTES.SIGNUP}
              className={`${buttonStyles.button} ${buttonStyles.primary}`}
            >
              회원가입
            </Link>
            <Link
              to={ROUTES.LOGIN}
              className={`${buttonStyles.button} ${buttonStyles.outline}`}
            >
              로그인
            </Link>
          </div>
        </div>

        <aside className={styles.card} aria-label="분석 결과 미리보기">
          <p className={styles.cardCaption}>
            우선점검 시군구 · {landingHighlight.period}
          </p>

          <div className={styles.scoreRow}>
            <span className={styles.badge} style={{ background: risk.color }}>
              <span aria-hidden="true">{risk.icon}</span>
              <span>{risk.label}</span>
            </span>
            <span className={styles.region}>{landingHighlight.regionName}</span>
            <span className={styles.score}>{landingHighlight.priorityScore}</span>
          </div>

          <hr className={styles.divider} />

          <p className={styles.factorCaption}>주요 위험 요인</p>
          <ul className={styles.factorList}>
            {landingHighlight.topFactors.map((factor) => (
              <li key={factor.name} className={styles.factorItem}>
                <span className={styles.factorLabel}>{factor.name}</span>
                <div className={styles.barTrack} aria-hidden="true">
                  <div
                    className={styles.barFill}
                    style={{ width: `${factorBarWidth(factor.contribution)}px` }}
                  />
                </div>
                <span className={styles.factorPct}>{factor.contribution}%</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
