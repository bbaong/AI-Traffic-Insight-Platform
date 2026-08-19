import { fetchPdfBlob, apiFetch, readJson } from '../../../shared/api/http';

//행정 참고 보고서 시계열 타입 //http://localhost:5000/api/prediction/gov-report-pdf
export type GovPdfSeveritySeriesPoint = {
  label: string; // 예: "24년 3분기" 또는 원본 "2024Q3"
  kind: 'actual' | 'forecast';
  counts: {
    사망사고: number;
    중상사고: number;
    경상사고: number;
    부상신고사고: number;
  };
};

//행정 참고 보고서 대시보드 페이로드 타입 //http://localhost:5000/api/prediction/gov-report-pdf
export interface GovReportPdfDashboardPayload {
  period_label: string;
  top3: Array<{
    rank: number;
    region: string;
    severe_rate: number;
    count: number;
    grade: string;
  }>;
  selected: {
    grade: string;
    severe_rate: number;
    count: number;
    types: Array<[string, number]>;
  };
  comparison?: {
    district: {
      pedestrianPct: number;
      nightPct: number;
      seriousPct: number;
      signalPct: number;
      // count는 있으면 막대 옆 표시에 유리 (스냅샷에 이미 올 수 있음)
      pedestrianCount?: number;
      nightCount?: number;
      seriousCount?: number;
      signalCount?: number;
    };
    cityAvg: {
      pedestrianPct: number;
      nightPct: number;
      seriousPct: number;
      signalPct: number;
      pedestrianCount?: number;
      nightCount?: number;
      seriousCount?: number;
      signalCount?: number;
    };
  };
  suggestions?: Array<{ title: string; desc: string }>;
  severityLatest?: Array<{ label: string; value: number }>;
  /** 신규: 경중 추이 차트용 */
  severitySeries?: GovPdfSeveritySeriesPoint[];
  /** PDF 2페이지 선택 지역 요약·유형·권고 포함 여부 */
  includeSummary?: boolean;
}

//행정 참고 보고서 요청 타입 //http://localhost:5000/api/prediction/gov-report-pdf
export interface GovReportPdfRequest {
  지역: string;
  as_of?: string | null;
  freq?: 'Q' | 'H';
  작성자?: string;
  기관?: string;
  dashboard?: GovReportPdfDashboardPayload;
}

//PDF 생성 //http://localhost:5000/api/prediction/gov-report-pdf
export async function fetchGovReportPdf(
  body: GovReportPdfRequest,
): Promise<Blob> {
  return fetchPdfBlob('/api/prediction/gov-report-pdf', body);
}

//이메일 발송 //http://localhost:5000/api/prediction/gov-report-pdf/email
export async function sendGovReportPdfEmail(
  body: GovReportPdfRequest & { toEmail: string },
): Promise<void> {
  const res = await apiFetch('/api/prediction/gov-report-pdf/email', {
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