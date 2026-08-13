const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

/** history + forecast 시계열 (SeverityStackedCard와 동일 순서) */
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

export interface GovReportPdfRequest {
  지역: string;
  as_of?: string | null;
  freq?: 'Q' | 'H';
  작성자?: string;
  기관?: string;
  dashboard?: GovReportPdfDashboardPayload;
}

/** POST /api/prediction/gov-report-pdf → PDF Blob */
export async function fetchGovReportPdf(
  body: GovReportPdfRequest,
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/prediction/gov-report-pdf`, {
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