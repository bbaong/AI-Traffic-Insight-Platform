/**
 * 체크리스트 응답 → 5개 할인특약 배지 판정 (DB 접근 없음)
 *
 * 프론트 CHECKLIST_ITEMS 옵션 문구 기준.
 * 1. 마일리지: km 임계값으로 가르지 않음. 구간 선택 있으면 검토권장
 * 2. 첨단안전장치: "출고 시 장착"만 검토권장. 미장착은 현재제외
 * 3. 현재 적용 중인 특약은 무조건 기존가입확인 (최우선)
 */

export type RiderBadge =
  | '검토권장'
  | '추가확인필요'
  | '현재제외'
  | '기존가입확인';

export interface ChecklistAnswers {
  annual_mileage?: string;
  blackbox_mounted?: string;
  safe_driving_score_used?: string;
  fcw_status?: string;
  ldws_status?: string;
  /** 쉼표 구분 라벨: "마일리지,블랙박스,..." */
  existing_discount_riders?: string;
  [key: string]: string | undefined;
}

export interface RiderJudgement {
  riderKey: string;
  badge: RiderBadge;
}

/** 프론트 마일리지 구간 옵션 */
const MILEAGE_OPTIONS = new Set([
  '5,000km 이하',
  '5,000 ~ 10,000km',
  '10,000 ~ 15,000km',
  '15,000km 이상',
]);

/** 블랙박스 — 장착으로 보는 옵션 (프론트) */
const BLACKBOX_POSITIVE = new Set([
  '일반형 고정 장착',
  '상시녹화형 장착',
  '예', // 호환
]);

/** 블랙박스 — 미장착 */
const BLACKBOX_NEGATIVE = new Set(['미장착', '아니오']);

/** 안전운전점수 — 이용 중 */
const SAFEDRIVE_POSITIVE = new Set(['이용 중']);

/** 안전운전점수 — 미이용 */
const SAFEDRIVE_NEGATIVE = new Set(['미이용', '이용하지 않음', '이용안함']);

/** ADAS — 출고 시 장착 (프론트: "출고 시 장착") */
const ADAS_FACTORY = new Set([
  '출고 시 장착',
  '출고 시 기본·옵션으로 장착', // 호환
]);

/** ADAS — 할인 제외 (미장착·애프터마켓) */
const ADAS_EXCLUDE = new Set([
  '미장착',
  '출고 후 별도 장착',
]);

export const EXISTING_RIDER_LABEL_MAP: Record<string, string> = {
  마일리지: 'mileage_discount',
  블랙박스: 'blackbox_discount',
  안전운전점수: 'safe_driving_score_discount',
  전방충돌방지장치: 'fcw_discount',
  차선이탈경고장치: 'ldws_discount',
};

function alreadySubscribed(answers: ChecklistAnswers, riderKey: string): boolean {
  const existingRaw = answers.existing_discount_riders ?? '';
  const existingLabels = new Set(
    existingRaw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  );
  const existingKeys = new Set(
    [...existingLabels].map((label) => EXISTING_RIDER_LABEL_MAP[label]),
  );
  return existingKeys.has(riderKey);
}

function judgeMileage(answers: ChecklistAnswers): RiderJudgement {
  const value = (answers.annual_mileage ?? '').trim();
  if (!value || value === '확인 필요') {
    return { riderKey: 'mileage_discount', badge: '추가확인필요' };
  }
  // 프론트 구간 옵션이면 임계값 없이 검토권장
  if (MILEAGE_OPTIONS.has(value) || value.length > 0) {
    return { riderKey: 'mileage_discount', badge: '검토권장' };
  }
  return { riderKey: 'mileage_discount', badge: '추가확인필요' };
}

function judgeBlackbox(answer: string): RiderJudgement {
  const value = answer.trim();
  if (BLACKBOX_POSITIVE.has(value)) {
    return { riderKey: 'blackbox_discount', badge: '검토권장' };
  }
  if (value === '확인 필요') {
    return { riderKey: 'blackbox_discount', badge: '추가확인필요' };
  }
  if (BLACKBOX_NEGATIVE.has(value) || value) {
    return { riderKey: 'blackbox_discount', badge: '현재제외' };
  }
  return { riderKey: 'blackbox_discount', badge: '추가확인필요' };
}

function judgeSafeDrive(answer: string): RiderJudgement {
  const value = answer.trim();
  if (SAFEDRIVE_POSITIVE.has(value)) {
    return { riderKey: 'safe_driving_score_discount', badge: '검토권장' };
  }
  if (value === '확인 필요') {
    return { riderKey: 'safe_driving_score_discount', badge: '추가확인필요' };
  }
  if (SAFEDRIVE_NEGATIVE.has(value) || value) {
    return { riderKey: 'safe_driving_score_discount', badge: '현재제외' };
  }
  return { riderKey: 'safe_driving_score_discount', badge: '추가확인필요' };
}

function judgeAdas(riderKey: string, status: string): RiderJudgement {
  const value = status.trim();
  if (ADAS_FACTORY.has(value)) {
    return { riderKey, badge: '검토권장' };
  }
  if (value === '확인 필요') {
    return { riderKey, badge: '추가확인필요' };
  }
  if (ADAS_EXCLUDE.has(value) || value) {
    return { riderKey, badge: '현재제외' };
  }
  return { riderKey, badge: '추가확인필요' };
}

/** 5개 할인특약 전체 판정. 기존 가입 특약은 다른 판정보다 우선 */
export function evaluateAllRiders(answers: ChecklistAnswers): RiderJudgement[] {
  const raw: RiderJudgement[] = [
    judgeMileage(answers),
    judgeBlackbox(answers.blackbox_mounted ?? ''),
    judgeSafeDrive(answers.safe_driving_score_used ?? ''),
    judgeAdas('fcw_discount', answers.fcw_status ?? ''),
    judgeAdas('ldws_discount', answers.ldws_status ?? ''),
  ];

  return raw.map((j) =>
    alreadySubscribed(answers, j.riderKey)
      ? { riderKey: j.riderKey, badge: '기존가입확인' }
      : j,
  );
}
