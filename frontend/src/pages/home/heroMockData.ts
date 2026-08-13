import type {
  GovComparisonData,
  GovSuggestionItem,
} from '../../domains/gov/api/govDashboard';
import type {
  GovHistoryPoint,
  GovHistoryResponse,
} from '../../domains/gov/api/prediction';
import type { InsPredictData } from '../../domains/ins/types/prediction';
import type { CustomerInfo, ProfileInput } from '../../domains/ins/types/consulting';
import type { PriorityRegionRow } from '../../shared/types/dashboard';

export const HERO_GOV_DISTRICT = '수성구';
export const HERO_GOV_SELECTED_CODE = 'suseong';

function historyPoint(
  quarter: string,
  kind: GovHistoryPoint['kind'],
  counts: Record<string, number>,
): GovHistoryPoint {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const severe = (counts['사망사고'] ?? 0) + (counts['중상사고'] ?? 0);
  const pct: Record<string, number> = {};
  for (const [key, value] of Object.entries(counts)) {
    pct[key] = total ? (value / total) * 100 : 0;
  }
  return {
    분기: quarter,
    사고건수: total,
    중대사고율_퍼센트: total ? (severe / total) * 100 : 0,
    경중_건수: counts,
    경중_퍼센트: pct,
    kind,
  };
}

export const HERO_GOV_COMPARISON: GovComparisonData = {
  district: {
    pedestrianPct: 22.1,
    nightPct: 42.0,
    seriousPct: 28.6,
    signalPct: 9.4,
    pedestrianCount: 407,
    nightCount: 774,
    seriousCount: 527,
    signalCount: 173,
    totalCount: 1842,
  },
  cityAvg: {
    pedestrianPct: 18.8,
    nightPct: 40.1,
    seriousPct: 26.1,
    signalPct: 10.6,
    pedestrianCount: 293,
    nightCount: 626,
    seriousCount: 407,
    signalCount: 165,
    totalCount: 1560,
  },
};

export const HERO_GOV_HISTORY: GovHistoryResponse = {
  지역: HERO_GOV_DISTRICT,
  history: [
    historyPoint('2024Q3', 'actual', {
      사망사고: 3,
      중상사고: 48,
      경상사고: 112,
      부상신고사고: 41,
    }),
    historyPoint('2024Q4', 'actual', {
      사망사고: 2,
      중상사고: 44,
      경상사고: 108,
      부상신고사고: 39,
    }),
    historyPoint('2025Q1', 'actual', {
      사망사고: 2,
      중상사고: 41,
      경상사고: 104,
      부상신고사고: 37,
    }),
    historyPoint('2025Q2', 'actual', {
      사망사고: 2,
      중상사고: 38,
      경상사고: 99,
      부상신고사고: 35,
    }),
  ],
  forecast: historyPoint('2025Q3', 'forecast', {
    사망사고: 2,
    중상사고: 35,
    경상사고: 94,
    부상신고사고: 33,
  }),
};

export const HERO_GOV_SUGGESTIONS: GovSuggestionItem[] = [
  {
    key: 'night-light',
    icon: 'bulb',
    title: '야간 보행 구간 조명 강화',
    desc: '야간 사고 비율이 시 평균보다 높습니다. 보행 밀집 구간의 야간 조명을 우선 점검하세요.',
  },
  {
    key: 'pedestrian',
    icon: 'pedestrian',
    title: '보행자 사고 다발 지점 정비',
    desc: '보행자 사고 비중이 시 평균을 웃돕니다. 횡단보도·과속 단속 지점을 점검하세요.',
  },
];

export const HERO_GOV_TOP3: PriorityRegionRow[] = [
  {
    rank: 1,
    regionName: '수성구',
    score: 31.2,
    accidentCount: 142,
    riskLevel: 'CRITICAL',
  },
  {
    rank: 2,
    regionName: '남구',
    score: 28.6,
    accidentCount: 98,
    riskLevel: 'HIGH',
  },
  {
    rank: 3,
    regionName: '달성군',
    score: 27.4,
    accidentCount: 110,
    riskLevel: 'HIGH',
  },
];

export const HERO_INS_CUSTOMER: CustomerInfo = {
  name: '홍길동',
  phone: '010-1234-5678',
};

export const HERO_INS_PROFILE: ProfileInput = {
  gender: '남',
  age: '51-60세',
  vehicle: '승용',
  region: '수성구',
};

export const HERO_INS_PREDICTION: InsPredictData = {
  버전: 'v1',
  variant: 'ins',
  예측등급: 'MODERATE',
  위험도: 40.1,
  등급확률: {
    안전운전불이행: 0.509,
    안전거리미확보: 0.148,
    기타: 0.099,
  },
  담보추천: [
    {
      id: 'liability-1',
      name: '대인배상Ⅰ',
      recommended: true,
      script: '',
      reason: '',
    },
    {
      id: 'liability-2',
      name: '대인배상Ⅱ',
      recommended: true,
      script: '',
      reason: '',
    },
    {
      id: 'own-vehicle',
      name: '자기차량손해',
      recommended: true,
      script: '',
      reason: '',
    },
    {
      id: 'property',
      name: '대물배상',
      recommended: false,
      script: '',
      reason: '',
    },
    {
      id: 'own-injury',
      name: '자기신체사고',
      recommended: false,
      script: '',
      reason: '',
    },
    {
      id: 'uninsured',
      name: '무보험차상해',
      recommended: false,
      script: '',
      reason: '',
    },
  ],
};
