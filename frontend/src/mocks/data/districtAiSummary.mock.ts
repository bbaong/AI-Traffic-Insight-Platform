import type { AiSummaryData } from '../../types/dashboard';
import { DISTRICT_RISK_MOCK } from '../../components/dashboard/MapCard';

const BASE_FACTORS = [
  { name: '야간 시인성', contribution: 34 },
  { name: '우천 노면', contribution: 27 },
  { name: '좌회전 충돌', contribution: 19 },
] as const;

/** code → GOV AI 요약 */
export const govAiSummaryByDistrict: Record<string, AiSummaryData> = {
  jung: {
    riskLevel: DISTRICT_RISK_MOCK.jung,
    title: '대구광역시 중구',
    scoreLabel: '우선점검 점수',
    score: 41.2,
    factors: [
      { name: '보행 밀집', contribution: 38 },
      { name: '교차로 복잡도', contribution: 29 },
      { name: '야간 시인성', contribution: 18 },
    ],
    recommendation: 'AI 추천 · 중앙로 보행 안전 시설 점검',
  },
  dong: {
    riskLevel: DISTRICT_RISK_MOCK.dong,
    title: '대구광역시 동구',
    scoreLabel: '우선점검 점수',
    score: 58.6,
    factors: [
      { name: '고속도로 진출입', contribution: 32 },
      { name: '우천 노면', contribution: 28 },
      { name: '야간 시인성', contribution: 22 },
    ],
    recommendation: 'AI 추천 · 공항·고속도로 연결구간 속도관리',
  },
  seo: {
    riskLevel: DISTRICT_RISK_MOCK.seo,
    title: '대구광역시 서구',
    scoreLabel: '우선점검 점수',
    score: 44.0,
    factors: [...BASE_FACTORS],
    recommendation: 'AI 추천 · 산업단지 출퇴근 혼잡 구간 점검',
  },
  nam: {
    riskLevel: DISTRICT_RISK_MOCK.nam,
    title: '대구광역시 남구',
    scoreLabel: '우선점검 점수',
    score: 55.3,
    factors: [...BASE_FACTORS],
    recommendation: 'AI 추천 · 앞산 접근로 야간 조명 보강',
  },
  buk: {
    riskLevel: DISTRICT_RISK_MOCK.buk,
    title: '대구광역시 북구',
    scoreLabel: '우선점검 점수',
    score: 64.5,
    factors: [
      { name: '출퇴근 혼잡', contribution: 35 },
      { name: '야간 시인성', contribution: 26 },
      { name: '좌회전 충돌', contribution: 21 },
    ],
    recommendation: 'AI 추천 · 칠곡 방향 출퇴근 교차로 신호 재검토',
  },
  suseong: {
    riskLevel: DISTRICT_RISK_MOCK.suseong,
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
  dalseo: {
    riskLevel: DISTRICT_RISK_MOCK.dalseo,
    title: '대구광역시 달서구',
    scoreLabel: '우선점검 점수',
    score: 78.1,
    factors: [
      { name: '성서 공단 출퇴근', contribution: 33 },
      { name: '우천 노면', contribution: 25 },
      { name: '교차로 충돌', contribution: 22 },
    ],
    recommendation: 'AI 추천 · 성서IC 인근 우선 순찰·시설 점검',
  },
  dalseong: {
    riskLevel: DISTRICT_RISK_MOCK.dalseong,
    title: '대구광역시 달성군',
    scoreLabel: '우선점검 점수',
    score: 52.8,
    factors: [...BASE_FACTORS],
    recommendation: 'AI 추천 · 읍면 간선 야간 조명·과속 단속',
  },
  gunwi: {
    riskLevel: DISTRICT_RISK_MOCK.gunwi,
    title: '대구광역시 군위군',
    scoreLabel: '우선점검 점수',
    score: 38.1,
    factors: [
      { name: '지방도 선형', contribution: 36 },
      { name: '야간 시인성', contribution: 30 },
      { name: '과속', contribution: 20 },
    ],
    recommendation: 'AI 추천 · 지방도 선형·시인성 개선 우선',
  },
};

export const govAiSummaryDefault: AiSummaryData = {
  riskLevel: 'MODERATE',
  title: '대구광역시 (구·군 선택)',
  scoreLabel: '우선점검 점수',
  score: '—',
  factors: [
    { name: '지역을 선택하면', contribution: 34 },
    { name: '요인별 기여도가', contribution: 27 },
    { name: '여기에 표시됩니다', contribution: 19 },
  ],
  recommendation: '지도에서 구·군을 클릭하면 AI 분석 요약이 갱신됩니다.',
};

export function getGovAiSummary(code: string | null): AiSummaryData {
  if (!code) return govAiSummaryDefault;
  return govAiSummaryByDistrict[code] ?? govAiSummaryDefault;
}