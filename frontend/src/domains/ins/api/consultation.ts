import type {
  ConsultationPayload,
  SaveConsultationResult,
} from '../types/consulting';
import { sleep } from '../utils/sleep';

/**
 * 상담 대시보드 저장.
 * TODO: POST /api/consultation (DB 저장)
 */
export async function saveConsultation(
  payload: ConsultationPayload,
): Promise<SaveConsultationResult> {
  await sleep(250);
  // TODO: 실제 API로 교체 — apiClient.post('/api/consultation', payload)
  console.info('[mock] saveConsultation', payload);
  return {
    ok: true,
    id: `mock-${Date.now()}`,
  };
}
