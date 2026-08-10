import { create } from 'zustand';
import type { InsReportPdfRequest } from '../../ins/api/reportPdf';

/** Dashboard → Reports page snapshot for consult PDF. */
export type InsReportDraft = Omit<InsReportPdfRequest, '작성자'>;

interface InsReportDraftState {
  draft: InsReportDraft | null;
  setDraft: (draft: InsReportDraft) => void;
  clearDraft: () => void;
}

export const useInsReportDraftStore = create<InsReportDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
