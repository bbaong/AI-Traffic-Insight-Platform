import type { InsPredictData } from './prediction';

export type TokkStatus = 'RECOMMEND' | 'CHECK' | 'EXCLUDE';

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
  prediction: InsPredictData | null;
  checklist: ChecklistAnswers;
  memo: string;
  tokkResults: TokkResult[];
  savedAt: string;
}

export interface SaveConsultationResult {
  ok: true;
  id: string;
}
