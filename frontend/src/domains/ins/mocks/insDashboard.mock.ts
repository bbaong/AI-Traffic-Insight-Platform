import type { InsDashboardData } from '../../../shared/types/dashboard';

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
      label: '연령대',
      options: [
        { value: '20세 이하', label: '20세 이하' },
        { value: '21-30세', label: '21-30세' },
        { value: '31-40세', label: '31-40세' },
        { value: '41-50세', label: '41-50세' },
        { value: '51-60세', label: '51-60세' },
        { value: '61-64세', label: '61-64세' },
        { value: '65세 이상', label: '65세 이상' },
      ],
    },
    {
      id: 'gender',
      label: '성별',
      options: [
        { value: '남', label: '남' },
        { value: '여', label: '여' },
      ],
    },
    {
      id: 'vehicle',
      label: '차종',
      options: [
        { value: '승용', label: '승용' },
        { value: '승합', label: '승합' },
        { value: '화물', label: '화물' },
        { value: '이륜', label: '이륜' },
        { value: '원동기', label: '원동기' },
        { value: '자전거', label: '자전거' },
        { value: '개인형이동수단(PM)', label: '개인형이동수단(PM)' },
        { value: '사륜오토바이(ATV)', label: '사륜오토바이(ATV)' },
        { value: '건설기계', label: '건설기계' },
        { value: '농기계', label: '농기계' },
        { value: '특수', label: '특수' },
      ],
    },
    {
      id: 'region',
      label: '지역',
      options: [
        { value: '중구', label: '중구' },
        { value: '동구', label: '동구' },
        { value: '서구', label: '서구' },
        { value: '남구', label: '남구' },
        { value: '북구', label: '북구' },
        { value: '수성구', label: '수성구' },
        { value: '달서구', label: '달서구' },
        { value: '달성군', label: '달성군' },
        { value: '군위군', label: '군위군' },
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
