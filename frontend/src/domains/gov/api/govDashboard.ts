import { apiUrl } from "../../../shared/api/http";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  districtId?: number;
  limit?: number;
}

export interface ComparisonMetrics {
  pedestrianPct: number;
  nightPct: number;
  seriousPct: number;
  signalPct: number;
  pedestrianCount: number;
  nightCount: number;
  seriousCount: number;
  signalCount: number;
  totalCount: number;
}

/** @deprecated Use ComparisonMetrics — 하위 호환 별칭 */
export type GovBenchmarkMetrics = ComparisonMetrics;

export interface GovComparisonData {
  district: ComparisonMetrics;
  cityAvg: ComparisonMetrics;
}

export type GovSuggestionIcon =
  | 'bulb'
  | 'traffic-light'
  | 'pedestrian'
  | 'parking';

export interface GovSuggestionItem {
  key: string;
  icon: GovSuggestionIcon | string;
  title: string;
  desc: string;
}

/** GET /api/gov/priority-top */
export interface GovPriorityTopItem {
  rank: number | null;
  districtId: number;
  district: string;
  score: number | null;
  predictedAccidentCount: number;
  trend: string | null;
}

export interface GovPriorityTopData {
  asOfLabel: string | null;
  forecastLabel: string | null;
  items: GovPriorityTopItem[];
}

/** GET /api/gov/trend/:districtId */
export interface GovTrendPoint {
  quarterLabel: string;
  total: number;
  seriousAbove: number;
}

export class GovApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'GovApiError';
    this.status = status;
  }
}

async function readJson<T>(res: Response): Promise<ApiEnvelope<T>> {
  try {
    return (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new GovApiError(res.status, '응답을 해석하지 못했습니다.');
  }
}

function throwByStatus(res: Response, json: ApiEnvelope<unknown>, fallback: string): never {
  if (res.status === 400) {
    throw new GovApiError(400, json.message ?? 'districtId 형식이 올바르지 않습니다.');
  }
  if (res.status === 404) {
    throw new GovApiError(404, json.message ?? fallback);
  }
  throw new GovApiError(res.status, json.message ?? fallback);
}

/** GET /api/gov/comparison/:districtId */
export async function fetchGovComparison(
  districtId: number,
): Promise<GovComparisonData> {
  const res = await fetch(apiUrl(`/api/gov/comparison/${districtId}`));
  const json = await readJson<GovComparisonData>(res);
  if (!res.ok || !json.success || !json.data) {
    throwByStatus(res, json, '해당 구 데이터가 없습니다');
  }
  return json.data;
}

/** GET /api/gov/suggestions/:districtId */
export async function fetchGovSuggestions(
  districtId: number,
): Promise<GovSuggestionItem[]> {
  const res = await fetch(apiUrl(`/api/gov/suggestions/${districtId}`));
  const json = await readJson<GovSuggestionItem[]>(res);
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throwByStatus(res, json, '우선점검 제안을 불러오지 못했습니다.');
  }
  return json.data;
}

/**
 * GET /api/gov/priority-top?limit=3
 * 랜딩 Hero 등에서 사용. GovDashboard TOP3는 스냅샷 클라이언트 정렬도 병행.
 */
export async function fetchGovPriorityTop(
  limit = 3,
): Promise<GovPriorityTopData> {
  const res = await fetch(apiUrl('/api/gov/priority-top', { limit }));
  const json = await readJson<GovPriorityTopData>(res);
  if (!res.ok || !json.success || !json.data) {
    if (res.status === 404) {
      throw new GovApiError(
        404,
        json.message ?? '예측 준비 중',
      );
    }
    throwByStatus(res, json, '우선점검 TOP을 불러오지 못했습니다.');
  }
  return json.data;
}

/**
 * GET /api/gov/trend/:districtId
 * 대시보드 추세 카드는 주로 POST /api/prediction/predict-gov-history 사용.
 * 단순 분기 합계가 필요할 때 이 API를 쓴다.
 */
export async function fetchGovTrend(districtId: number): Promise<GovTrendPoint[]> {
  const res = await fetch(apiUrl(`/api/gov/trend/${districtId}`));
  const json = await readJson<GovTrendPoint[]>(res);
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throwByStatus(res, json, '추세 데이터를 불러오지 못했습니다.');
  }
  return json.data;
}
