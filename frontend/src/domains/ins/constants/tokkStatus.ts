import type { TokkStatus } from '../types/consulting';

export const TOKK_STATUS_META: Record<
  TokkStatus,
  { label: string; color: string; bg: string }
> = {
  RECOMMEND: {
    label: '권장',
    color: '#2e7d32',
    bg: 'color-mix(in srgb, #2e7d32 12%, transparent)',
  },
  CHECK: {
    label: '확인',
    color: '#f77c34',
    bg: 'color-mix(in srgb, #f77c34 12%, transparent)',
  },
  EXCLUDE: {
    label: '제외',
    color: '#7a8899',
    bg: 'color-mix(in srgb, #7a8899 12%, transparent)',
  },
};
