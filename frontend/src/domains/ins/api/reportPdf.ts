import type {
  ChecklistAnswers,
  TokkResult,
} from '../types/consulting';
import type { CoverageRecommendItem } from '../types/prediction';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

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
  const res = await fetch(`${API_BASE}/api/insurance/report-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get('Content-Type') ?? '';
  if (!res.ok || !contentType.includes('application/pdf')) {
    let message = 'PDF 생성에 실패했습니다.';
    try {
      const json = (await res.json()) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.blob();
}