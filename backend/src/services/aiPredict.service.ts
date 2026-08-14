/**
 * AI 서비스 HTTP 클라이언트 (예측 / 핫스팟 / PDF 프록시)
 */
const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

export class AiHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(message);
    this.name = 'AiHttpError';
  }
}

async function readErrorDetail(res: globalThis.Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function mapAiStatus(aiStatus: number, preferPassThrough: number[] = [400]): number {
  if (preferPassThrough.includes(aiStatus)) return aiStatus;
  if (aiStatus === 503) return 503;
  return 502;
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${AI_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new AiHttpError('AI 요청 실패', mapAiStatus(res.status), detail);
  }
  return res.json();
}

async function getJson(pathWithQuery: string): Promise<unknown> {
  const res = await fetch(`${AI_BASE}${pathWithQuery}`, { method: 'GET' });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new AiHttpError(
      'AI 요청 실패',
      mapAiStatus(res.status, [400, 503]),
      detail,
    );
  }
  return res.json();
}

/** INS 위험도 예측 응답 */
export interface InsPredictResult {
  버전?: string;
  variant?: string;
  예측등급?: string;
  위험도?: number;
  등급확률?: Record<string, number>;
  사고경중비율?: Record<string, number>;
  담보추천?: unknown[];
  [key: string]: unknown;
}

/** INS 위험도 예측 */
export async function predictRisk(input: {
  구군: string;
  연령대: string;
  성별: string;
  차종: string;
  주야?: string;
  노면상태?: string;
}): Promise<InsPredictResult> {
  return postJson('/predict', {
    구군: input.구군,
    연령대: input.연령대,
    성별: input.성별,
    차종: input.차종,
    주야: input.주야 ?? '주간',
    노면상태: input.노면상태 ?? '건조',
  }) as Promise<InsPredictResult>;
}

/** GOV 분기/반기 예측 */
export async function predictGov(input: {
  지역?: string | null;
  as_of?: string | null;
  freq?: 'Q' | 'H' | string;
}) {
  return postJson('/predict/gov', {
    지역: input.지역 ?? null,
    as_of: input.as_of ?? null,
    freq: input.freq ?? 'Q',
  });
}

/** GOV history */
export async function predictGovHistory(input: {
  지역: string;
  as_of?: string | null;
  n_history?: number;
}) {
  return postJson('/predict/gov/history', {
    지역: input.지역,
    as_of: input.as_of ?? null,
    n_history: input.n_history ?? 3,
  });
}

/** 사고다발 핫스팟 */
export async function fetchHotspots(query: {
  year?: string | number;
  refresh?: boolean | string | number;
  include_polygon?: boolean | string | number;
}) {
  const qs = new URLSearchParams();
  if (query.year != null && query.year !== '') {
    qs.set('year', String(query.year));
  }
  if (
    query.refresh === true ||
    query.refresh === '1' ||
    query.refresh === 'true'
  ) {
    qs.set('refresh', 'true');
  }
  if (
    query.include_polygon === true ||
    query.include_polygon === '1' ||
    query.include_polygon === 'true'
  ) {
    qs.set('include_polygon', 'true');
  }
  const suffix = qs.toString() ? `?${qs}` : '';
  return getJson(`/hotspots${suffix}`);
}
