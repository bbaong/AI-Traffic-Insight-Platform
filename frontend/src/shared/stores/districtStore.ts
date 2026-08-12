import { create } from 'zustand';

interface DistrictState {
  selectedCode: string | null;
  setSelectedCode: (code: string | null) => void;
  /** 스냅샷 asOf~forecast 표시 전용. 기간 필터 API 없음 */
  periodLabel: string | null;
  setPeriodLabel: (label: string | null) => void;
}

export const useDistrictStore = create<DistrictState>((set) => ({
  selectedCode: 'suseong', // 기본: 수성구
  setSelectedCode: (code) => set({ selectedCode: code }),
  periodLabel: null,
  setPeriodLabel: (periodLabel) => set({ periodLabel }),
}));