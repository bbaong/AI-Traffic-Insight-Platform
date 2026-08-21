import type {
  ChecklistAnswers,
  TokkResult,
} from '../types/consulting';
import type { CoverageRecommendItem } from '../types/prediction';
import { fetchPdfBlob, apiFetch, readJson } from '../../../shared/api/http';

//PDF 생성 요청 타입 //http://localhost:5000/api/insurance/report-pdf
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

//PDF 생성 //http://localhost:5000/api/insurance/report-pdf
export async function fetchInsReportPdf(
  body: InsReportPdfRequest,
): Promise<Blob> {
  return fetchPdfBlob('/api/insurance/report-pdf', body)
}

//이메일 발송 //http://localhost:5000/api/insurance/report-pdf/email
export async function sendInsReportPdfEmail(
  body: InsReportPdfRequest & { toEmail: string },
): Promise<void> {
  const res = await apiFetch('/api/insurance/report-pdf/email', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await readJson<{ success?: boolean; message?: string }>(
    res,
    '이메일 발송에 실패했습니다.',
  );
  if (!res.ok || data.success === false) {
    throw new Error(data.message ?? '이메일 발송에 실패했습니다.');
  }
}