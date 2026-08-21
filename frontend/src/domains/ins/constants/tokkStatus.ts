import type { TokkStatus } from '../types/consulting';

/** 목록 정렬: 권장 → 확인 → 기존가입 → 제외 */
export const TOKK_STATUS_ORDER: Record<TokkStatus, number> = {
  RECOMMEND: 0,
  CHECK: 1,
  EXISTING: 2,
  EXCLUDE: 3,
};

/** 화면 범례 — 기존가입은 체크리스트에서 안 물어 노출하지 않음 */
export const TOKK_LEGEND_STATUSES: TokkStatus[] = [
  'RECOMMEND',
  'CHECK',
  'EXCLUDE',
];

export const TOKK_STATUS_META: Record<
  TokkStatus,
  { label: string; color: string; bg: string }
> = {
  RECOMMEND: {
    label: '권장',
    color: '#0a8f3c',
    bg: '#c8f5d4',
  },
  CHECK: {
    label: '추천',
    color: '#d35400',
    bg: '#ffe0c2',
  },
  EXCLUDE: {
    label: '제외',
    color: '#5a6675',
    bg: '#e8ecf0',
  },
  EXISTING: {
    label: '기존가입',
    color: '#0d5ecf',
    bg: '#cfe0ff',
  },
};
