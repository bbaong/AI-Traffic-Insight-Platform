// 6대 표준담보 추천 (코드 규칙)

export type CoverageReportItem = {
  coverageKey: string;
  coverageName: string;
  recommended: boolean;
  reasonText: string;
  basisText: string;
};

const SIX: Array<Pick<CoverageReportItem, 'coverageKey' | 'coverageName'>> = [
  { coverageKey: 'bodily_i', coverageName: '대인배상 I' },
  { coverageKey: 'bodily_ii', coverageName: '대인배상 II' },
  { coverageKey: 'property', coverageName: '대물배상' },
  { coverageKey: 'personal_injury', coverageName: '자기신체사고/자동차상해' },
  { coverageKey: 'own_damage', coverageName: '자기차량손해' },
  { coverageKey: 'uninsured', coverageName: '무보험차상해' },
];

function build(
  flags: boolean[],
  reasons: string[],
  bases: string[],
): CoverageReportItem[] {
  return SIX.map((item, i) => ({
    ...item,
    recommended: flags[i] ?? false,
    reasonText: reasons[i] ?? '',
    basisText: bases[i] ?? '',
  }));
}

const LOW_REPORT = build(
  [true, true, true, false, false, true],
  [
    '의무담보로 가입을 권장합니다.',
    '유사 프로필 대비 대인 리스크가 낮아 기본 한도로 충분합니다.',
    '대물 사고 비중이 낮아 표준 한도를 권장합니다.',
    '경미 사고 경향이 낮아 우선순위가 낮습니다.',
    '자차 손해 빈도가 낮아 선택 가입으로 안내합니다.',
    '무보험 상대 사고에 대비해 기본 가입을 권장합니다.',
  ],
  [
    '자동차손해배상 보장법 의무담보',
    'Low 등급 · 대인 II 표준 약관',
    '유사 프로필 대물 사고 비중',
    '경미 사고 발생 빈도',
    '자차 손해 발생률',
    '무보험차 사고 노출',
  ],
);

const MODERATE_REPORT = build(
  [true, true, true, true, false, true],
  [
    '의무담보로 가입을 권장합니다.',
    '대인 사고 경향이 중간 수준이라 한도 상향을 검토합니다.',
    '대물 사고 비중이 있어 충분한 한도를 권장합니다.',
    '상해 담보로 치료비 공백을 줄이도록 권장합니다.',
    '자차 우선순위는 낮아 선택 안내합니다.',
    '무보험 상대 사고 대비 가입을 권장합니다.',
  ],
  [
    '자동차손해배상 보장법 의무담보',
    'Moderate 등급 · 대인 사고 비중',
    '유사 프로필 대물 사고 비중',
    '치료비·위자료 노출',
    '자차 손해 발생률',
    '무보험차 사고 노출',
  ],
);

const HIGH_REPORT = build(
  [true, true, true, true, true, true],
  [
    '의무담보로 반드시 가입합니다.',
    '대인 리스크가 높아 충분한 한도를 권장합니다.',
    '대물 한도 상향을 우선 검토합니다.',
    '상해 담보로 본인 치료비를 보완합니다.',
    '자차 손해 가능성이 있어 가입을 권장합니다.',
    '무보험 상대 사고 대비를 권장합니다.',
  ],
  [
    '자동차손해배상 보장법 의무담보',
    'High 등급 · 대인 사고 경향',
    '대물 사고 비중·한도 부족 리스크',
    '중상 가능성',
    '자차 손해 발생률',
    '무보험차 사고 노출',
  ],
);

const CRITICAL_REPORT = build(
  [true, true, true, true, true, true],
  [
    '의무담보로 반드시 가입합니다.',
    '고위험 프로필로 대인 II 한도 상향을 강하게 권장합니다.',
    '대물 고액 사고에 대비한 한도를 권장합니다.',
    '중상 가능성에 대비해 상해 담보를 권장합니다.',
    '자차 손해 위험이 높아 가입을 권장합니다.',
    '무보험 상대 사고 대비를 권장합니다.',
  ],
  [
    '자동차손해배상 보장법 의무담보',
    'Critical 등급 · 대인 고위험',
    '고액 대물 사고 노출',
    '중상 사고 비중',
    '자차 전손·고액 수리 리스크',
    '무보험차 사고 노출',
  ],
);

export function recommendCoverages(input: {
  riskGrade: string | null | undefined;
}): CoverageReportItem[] {
  const g = String(input.riskGrade ?? '').trim();
  if (g === 'Low') return LOW_REPORT;
  if (g === 'Moderate') return MODERATE_REPORT;
  if (g === 'High') return HIGH_REPORT;
  if (g === 'Critical') return CRITICAL_REPORT;
  return [];
}