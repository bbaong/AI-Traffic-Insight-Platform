import { create } from 'zustand';
import type { InsReportPdfRequest } from '../../ins/api/reportPdf';
import type { CoverageRecommendItem } from '../../ins/types/prediction';
import type {
  ChecklistAnswers,
  TokkResult,
} from '../../ins/types/consulting';

export type InsReportPdfFields = Omit<InsReportPdfRequest, '작성자'>;

export interface InsReportDraft extends InsReportPdfFields {
  예측등급?: string;
  위험도?: number;
  담보추천?: CoverageRecommendItem[];
  checklist?: ChecklistAnswers;
  /** Step2 맞춤 특약 검토 결과 */
  tokkResults?: TokkResult[];
  /** ISO 또는 YYYY.MM.DD */
  analyzedAt?: string;
  /** 시안: 상담 유형 (기본 신규) */
  consultType?: string;
  orgName?: string;
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