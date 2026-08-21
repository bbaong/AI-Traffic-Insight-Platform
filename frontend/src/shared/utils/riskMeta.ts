import type { RiskLevel } from '../types/dashboard';
import { RISK_LABEL_KO } from '../constants/riskLabels';

export interface RiskLevelMeta {
  label: string;
  icon: string;
  colorVar: string;
}

const RISK_META: Record<RiskLevel, RiskLevelMeta> = {
  CRITICAL: { 
    label: RISK_LABEL_KO.CRITICAL, 
    icon: '⚠', 
    colorVar: 'var(--risk-critical)' 
  },
  HIGH: { 
    label: RISK_LABEL_KO.HIGH, 
    icon: '▲', 
    colorVar: 'var(--risk-high)' 
  },
  MODERATE: { 
    label: RISK_LABEL_KO.MODERATE, 
    icon: '△',
    colorVar: 'var(--risk-moderate)' 
  },
  LOW: { 
    label: RISK_LABEL_KO.LOW, 
    icon: '●', 
    colorVar: 'var(--risk-low)' 
  },
};

export function getRiskMeta(level: RiskLevel): RiskLevelMeta {
  return RISK_META[level];
}
