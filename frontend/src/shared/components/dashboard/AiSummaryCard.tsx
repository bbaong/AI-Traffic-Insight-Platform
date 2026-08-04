import type { AiSummaryData, DashboardAccent } from '../../types/dashboard';
import { getRiskMeta } from '../../utils/riskMeta';
import { DashboardCard } from './DashboardCard';
import styles from './AiSummaryCard.module.css';

export interface AiSummaryCardProps {
  data: AiSummaryData;
  accent?: DashboardAccent;
}

export function AiSummaryCard({ data, accent = 'teal' }: AiSummaryCardProps) {
  const risk = getRiskMeta(data.riskLevel);
  const maxContribution = Math.max(
    ...data.factors.map((f) => f.contribution),
    1,
  );

  return (
    <DashboardCard title="AI 분석 요약">
      <div className={styles.scoreRow}>
        <div>
          <div className={styles.badgeRow}>
            <span
              className={styles.badge}
              style={{ background: risk.colorVar }}
              aria-label={`${risk.label} 위험도`}
            >
              <span aria-hidden="true">{risk.icon}</span>
              <span>{risk.label}</span>
            </span>
            {data.profileSummary ? (
              <span className={styles.profileSummary}>{data.profileSummary}</span>
            ) : null}
          </div>
          <p className={styles.title} style={{ marginTop: 10 }}>
            {data.title}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className={styles.scoreLabel}>{data.scoreLabel}</p>
          <p className={styles.score}>{data.score}</p>
        </div>
      </div>

      <ul className={styles.factors} aria-label="사고유형 구성">
        {data.factors.map((factor) => (
          <li key={factor.name} className={styles.factor}>
            <span className={styles.factorName}>{factor.name}</span>
            <div className={styles.track} aria-hidden="true">
              <div
                className={`${styles.fill} ${accent === 'amber' ? styles.fillAmber : ''}`}
                style={{
                  width: `${(factor.contribution / maxContribution) * 100}%`,
                }}
              />
            </div>
            <span className={styles.pct}>
              {factor.contribution}
              {data.factorUnit ?? '%'}
            </span>
          </li>
        ))}
      </ul>

      <p className={styles.recommendation}>{data.recommendation}</p>
    </DashboardCard>
  );
}
