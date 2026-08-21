// 룰 엔진 판정 + 문구 상수 결합 → 화면용 카드 데이터 (DB 접근 없음)

import {
  evaluateAllRiders,
  type ChecklistAnswers,
  type RiderJudgement,
} from '../discountRider';
import { RIDER_TEXTS, REASON_FIELD_BY_BADGE } from '../riderTexts';

export interface DiscountRiderResult {
  riderKey: string;
  riderName: string;
  iconKey: string;
  badge: string;
  reasonText: string;
  additionalCheckText: string | null;
}

/** 프론트 ChecklistAnswers 키 → 엔진 키 정규화 */
function normalizeAnswers(input: Record<string, unknown>): ChecklistAnswers {
  const get = (...keys: string[]): string => {
    for (const k of keys) {
      const v = input[k];
      if (typeof v === 'string' && v.length > 0) return v;
    }
    return '';
  };

  const existing = input.existing_discount_riders ?? input.existingDiscountRiders;
  let existingRaw = '';
  if (typeof existing === 'string') {
    existingRaw = existing;
  } else if (Array.isArray(existing)) {
    existingRaw = existing.map(String).join(',');
  }

  return {
    annual_mileage: get('annual_mileage', 'mileage'),
    blackbox_mounted: get('blackbox_mounted', 'blackbox'),
    safe_driving_score_used: get('safe_driving_score_used', 'safedrive'),
    fcw_status: get('fcw_status', 'fcw'),
    ldws_status: get('ldws_status', 'ldw'),
    existing_discount_riders: existingRaw,
  };
}

function buildResult(judgement: RiderJudgement): DiscountRiderResult {
  const text = RIDER_TEXTS[judgement.riderKey];
  if (!text) {
    throw new Error(`알 수 없는 riderKey: ${judgement.riderKey}`);
  }

  const reasonField = REASON_FIELD_BY_BADGE[judgement.badge];
  const reasonText =
    (text[reasonField] as string | null) ??
    '현재 조건에서는 안내 문구가 준비되지 않았습니다.';

  return {
    riderKey: judgement.riderKey,
    riderName: text.riderName,
    iconKey: text.iconKey,
    badge: judgement.badge,
    reasonText,
    additionalCheckText: text.additionalCheckText,
  };
}

/** 체크리스트 응답 → 5개 할인특약 카드 (순수 계산, DB I/O 없음) */
export function evaluateRidersForDisplay(
  answers: ChecklistAnswers | Record<string, unknown>,
): DiscountRiderResult[] {
  const normalized = normalizeAnswers(answers as Record<string, unknown>);
  return evaluateAllRiders(normalized).map(buildResult);
}

/** controller용 alias */
export function evaluateDiscountRiders(
  input: unknown,
): DiscountRiderResult[] {
  return evaluateRidersForDisplay(
    (input ?? {}) as Record<string, unknown>,
  );
}
