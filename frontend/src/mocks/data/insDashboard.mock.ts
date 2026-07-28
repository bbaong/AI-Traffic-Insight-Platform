import type { InsDashboardData } from '../../types/dashboard';

export const insDashboardMock: InsDashboardData = {
  kpis: [
    {
      id: 'avg-score',
      label: '평균 위험 점수',
      value: '74',
      delta: { label: '▲ High', direction: 'up' },
    },
    {
      id: 'high-risk',
      label: '고위험 고객',
      value: '128',
      delta: { label: '전체 22%', direction: 'none' },
    },
    {
      id: 'injury-prob',
      label: '예상 중상 확률',
      value: '18.6%',
      delta: { label: '유사 고객 대비', direction: 'none' },
    },
    {
      id: 'region',
      label: '지역 위험도',
      value: '수성구',
      delta: { label: '▲ High', direction: 'up' },
    },
  ],
  aiSummary: {
    riskLevel: 'HIGH',
    title: '상담 고객 위험 요약',
    scoreLabel: '위험 점수',
    score: 74,
    factors: [
      { name: '야간 주행', contribution: 36 },
      { name: '우천 노면', contribution: 28 },
      { name: '지역 위험', contribution: 22 },
    ],
    recommendation: '상담 참고 · 야간 주행 비중 높아 담보 상향 검토 권고',
  },
  profileFields: [
    {
      id: 'age',
      label: '연령',
      options: [
        { value: '20s', label: '20대' },
        { value: '30s', label: '30대' },
        { value: '40s', label: '40대' },
        { value: '50s', label: '50대 이상' },
      ],
    },
    {
      id: 'gender',
      label: '성별',
      options: [
        { value: 'M', label: '남' },
        { value: 'F', label: '여' },
      ],
    },
    {
      id: 'vehicle',
      label: '차종',
      options: [
        { value: 'sedan', label: '승용' },
        { value: 'suv', label: 'SUV' },
        { value: 'van', label: '승합' },
      ],
    },
    {
      id: 'region',
      label: '지역',
      options: [
        { value: 'suseong', label: '대구 수성구' },
        { value: 'dalseo', label: '대구 달서구' },
        { value: 'buk', label: '대구 북구' },
      ],
    },
    {
      id: 'time',
      label: '주행시간',
      options: [
        { value: 'day', label: '주간' },
        { value: 'night', label: '야간' },
        { value: 'mixed', label: '혼합' },
      ],
    },
    {
      id: 'surface',
      label: '노면',
      options: [
        { value: 'dry', label: '건조' },
        { value: 'wet', label: '우천' },
        { value: 'snow', label: '적설' },
      ],
    },
  ],
  cohortByAge: [
    { label: '20대', value: 58 },
    { label: '30대', value: 66 },
    { label: '40대', value: 74 },
    { label: '50대+', value: 81 },
  ],
};
