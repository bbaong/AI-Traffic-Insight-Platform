import type { RiskLevel } from '../types/dashboard';

export interface RiskLevelMeta {
  label: string;
  icon: string;
  colorVar: string;
}

const RISK_META: Record<RiskLevel, RiskLevelMeta> = {
  CRITICAL: {
    label: 'Critical',
    icon: '⚠',
    colorVar: 'var(--risk-critical)',
  },
  HIGH: {
    label: 'High',
    icon: '▲',
    colorVar: 'var(--risk-high)',
  },
  MODERATE: {
    label: 'Moderate',
    icon: '△',
    colorVar: 'var(--risk-moderate)',
  },
  LOW: {
    label: 'Low',
    icon: '●',
    colorVar: 'var(--risk-low)',
  },
};

export function getRiskMeta(level: RiskLevel): RiskLevelMeta {
  return RISK_META[level];
}
