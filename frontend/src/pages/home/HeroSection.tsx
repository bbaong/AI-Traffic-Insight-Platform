import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import heroBg from '../../assets/images/hero-traffic-bg.png';
import {
  fetchGovComparison,
  fetchGovPriorityTop,
} from '../../domains/gov/api/govDashboard';
import { ROUTES } from '../../shared/constants/routes';
import { useAuthStore } from '../../stores/authStore';
import buttonStyles from './landingButtons.module.css';
import styles from './HeroSection.module.css';
import {
  factorBarWidth,
  getRiskLevelMeta,
  scoreToLandingRisk,
  type LandingRiskLevel,
} from './riskDisplay';
import { useFadeInClassName } from './useFadeInClassName';

type Highlight = {
  regionName: string;
  priorityScore: number;
  riskLevel: LandingRiskLevel;
  period: string;
  topFactors: { name: string; contribution: number }[];
};

export function HeroSection() {
  const { ref, className } = useFadeInClassName();
  const user = useAuthStore((s) => s.user);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const top = await fetchGovPriorityTop(1);
        const first = top.items[0];
        if (!first) {
          if (!cancelled) setHighlight(null);
          return;
        }
        const comparison = await fetchGovComparison(first.districtId);
        const factorCandidates = [
          {
            name: '보행자 사고',
            contribution: comparison.district.pedestrianPct,
          },
          { name: '야간 사고', contribution: comparison.district.nightPct },
          { name: '중상·사망', contribution: comparison.district.seriousPct },
          { name: '신호 관련', contribution: comparison.district.signalPct },
        ]
          .sort((a, b) => b.contribution - a.contribution)
          .slice(0, 3)
          .map((f) => ({
            ...f,
            contribution: Math.round(f.contribution * 10) / 10,
          }));

        if (!cancelled) {
          setHighlight({
            regionName: first.district,
            priorityScore: first.score ?? 0,
            riskLevel: scoreToLandingRisk(first.score),
            period: top.forecastLabel ?? top.asOfLabel ?? '최신 예측',
            topFactors: factorCandidates,
          });
        }
      } catch {
        if (!cancelled) setHighlight(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const risk = getRiskLevelMeta(highlight?.riskLevel ?? 'MODERATE');

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
                서비스 시작하기
              </Link>
            )}
          </div>
        </div>

        <aside className={styles.card} aria-label="분석 결과 미리보기">
          {loading ? (
            <p className={styles.cardCaption}>우선점검 시군구 · 불러오는 중…</p>
          ) : !highlight ? (
            <p className={styles.cardCaption}>우선점검 시군구 · 예측 준비 중</p>
          ) : (
            <>
              <p className={styles.cardCaption}>
                우선점검 시군구 · {highlight.period}
              </p>

              <div className={styles.scoreRow}>
                <span
                  className={styles.badge}
                  style={{ background: risk.color }}
                >
                  <span aria-hidden="true">{risk.icon}</span>
                  <span>{risk.label}</span>
                </span>
                <span className={styles.region}>{highlight.regionName}</span>
                <span className={styles.score}>{highlight.priorityScore}</span>
              </div>

              <hr className={styles.divider} />

              <p className={styles.factorCaption}>주요 위험 요인</p>
              <ul className={styles.factorList}>
                {highlight.topFactors.map((factor) => (
                  <li key={factor.name} className={styles.factorItem}>
                    <span className={styles.factorLabel}>{factor.name}</span>
                    <div className={styles.barTrack} aria-hidden="true">
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${factorBarWidth(factor.contribution)}px`,
                        }}
                      />
                    </div>
                    <span className={styles.factorPct}>
                      {factor.contribution}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
