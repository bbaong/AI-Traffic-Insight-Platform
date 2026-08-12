export type LandingRiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface RiskLevelMeta {
  label: string;
  icon: string;
  color: string;
}

const RISK_LEVEL_META: Record<LandingRiskLevel, RiskLevelMeta> = {
  CRITICAL: {
    label: 'Critical',
    icon: '⚠',
    color: 'var(--color-red)',
  },
  HIGH: {
    label: 'High',
    icon: '▲',
    color: 'var(--color-amber)',
  },
  MODERATE: {
    label: 'Moderate',
    icon: '△',
    color: 'var(--color-amber-text)',
  },
  LOW: {
    label: 'Low',
    icon: '●',
    color: 'var(--color-teal)',
  },
};

export function scoreToLandingRisk(score: number | null): LandingRiskLevel {
  if (score == null) return 'MODERATE';
  if (score >= 35) return 'CRITICAL';
  if (score >= 28) return 'HIGH';
  if (score >= 22) return 'MODERATE';
  return 'LOW';
}

export function getRiskLevelMeta(level: LandingRiskLevel): RiskLevelMeta {
  return RISK_LEVEL_META[level];
}

/** 기여도(%) → 바 너비(px). 34% ≈ 96px 기준 (노트북 스케일) */
export function factorBarWidth(contribution: number): number {
  return Math.round((contribution * 96) / 34);
}
