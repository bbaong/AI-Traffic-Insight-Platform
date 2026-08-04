const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export type GovFreq = 'Q' | 'H';

export interface GovPredictRequest {
  지역?: string | null;
  as_of?: string | null;
  freq?: GovFreq;
}

export interface GovPredictResult {
  모델: string;
  버전: string;
  주기: string;
  지역: string;
  기준분기?: string;
  예측분기?: string;
  기준반기?: string;
  예측반기?: string;
  예측사고건수?: number;
  예측사고율_퍼센트?: number;
  예측중대사고율_퍼센트: number;
  중대사고등급: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | string;
  예측사고경중_퍼센트?: Record<string, number>;
  /** 기준분기 실적 유형 비율 전파 (차대차/차대사람/차량단독) */
  예측사고유형_퍼센트?: Record<string, number>;
  사고유형_출처?: string;
  추정_다음분기사고건수?: number;
  추정_다음분기중대사고건수?: number;
  추정_점유율기반사고건수?: number;   // 선택
}

/** 상해정도 키 — AI SEVERITY_ORDER와 동일 */
export const GOV_SEVERITY_KEYS = [
  '사망사고',
  '중상사고',
  '경상사고',
  '부상신고사고',
] as const;

/** 사고유형 대분류 — AI TYPE_ORDER와 동일 */
export const GOV_TYPE_KEYS = ['차대차', '차대사람', '차량단독'] as const;

export type GovSeverityKey = (typeof GOV_SEVERITY_KEYS)[number];

export type GovHistoryKind = 'actual' | 'forecast';

export interface GovHistoryPoint {
  분기: string;
  사고건수: number;
  중대사고율_퍼센트: number;
  경중_건수: Record<string, number>;
  경중_퍼센트: Record<string, number>;
  kind: GovHistoryKind;
  /** forecast에만 있을 수 있음 */
  기준분기?: string | null;
}

export interface GovHistoryResponse {
  지역: string;
  history: GovHistoryPoint[];
  forecast: GovHistoryPoint;
}

export interface GovHistoryRequest {
  지역: string;
  as_of?: string | null;
  n_history?: number;
}

export async function predictGov(
  body: GovPredictRequest = {},
): Promise<GovPredictResult | GovPredictResult[]> {
  const res = await fetch(`${API_BASE}/api/prediction/predict-gov`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      지역: body.지역 ?? null,
      as_of: body.as_of ?? null,
      freq: body.freq ?? 'Q',
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? '지자체 예측 실패');
  }
  return json.data;
}

export async function predictGovHistory(
  body: GovHistoryRequest,
): Promise<GovHistoryResponse> {
  const res = await fetch(
    `${API_BASE}/api/prediction/predict-gov-history`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        지역: body.지역,
        as_of: body.as_of ?? null,
        n_history: body.n_history ?? 4,
      }),
    },
  );
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? '지자체 history 예측 실패');
  }
  return json.data as GovHistoryResponse;
}

export function getPredictedCount(row: GovPredictResult): number {
  return row.예측사고건수 ?? row.추정_다음분기사고건수 ?? 0;
}

/** 전 지역 건수 기준 분위 → 지도 색용 */
export function countToVolumeLevel(
  count: number,
  allCounts: number[],
): 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' {
  const sorted = [...allCounts].sort((a, b) => a - b);
  const q = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))] ?? 0;
  if (count >= q(0.75)) return 'CRITICAL';
  if (count >= q(0.5)) return 'HIGH';
  if (count >= q(0.25)) return 'MODERATE';
  return 'LOW';
}

/**
 * 중대율(%) 상대 분위 → 지도 색.
 * 절대 임계(22/28/35)는 구별이 잘 안 되어, 이번 예측 분포 기준으로 구간을 좁혀 칠한다.
 */
export function severeRateToMapLevel(
  ratePct: number,
  allRates: number[],
): 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' {
  const sorted = [...allRates].sort((a, b) => a - b);
  if (sorted.length === 0) return 'MODERATE';
  const q = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))] ??
    sorted[0];
  if (ratePct >= q(0.75)) return 'CRITICAL';
  if (ratePct >= q(0.5)) return 'HIGH';
  if (ratePct >= q(0.25)) return 'MODERATE';
  return 'LOW';
}

/** history 실적 + forecast 예측을 한 배열로 (차트 X축 순서) */
export function toSeveritySeries(data: GovHistoryResponse): GovHistoryPoint[] {
  return [...data.history, data.forecast];
}