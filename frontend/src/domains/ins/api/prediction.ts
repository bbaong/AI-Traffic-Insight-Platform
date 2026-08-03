const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export interface PredictRequest {
    구군: string;
    연령대: string;
    성별: string;
    차종: string;
    주야?: string;
    노면상태?: string;
  }
  
  export interface PredictResult {
    버전: string;
    variant: string;
    예측등급: string; // CRITICAL | HIGH | ...
    위험도: number;
    등급확률: Record<string, number>; // 법규위반 Top3
  }

export async function predictRisk(
  body: PredictRequest,
): Promise<PredictResult> {
  const res = await fetch(`${API_BASE}/api/prediction/predict-ins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? '예측 실패');
  }
  return json.data as PredictResult;
}

