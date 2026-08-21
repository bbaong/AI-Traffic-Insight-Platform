import type {
  ApiResponse,
  InsPredictData,
  InsPredictRequest,
} from '../types/prediction';
import { apiFetch, readJson } from '../../../shared/api/http';

/** POST /api/prediction/predict-ins — json.data만 반환 */
export async function predictIns(
  req: InsPredictRequest,
): Promise<InsPredictData> {
  const res = await apiFetch('/api/prediction/predict-ins', {
    method: 'POST',
    body: JSON.stringify(req),
  });

  const json = await readJson<ApiResponse<InsPredictData>>(
    res,
    '예측 응답을 해석하지 못했습니다.',
  );
  if (!res.ok || !json.success || json.data == null) {
    throw new Error(json.message ?? '예측에 실패했습니다.');
  }
  return json.data;
}