import type { LandingRiskLevel } from '../../mocks/data/govDashboard.mock';

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

export function getRiskLevelMeta(level: LandingRiskLevel): RiskLevelMeta {
  return RISK_LEVEL_META[level];
}

/** 기여도(%) → 바 너비(px). 34% ≈ 96px 기준 (노트북 스케일) */
export function factorBarWidth(contribution: number): number {
  return Math.round((contribution * 96) / 34);
}
