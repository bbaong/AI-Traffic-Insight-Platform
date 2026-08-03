import type {
  ApiResponse,
  InsPredictData,
  InsPredictRequest,
} from '../types/prediction';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

/** POST /api/prediction/predict-ins — json.data만 반환 */
export async function predictIns(
  req: InsPredictRequest,
): Promise<InsPredictData> {
  const res = await fetch(`${API_BASE}/api/prediction/predict-ins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  let json: ApiResponse<InsPredictData>;
  try {
    json = (await res.json()) as ApiResponse<InsPredictData>;
  } catch {
    throw new Error('예측 응답을 해석하지 못했습니다.');
  }

  if (!res.ok || !json.success || json.data == null) {
    throw new Error(json.message ?? '예측에 실패했습니다.');
  }

  return json.data;
}
