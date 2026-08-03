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
  추정_다음분기사고건수?: number;
  추정_다음분기중대사고건수?: number;
  추정_점유율기반사고건수?: number;   // 선택
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