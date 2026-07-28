import type { GovDashboardData } from '../../types/dashboard';

export type LandingRiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface LandingFactor {
  name: string;
  contribution: number;
}

export interface LandingHighlight {
  regionName: string;
  priorityScore: number;
  riskLevel: LandingRiskLevel;
  period: string;
  topFactors: LandingFactor[];
}

/** 랜딩 히어로 카드 · 대시보드와 동일한 우선점검 하이라이트 */
export const landingHighlight: LandingHighlight = {
  regionName: '대구광역시 수성구',
  priorityScore: 92.4,
  riskLevel: 'CRITICAL',
  period: '최근 12개월',
  topFactors: [
    { name: '야간 시인성', contribution: 34 },
    { name: '우천 노면', contribution: 27 },
    { name: '좌회전 충돌', contribution: 19 },
  ],
};

export const govDashboardMock: GovDashboardData = {
  kpis: [
    {
      id: 'accidents',
      label: '전체 사고 건수',
      value: '4,281',
      delta: { label: '전년 +332', direction: 'up' },
    },
    {
      id: 'severe',
      label: '중상·사망 사고',
      value: '312',
      delta: { label: '전년 −18', direction: 'down' },
    },
    {
      id: 'risk-regions',
      label: '위험 시군구',
      value: '7',
      delta: { label: 'High 이상', direction: 'none' },
    },
    {
      id: 'priority',
      label: '우선점검 대상',
      value: '3',
      delta: { label: '⚠ 즉시조치', direction: 'none' },
    },
  ],
  aiSummary: {
    riskLevel: 'CRITICAL',
    title: '대구광역시 수성구',
    scoreLabel: '우선점검 점수',
    score: 92.4,
    factors: [
      { name: '야간 시인성', contribution: 34 },
      { name: '우천 노면', contribution: 27 },
      { name: '좌회전 충돌', contribution: 19 },
    ],
    recommendation: 'AI 추천 · 야간 조명 개선, 좌회전 신호 검토',
  },
  priorityRegions: [
    {
      rank: 1,
      regionName: '대구광역시 수성구',
      score: 92.4,
      riskLevel: 'CRITICAL',
    },
    {
      rank: 2,
      regionName: '대구광역시 달서구',
      score: 78.1,
      riskLevel: 'HIGH',
    },
    {
      rank: 3,
      regionName: '대구광역시 북구',
      score: 64.5,
      riskLevel: 'HIGH',
    },
  ],
  accidentByHour: [
    { label: '0–4', value: 42 },
    { label: '4–8', value: 68 },
    { label: '8–12', value: 120 },
    { label: '12–16', value: 98 },
    { label: '16–20', value: 156 },
    { label: '20–24', value: 110 },
  ],
};
