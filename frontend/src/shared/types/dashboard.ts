export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface PriorityRegionRow {
  rank: number;
  regionName: string;
  score: number; // 우선점검 점수(중대율)
  accidentCount: number; // 예상 사고건수
  riskLevel: RiskLevel;
}
