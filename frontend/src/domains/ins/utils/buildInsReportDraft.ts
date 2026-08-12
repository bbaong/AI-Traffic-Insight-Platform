import type { InsReportDraft } from '../../reports/stores/insReportDraftStore';
import type {
  ChecklistAnswers,
  CustomerInfo,
  ProfileInput,
} from '../types/consulting';
import type { InsPredictData } from '../types/prediction';

export interface BuildInsReportDraftInput {
  customer: CustomerInfo;
  profile: ProfileInput;
  prediction: InsPredictData;
  checklist: ChecklistAnswers;
  memo: string;
  consultType: string;
  orgName?: string;
}

/** 기존「상담 참고 리포트 생성」→ confirmGoToReportPage 와 동일 필드 매핑 */
export function buildInsReportDraft(
  input: BuildInsReportDraftInput,
): InsReportDraft {
  const { customer, profile, prediction, checklist, memo, consultType, orgName } =
    input;
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const analyzedAt = `${today.getFullYear()}.${pad(today.getMonth() + 1)}.${pad(today.getDate())} ${pad(today.getHours())}:${pad(today.getMinutes())}`;

  return {
    구군: profile.region,
    연령대: profile.age,
    성별: profile.gender,
    차종: profile.vehicle,
    고객명: customer.name || undefined,
    memo: memo.trim() || undefined,
    예측등급: String(prediction.예측등급),
    위험도: Number(prediction.위험도),
    담보추천: prediction.담보추천 ?? [],
    checklist,
    analyzedAt,
    consultType,
    orgName: orgName || undefined,
  };
}
