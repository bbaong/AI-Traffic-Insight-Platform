import type { TokkResult } from '../types/consulting';

/**
 * 맞춤 특약 검토 목업 결과.
 * TODO: 실제 API 연동 시 이 파일은 제거하거나 fixtures로만 유지
 */
export const MOCK_TOKK_RESULT: TokkResult[] = [
  {
    id: 'mileage',
    name: '마일리지 할인특약',
    desc: '연간 주행거리 구간을 기준으로 할인 적용을 권장합니다.',
    status: 'RECOMMEND',
    icon: '🚗',
  },
  {
    id: 'blackbox',
    name: '블랙박스 할인특약',
    desc: '상시·고정 장착 여부에 따라 할인 특약 가입을 권장합니다.',
    status: 'RECOMMEND',
    icon: '📹',
  },
  {
    id: 'safedrive',
    name: '안전운전점수 할인특약',
    desc: '이용 서비스·점수 확인 후 할인 특약 가입을 권장합니다.',
    status: 'RECOMMEND',
    icon: '🛡️',
  },
  {
    id: 'fcw',
    name: '전방충돌방지장치 할인특약',
    desc: '출고 시 장착 여부를 추가 확인한 뒤 적용 여부를 판단하세요.',
    status: 'CHECK',
    icon: '⚠️',
  },
  {
    id: 'ldw',
    name: '차선이탈경고장치 할인특약',
    desc: '현재 답변 기준으로는 특약 적용 대상에서 제외됩니다.',
    status: 'EXCLUDE',
    icon: '➖',
  },
];
