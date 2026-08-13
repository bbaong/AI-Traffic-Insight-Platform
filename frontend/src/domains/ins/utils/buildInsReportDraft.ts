import type { InsReportDraft } from '../../reports/stores/insReportDraftStore';
import type {
  ChecklistAnswers,
  CustomerInfo,
  ProfileInput,
  TokkResult,
  TokkStatus,
} from '../types/consulting';
import type { InsPredictData } from '../types/prediction';
import type { Consultation, ReportItem, RiderBadge } from '../types/customers';
import {
  consultationTypeLabel,
  formatConsultDateTime,
  genderLabel,
  RIDER_KEY_LABEL,
  toRiderBadge,
} from '../constants/insEnums';
import { resolveChecklistAnswers } from './checklistAnswers';

export interface BuildInsReportDraftInput {
  customer: CustomerInfo;
  profile: ProfileInput;
  prediction: InsPredictData;
  checklist: ChecklistAnswers;
  memo: string;
  consultType: string;
  orgName?: string;
  tokkResults?: TokkResult[];
}

/** 기존「상담 참고 리포트 생성」→ confirmGoToReportPage 와 동일 필드 매핑 */
export function buildInsReportDraft(
  input: BuildInsReportDraftInput,
): InsReportDraft {
  const {
    customer,
    profile,
    prediction,
    checklist,
    memo,
    consultType,
    orgName,
    tokkResults,
  } = input;
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
    checklist: { ...checklist },
    tokkResults: tokkResults ?? [],
    analyzedAt,
    consultType,
    orgName: orgName || undefined,
    source: 'dashboard',
  };
}

function riderBadgeToTokkStatus(badge: RiderBadge | null): TokkStatus {
  switch (badge) {
    case 'REVIEW_RECOMMENDED':
      return 'RECOMMEND';
    case 'FURTHER_CHECK_REQUIRED':
      return 'CHECK';
    case 'EXISTING_MEMBER_VERIFIED':
      return 'EXISTING';
    case 'CURRENTLY_EXCLUDED':
    default:
      return 'EXCLUDE';
  }
}

function riderKeyToIcon(key: string): string {
  if (key.includes('mileage')) return '🚗';
  if (key.includes('blackbox')) return '📹';
  if (key.includes('safe')) return '🛡️';
  if (key.includes('fcw')) return '⚠️';
  if (key.includes('ldw')) return '➖';
  return '📋';
}

export function consultationToInsReportDraft(input: {
  consult: Consultation;
  customerName: string;
  reportItems: ReportItem[];
  orgName?: string;
  /** riders 없을 때 미리 계산한 특약 결과 */
  tokkResults?: TokkResult[];
}): InsReportDraft {
  const { consult, customerName, reportItems, orgName } = input;
  const p = consult.profile;

  const fromRiders: TokkResult[] = (consult.riders ?? []).map((r) => {
    const badge = toRiderBadge(r.badge);
    return {
      id: r.riderKey,
      name: RIDER_KEY_LABEL[r.riderKey] ?? r.riderKey,
      desc: r.reasonText || r.additionalCheckText || '',
      status: riderBadgeToTokkStatus(badge),
      icon: riderKeyToIcon(r.riderKey),
    };
  });

  return {
    구군: p?.region ?? '',
    연령대: p?.ageGroup ?? '',
    성별: genderLabel(p?.gender),
    차종: p?.vehicleType ?? '',
    고객명: customerName || undefined,
    memo: consult.memo?.trim() || undefined,
    예측등급: consult.riskGrade
      ? String(consult.riskGrade).toUpperCase()
      : undefined,
    위험도: consult.riskScore ?? undefined,
    담보추천: reportItems.map((item) => ({
      id: item.coverageKey,
      name: item.coverageName,
      recommended: item.recommended,
      script: item.reasonText,
      reason: item.basisText,
    })),
    checklist: resolveChecklistAnswers({
      rows: consult.checklist,
      riders: consult.riders,
    }),
    tokkResults:
      input.tokkResults ??
      (fromRiders.length > 0 ? fromRiders : []),
    analyzedAt: formatConsultDateTime(consult.consultedAt),
    consultType: consultationTypeLabel(consult.consultationType),
    orgName: orgName || undefined,
    source: 'customers',
  };
}