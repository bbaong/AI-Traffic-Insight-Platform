import type { ChecklistAnswers } from '../types/consulting';
import type { Rider, RiderBadge } from '../types/customers';
import { toRiderBadge } from '../constants/insEnums';

/** DB item_key / API 필드 별칭 → ChecklistAnswers 키 */
const KEY_ALIASES: Record<keyof ChecklistAnswers, string[]> = {
  mileage: ['mileage', 'annual_mileage'],
  blackbox: ['blackbox'],
  safedrive: ['safedrive'],
  safedriveService: ['safedriveService', 'safedrive_service'],
  safedriveScore: ['safedriveScore', 'safedrive_score'],
  fcw: ['fcw'],
  ldw: ['ldw', 'ldws'],
};

const RIDER_KEY_TO_FIELD: Record<
  string,
  keyof Pick<
    ChecklistAnswers,
    'mileage' | 'blackbox' | 'safedrive' | 'fcw' | 'ldw'
  >
> = {
  mileage_discount: 'mileage',
  blackbox_discount: 'blackbox',
  safe_driving_score_discount: 'safedrive',
  fcw_discount: 'fcw',
  ldws_discount: 'ldw',
};

function pickFromMap(
  byKey: Record<string, string>,
  aliases: string[],
): string {
  for (const k of aliases) {
    const v = byKey[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function hasAnyAnswer(c: ChecklistAnswers): boolean {
  return (
    !!c.mileage ||
    !!c.blackbox ||
    !!c.safedrive ||
    !!c.safedriveService ||
    !!c.safedriveScore ||
    !!c.fcw ||
    !!c.ldw
  );
}

/**
 * 옛 상담처럼 checklist 답이 비었을 때, 저장된 특약 배지로 요약용 값을 복원.
 * (정확한 옵션 문구는 유실됐을 수 있어 배지 기반 대표값)
 */
export function inferChecklistFromRiders(
  riders: Rider[] | null | undefined,
): ChecklistAnswers {
  const out = emptyChecklistAnswers();
  for (const r of riders ?? []) {
    const field = RIDER_KEY_TO_FIELD[r.riderKey];
    if (!field) continue;
    const badge = toRiderBadge(r.badge);
    if (!badge) continue;
    const value = displayValueFromRiderBadge(field, badge);
    if (value) out[field] = value;
  }
  return out;
}

function displayValueFromRiderBadge(
  field: 'mileage' | 'blackbox' | 'safedrive' | 'fcw' | 'ldw',
  badge: RiderBadge,
): string {
  if (field === 'mileage') {
    switch (badge) {
      case 'REVIEW_RECOMMENDED':
        return '확인됨 (구간 미저장)';
      case 'EXISTING_MEMBER_VERIFIED':
        return '기존 가입';
      case 'FURTHER_CHECK_REQUIRED':
        return '확인 필요';
      case 'CURRENTLY_EXCLUDED':
        return '해당 없음';
      default:
        return '';
    }
  }
  if (field === 'blackbox') {
    switch (badge) {
      case 'REVIEW_RECOMMENDED':
        return '고정 장착 확인';
      case 'EXISTING_MEMBER_VERIFIED':
        return '기존 가입';
      case 'FURTHER_CHECK_REQUIRED':
        return '확인 필요';
      case 'CURRENTLY_EXCLUDED':
        return '미장착';
      default:
        return '';
    }
  }
  if (field === 'safedrive') {
    switch (badge) {
      case 'REVIEW_RECOMMENDED':
      case 'EXISTING_MEMBER_VERIFIED':
        return '이용 중';
      case 'FURTHER_CHECK_REQUIRED':
        return '확인 필요';
      case 'CURRENTLY_EXCLUDED':
        return '미이용';
      default:
        return '';
    }
  }
  // fcw / ldw
  switch (badge) {
    case 'REVIEW_RECOMMENDED':
    case 'EXISTING_MEMBER_VERIFIED':
      return '출고 시 장착';
    case 'FURTHER_CHECK_REQUIRED':
      return '확인 필요';
    case 'CURRENTLY_EXCLUDED':
      return '미장착';
    default:
      return '';
  }
}

/** 상담 API checklist 행 → ChecklistAnswers (camel/snake 키 모두 수용) */
export function checklistAnswersFromRows(
  rows: Array<{ itemKey: string; answerValue: string }> | null | undefined,
): ChecklistAnswers {
  const byKey: Record<string, string> = {};
  for (const row of rows ?? []) {
    if (!row?.itemKey) continue;
    byKey[row.itemKey] = row.answerValue ?? '';
  }

  return {
    mileage: pickFromMap(byKey, KEY_ALIASES.mileage),
    blackbox: pickFromMap(byKey, KEY_ALIASES.blackbox),
    safedrive: pickFromMap(byKey, KEY_ALIASES.safedrive),
    safedriveService: pickFromMap(byKey, KEY_ALIASES.safedriveService),
    safedriveScore: pickFromMap(byKey, KEY_ALIASES.safedriveScore),
    fcw: pickFromMap(byKey, KEY_ALIASES.fcw),
    ldw: pickFromMap(byKey, KEY_ALIASES.ldw),
  };
}

/** DB 답 우선, 없으면 riders로 보완 */
export function resolveChecklistAnswers(input: {
  rows?: Array<{ itemKey: string; answerValue: string }> | null;
  riders?: Rider[] | null;
}): ChecklistAnswers {
  const fromRows = checklistAnswersFromRows(input.rows);
  if (hasAnyAnswer(fromRows)) return fromRows;
  return inferChecklistFromRiders(input.riders);
}

export function emptyChecklistAnswers(): ChecklistAnswers {
  return {
    mileage: '',
    blackbox: '',
    safedrive: '',
    safedriveService: '',
    safedriveScore: '',
    fcw: '',
    ldw: '',
  };
}
