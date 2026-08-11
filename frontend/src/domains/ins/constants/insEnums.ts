import type {
  ConsultationStatus,
  ConsultationTypeCode,
  CustomerGender,
  CustomerRiskGrade,
  RiderBadge,
} from '../types/customers';

export const CONSULTATION_TYPE_META: Record<
  ConsultationTypeCode,
  { label: string; color: string; bg: string }
> = {
  NEW: { label: '신규', color: '#3E6CA6', bg: '#E9F0F8' },
  RENEWAL: { label: '갱신', color: '#2E8B4E', bg: '#E7F4EA' },
  CLAIM: { label: '사고/청구', color: '#B3261E', bg: '#FBE5E3' },
  COVERAGE_ANALYSIS: { label: '담보분석', color: '#7A5AA8', bg: '#F0EBF8' },
  OTHER: { label: '기타', color: '#5A6B80', bg: '#EEF1F5' },
};

export const RIDER_BADGE_META: Record<RiderBadge, { label: string; color: string }> =
  {
    REVIEW_RECOMMENDED: { label: '검토 권장', color: '#2E8B4E' },
    FURTHER_CHECK_REQUIRED: { label: '추가 확인', color: '#F77C34' },
    CURRENTLY_EXCLUDED: { label: '현재 제외', color: '#8290A2' },
    EXISTING_MEMBER_VERIFIED: { label: '기존 가입', color: '#4574A8' },
  };

export const RISK_GRADE_META: Record<
  CustomerRiskGrade,
  { label: string; ko: string; color: string; bg: string }
> = {
  Low: { label: 'Low', ko: '낮음', color: '#2E8B4E', bg: '#E7F4EA' },
  Moderate: { label: 'Moderate', ko: '보통', color: '#CA8A04', bg: '#FEF6D8' },
  High: { label: 'High', ko: '높음', color: '#F77C34', bg: '#FEF1E8' },
  Critical: { label: 'Critical', ko: '위험', color: '#B3261E', bg: '#FBE5E3' },
};

export const RIDER_KEY_LABEL: Record<string, string> = {
  mileage_discount: '마일리지 할인특약',
  blackbox_discount: '블랙박스 할인특약',
  safe_driving_score_discount: '안전운전점수 할인특약',
  fcw_discount: '전방충돌방지장치 할인특약',
  ldws_discount: '차선이탈경고장치 할인특약',
};

const TYPE_CODES: ConsultationTypeCode[] = [
  'NEW',
  'RENEWAL',
  'CLAIM',
  'COVERAGE_ANALYSIS',
  'OTHER',
];

export function toConsultationType(
  value: string | null | undefined,
): ConsultationTypeCode | null {
  if (!value) return null;
  return TYPE_CODES.includes(value as ConsultationTypeCode)
    ? (value as ConsultationTypeCode)
    : null;
}

export function consultationTypeLabel(value: string | null | undefined): string {
  const code = toConsultationType(value);
  return code ? CONSULTATION_TYPE_META[code].label : '-';
}

export function toRiderBadge(value: string | null | undefined): RiderBadge | null {
  if (
    value === 'REVIEW_RECOMMENDED' ||
    value === 'FURTHER_CHECK_REQUIRED' ||
    value === 'CURRENTLY_EXCLUDED' ||
    value === 'EXISTING_MEMBER_VERIFIED'
  ) {
    return value;
  }
  return null;
}

export function toRiskGrade(
  value: string | null | undefined,
): CustomerRiskGrade | null {
  if (!value) return null;
  const key = value.trim();
  const upper = key.toUpperCase();
  if (upper === 'LOW') return 'Low';
  if (upper === 'MODERATE' || upper === 'MEDIUM') return 'Moderate';
  if (upper === 'HIGH') return 'High';
  if (upper === 'CRITICAL') return 'Critical';
  return null;
}

export function statusLabel(value: ConsultationStatus | string | null): string {
  if (value === 'COMPLETED') return '상담완료';
  if (value === 'IN_PROGRESS') return '진행중';
  return '-';
}

export function genderLabel(value: CustomerGender | string | null | undefined): string {
  if (value === 'MALE' || value === '남') return '남';
  if (value === 'FEMALE' || value === '여') return '여';
  return '-';
}

export function formatConsultDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

export function formatConsultDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${mm}.${dd} ${hh}:${mi}`;
}
