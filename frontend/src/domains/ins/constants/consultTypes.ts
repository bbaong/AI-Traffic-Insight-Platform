/** 상담 유형 — UI 라벨 / API·DB enum 분리 */
export const CONSULT_TYPE_OPTIONS = [
  { value: 'NEW', label: '신규' },
  { value: 'RENEWAL', label: '갱신' },
  { value: 'CLAIM', label: '사고·청구' },
  { value: 'COVERAGE_ANALYSIS', label: '담보분석' },
  { value: 'OTHER', label: '기타' },
] as const;

export type ConsultType = (typeof CONSULT_TYPE_OPTIONS)[number]['value'];

export function consultTypeLabel(value: string): string {
  const found = CONSULT_TYPE_OPTIONS.find((o) => o.value === value);
  return found?.label ?? value;
}
