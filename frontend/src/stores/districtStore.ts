import { create } from 'zustand';

interface DistrictState {
  selectedCode: string | null;
  setSelectedCode: (code: string | null) => void;
}

export const useDistrictStore = create<DistrictState>((set) => ({
  selectedCode: 'suseong', // 기본: 수성구
  setSelectedCode: (code) => set({ selectedCode: code }),
}));