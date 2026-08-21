import type { RiskGrade } from '../types/prediction';
import { RISK_LABEL_KO } from '../../../shared/constants/riskLabels';

export interface InsRiskMeta {
  label: string;
  color: string;
  /** 표시용 아이콘 문자 (색+텍스트+아이콘 병기) */
  icon: string;
}

export const RISK_META: Record<RiskGrade, InsRiskMeta> = {
  CRITICAL: { label: RISK_LABEL_KO.CRITICAL, color: 'var(--risk-critical)', icon: '⚠' },
  HIGH:     { label: RISK_LABEL_KO.HIGH,     color: 'var(--risk-high)',     icon: '▲' },
  MODERATE: { label: RISK_LABEL_KO.MODERATE, color: 'var(--risk-moderate)', icon: '△' },
  LOW:      { label: RISK_LABEL_KO.LOW,      color: 'var(--risk-low)',      icon: '●' },
};

export function toRiskGrade(value: string): RiskGrade {
  return value === 'CRITICAL' ||
    value === 'HIGH' ||
    value === 'MODERATE' ||
    value === 'LOW'
    ? value
    : 'MODERATE';
}

export function getInsRiskMeta(grade: RiskGrade): InsRiskMeta {
  return RISK_META[grade];
}

/** 0~1 → 소수 1자리 % 문자열 */
export function formatPct1(ratio: number): string {
  return (ratio * 100).toFixed(1);
}
