/** 예: 2026-08-14 14:47 (GOV PDF 생성일시) */
export function formatKstDateTime(date: Date = new Date()): string {
    return date
      .toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' })
      .slice(0, 16);
  }
  
  /** 예: 2026.08.14 14:47 (보험 PDF 분석일 형식) */
  export function formatKstDateTimeDot(date: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('year')}.${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`;
  }