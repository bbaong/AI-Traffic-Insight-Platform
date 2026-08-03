import type { UserRole } from './auth';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface KpiDelta {
  label: string;
  direction: 'up' | 'down' | 'none';
}

export interface KpiData {
  id: string;
  label: string;
  value: string;
  delta?: KpiDelta;
}

export interface RiskFactorBar {
  name: string;
  contribution: number;
}

export interface AiSummaryData {
  riskLevel: RiskLevel;
  title: string;
  scoreLabel: string;
  score: number | string;
  factors: RiskFactorBar[];
  recommendation: string;
  /** 배지 옆 고객 프로필 한 줄 요약 (예: 달서구 · 51-60세 · 남 · 승용 · 주간) */
  profileSummary?: string;
  /** factor 숫자 단위. 기본 '%' (INS), GOV는 '건' */
  factorUnit?: string;
}

export interface PriorityRegionRow {
  rank: number;
  regionName: string;
  score: number;
  riskLevel: RiskLevel;
}

export interface ChartBarItem {
  label: string;
  value: number;
}

export interface ProfileSelectOption {
  value: string;
  label: string;
}

export interface ProfileField {
  id: string;
  label: string;
  options: ProfileSelectOption[];
}

export interface GovDashboardData {
  kpis: KpiData[];
  aiSummary: AiSummaryData;
  priorityRegions: PriorityRegionRow[];
  accidentByHour: ChartBarItem[];
}

export interface InsDashboardData {
  kpis: KpiData[];
  aiSummary: AiSummaryData;
  profileFields: ProfileField[];
  cohortByAge: ChartBarItem[];
}

export type DashboardAccent = 'teal' | 'amber';

export function accentForRole(role: UserRole): DashboardAccent {
  return role === 'ROLE_A' ? 'teal' : 'amber';
}
