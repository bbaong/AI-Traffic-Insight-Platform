export const GRADE_LABEL: Record<string, string> = {
    CRITICAL: '매우높음',
    HIGH: '높음',
    MODERATE: '보통',
    LOW: '낮음',
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