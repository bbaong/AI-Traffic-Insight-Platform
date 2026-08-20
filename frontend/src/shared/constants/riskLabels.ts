export type RiskGradeCode = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export const RISK_LABEL_KO: Record<RiskGradeCode, string> = {
  CRITICAL: '매우높음',
  HIGH: '높음',
  MODERATE: '보통',
  LOW: '낮음',
};

/** DB/고객 등급(Title Case) → 공통 코드 */
export function toRiskGradeCode(value: string | null | undefined): RiskGradeCode | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  if (upper === 'LOW') return 'LOW';
  if (upper === 'MODERATE' || upper === 'MEDIUM') return 'MODERATE';
  if (upper === 'HIGH') return 'HIGH';
  if (upper === 'CRITICAL') return 'CRITICAL';
  return null;
}

export function getRiskLabelKo(value: string | null | undefined): string {
  const code = toRiskGradeCode(value);
  return code ? RISK_LABEL_KO[code] : '-';
}