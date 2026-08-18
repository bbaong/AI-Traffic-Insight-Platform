/** 2025Q4 → 2025년 4분기, 2025H2 → 2025년 하반기 */
export function formatPeriodLabel(raw?: string | null): string {
    if (!raw) return '-';
    const q = /^(\d{4})Q([1-4])$/i.exec(raw);
    if (q) return `${q[1]}년 ${q[2]}분기`;
    const h = /^(\d{4})H([12])$/i.exec(raw);
    if (h) return `${h[1]}년 ${h[2] === '1' ? '상반기' : '하반기'}`;
    return raw;
  }