export interface ChecklistItem {
  id: string;
  question: string;
  hint: string;
  type: 'select' | 'toggle-detail';
  options?: string[];
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'mileage',
    question: '연간 예상 주행거리는 어느 정도인가요?',
    hint: '마일리지 할인특약 검토에 사용됩니다.',
    type: 'select',
    options: [
      '5,000km 이하',
      '5,000 ~ 10,000km',
      '10,000 ~ 15,000km',
      '15,000km 이상',
    ],
  },
  {
    id: 'blackbox',
    question: '블랙박스가 차량에 상시·고정 장착되어 있나요?',
    hint: '블랙박스 할인특약 검토에 사용됩니다.',
    type: 'select',
    options: ['미장착', '일반형 고정 장착', '상시녹화형 장착'],
  },
  {
    id: 'safedrive',
    question: '안전운전점수 서비스를 이용하고 있나요?',
    hint: '안전운전점수 할인특약 검토에 사용됩니다.',
    type: 'toggle-detail',
    options: ['이용 중', '미이용'],
  },
  {
    id: 'fcw',
    question: '전방충돌방지장치가 출고 시 장착되어 있나요?',
    hint: '전방충돌방지장치 할인특약 검토에 사용됩니다.',
    type: 'select',
    options: ['출고 시 장착', '미장착', '확인 필요'],
  },
  {
    id: 'ldw',
    question: '차선이탈경고장치가 출고 시 장착되어 있나요?',
    hint: '차선이탈경고장치 할인특약 검토에 사용됩니다.',
    type: 'select',
    options: ['출고 시 장착', '미장착', '확인 필요'],
  },
];
