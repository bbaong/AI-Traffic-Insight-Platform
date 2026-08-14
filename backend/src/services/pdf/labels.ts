export const GRADE_LABEL: Record<string, string> = {
    CRITICAL: 'Critical',
    HIGH: 'High',
    MODERATE: 'Moderate',
    LOW: 'Low',
  };
  
  export const TOKK_LABEL: Record<string, string> = {
    RECOMMEND: '권장',
    CHECK: '추천',
    EXCLUDE: '제외',
    EXISTING: '기존가입',
  };
  
  export function gradeLabel(raw: string): string {
    const key = String(raw || '').toUpperCase();
    return GRADE_LABEL[key] ?? raw;
  }
  
  export function tokkStatusLabel(status: string): string {
    return TOKK_LABEL[status] ?? status ?? '-';
  }