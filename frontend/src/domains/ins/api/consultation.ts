import type { ApiResponse } from '../types/prediction';
import type {
  ConsultationPayload,
  SaveConsultationResult,
} from '../types/consulting';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

interface SaveConsultationApiData {
  consultationId: string;
  customerId: string;
  profileId: string;
}

/**
 * 상담 대시보드 저장.
 * POST /api/consultations/save — 서버에서 AI·특약 재계산 후 DB 저장
 */
export async function saveConsultation(
  payload: ConsultationPayload,
): Promise<SaveConsultationResult> {
  if (!payload.userId) {
    throw new Error('로그인이 필요합니다.');
  }
  if (!payload.customer.name.trim() || !payload.customer.phone.trim()) {
    throw new Error('고객명·휴대폰 번호는 필수입니다.');
  }
  if (
    !payload.profile.region ||
    !payload.profile.age ||
    !payload.profile.gender ||
    !payload.profile.vehicle
  ) {
    throw new Error('프로필(지역·연령·성별·차종)은 필수입니다.');
  }

  const res = await fetch(`${API_BASE}/api/consultations/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: payload.customer,
      profile: payload.profile,
      checklist: payload.checklist,
      memo: payload.memo,
      consultationType: payload.consultationType,
      userId: payload.userId,
    }),
  });

  let json: ApiResponse<SaveConsultationApiData>;
  try {
    json = (await res.json()) as ApiResponse<SaveConsultationApiData>;
  } catch {
    throw new Error('상담 저장 응답을 해석하지 못했습니다.');
  }

  if (!res.ok || !json.success || json.data == null) {
    throw new Error(json.message ?? '상담 저장에 실패했습니다.');
  }

  return {
    ok: true,
    id: json.data.consultationId,
    customerId: json.data.customerId,
    profileId: json.data.profileId,
  };
}
