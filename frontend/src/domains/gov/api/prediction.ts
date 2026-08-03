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
  예측사고율_퍼센트?: number;
  예측중대사고율_퍼센트: number;
  중대사고등급: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | string;
  예측사고경중_퍼센트?: Record<string, number>;
  추정_다음분기사고건수?: number;
  추정_다음분기중대사고건수?: number;
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