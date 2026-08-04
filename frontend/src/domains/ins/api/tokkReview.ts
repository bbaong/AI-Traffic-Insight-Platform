import { MOCK_TOKK_RESULT } from '../mocks/tokkReview.mock';
import type { ChecklistAnswers, TokkResult } from '../types/consulting';
import { sleep } from '../utils/sleep';

/**
 * 체크리스트 답변 → 맞춤 특약 검토 결과.
 * TODO: 체크리스트 답변 → 특약 매칭 로직은 백엔드 확정 후 연결
 * TODO: 실제 API 연동 — POST /api/tokk-review (또는 /api/consultation/tokk-review)
 */
export async function fetchTokkReview(
  _input: ChecklistAnswers,
): Promise<TokkResult[]> {
  await sleep(300);
  // TODO: 실제 API로 교체 — return (await apiClient.post(...)).data
  return MOCK_TOKK_RESULT.map((row) => ({ ...row }));
}
