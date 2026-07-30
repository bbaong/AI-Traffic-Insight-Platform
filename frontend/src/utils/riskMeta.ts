import type { RiskLevel } from '../types/dashboard';

export interface RiskLevelMeta {
  label: string;
  icon: string;
  colorVar: string;
}

const RISK_META: Record<RiskLevel, RiskLevelMeta> = {
  CRITICAL: {
    label: '매우높음',
    icon: '⚠',
    colorVar: 'var(--risk-critical)',
  },
  HIGH: {
    label: '높음',
    icon: '▲',
    colorVar: 'var(--risk-high)',
  },
  MODERATE: {
    label: '보통',
    icon: '△',
    colorVar: 'var(--risk-moderate)',
  },
  LOW: {
    label: '낮음',
    icon: '●',
    colorVar: 'var(--risk-low)',
  },
};

export function getRiskMeta(level: RiskLevel): RiskLevelMeta {
  return RISK_META[level];
}
