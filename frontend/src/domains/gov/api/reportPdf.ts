const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export interface GovReportPdfRequest {
  지역: string;
  as_of?: string | null;
  freq?: 'Q' | 'H';
  작성자?: string;
  기관?: string;
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