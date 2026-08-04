import type { InsPredictData } from './prediction';

export type TokkStatus = 'RECOMMEND' | 'CHECK' | 'EXCLUDE' | 'EXISTING';

export interface TokkResult {
  id: string;
  name: string;
  desc: string;
  status: TokkStatus;
  icon: string;
}

/** 체크리스트 답변 — 문항 id → 선택값 + 안전운전 하위 필드 */
export interface ChecklistAnswers {
  mileage: string;
  blackbox: string;
  safedrive: string;
  /** safedrive === '이용 중' 일 때 */
  safedriveService: string;
  safedriveScore: string;
  fcw: string;
  ldw: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
}

export interface ProfileInput {
  gender: string;
  age: string;
  vehicle: string;
  region: string;
}

export interface ConsultationPayload {
  customer: CustomerInfo;
  profile: ProfileInput;
  checklist: ChecklistAnswers;
  memo: string;
  /** 상담원 user_id — 백엔드 필수 */
  userId: number;
  /** 화면 스냅샷용. 서버는 AI·특약을 재계산하므로 저장 API에는 보내지 않음 */
  prediction?: InsPredictData | null;
  tokkResults?: TokkResult[];
}

export interface SaveConsultationResult {
  ok: true;
  id: string;
  customerId?: string;
  profileId?: string;
}
