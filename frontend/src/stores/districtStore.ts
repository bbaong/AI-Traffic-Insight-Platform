import { create } from 'zustand';

interface DistrictState {
  selectedCode: string | null;
  setSelectedCode: (code: string | null) => void;
}

export const useDistrictStore = create<DistrictState>((set) => ({
  selectedCode: null,
  setSelectedCode: (code) => set({ selectedCode: code }),
}));