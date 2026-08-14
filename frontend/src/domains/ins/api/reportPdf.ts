import type {
  ChecklistAnswers,
  TokkResult,
} from '../types/consulting';
import type { CoverageRecommendItem } from '../types/prediction';
import { fetchPdfBlob } from "../../../shared/api/http";

/** POST /api/insurance/report-pdf 요청 타입 */
export interface InsReportPdfRequest {
  구군: string;
  연령대: string;
  성별: string;
  차종: string;
  예측등급: string;
  위험도: number;
  담보추천: CoverageRecommendItem[];
  고객명?: string;
  작성자?: string;
  memo?: string;
  checklist?: ChecklistAnswers;
  tokkResults?: TokkResult[];
  analyzedAt?: string;
  consultType?: string;
  orgName?: string;
}

/** POST /api/insurance/report-pdf → PDF Blob */
export async function fetchInsReportPdf(
  body: InsReportPdfRequest,
): Promise<Blob> {
  return fetchPdfBlob('/api/insurance/report-pdf', body)
}