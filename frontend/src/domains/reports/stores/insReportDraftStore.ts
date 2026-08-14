import { create } from 'zustand';
import type { InsReportPdfRequest } from '../../ins/api/reportPdf';

export type InsReportPdfFields = Omit<InsReportPdfRequest, '작성자'>;

export interface InsReportDraft extends InsReportPdfFields {
  /** 어디서 draft를 넣었는지 — 뒤로가기용 */
  source?: 'dashboard' | 'customers';
}


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