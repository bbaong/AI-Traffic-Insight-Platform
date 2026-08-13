export const CITY_AVG_COLOR = '#4A5568';
export const COMPARE_MAX_CHIPS = 3;

/** 구·군 고정 색 — 선택 순서와 무관 */
export const DISTRICT_COLORS: Record<string, string> = {
  중구: '#EF7E20',
  북구: '#0062AA',
  동구: '#CF2026',
  서구: '#FBC707',
  남구: '#9AC221',
  수성구: '#75B0DB',
  달서구: '#005F27',
  달성군: '#33B540',
  군위군: '#DF2D5A',
};

export const DISTRICT_COLOR_BY_CODE: Record<string, string> = {
  jung: '#EF7E20',
  buk: '#0062AA',
  dong: '#CF2026',
  seo: '#FBC707',
  nam: '#9AC221',
  suseong: '#75B0DB',
  dalseo: '#005F27',
  dalseong: '#33B540',
  gunwi: '#DF2D5A',
};

export const DISTRICT_COLOR_LEGEND = [
  { label: '중구', color: '#EF7E20' },
  { label: '북구', color: '#0062AA' },
  { label: '동구', color: '#CF2026' },
  { label: '서구', color: '#FBC707' },
  { label: '남구', color: '#9AC221' },
  { label: '수성구', color: '#75B0DB' },
  { label: '달서구', color: '#005F27' },
  { label: '달성군', color: '#33B540' },
  { label: '군위군', color: '#DF2D5A' },
] as const;

export type CompareChip = {
  districtId: number;
  name: string;
  code: string;
};

export function districtColor(name: string): string {
  const hit = Object.keys(DISTRICT_COLORS).find(
    (n) => name === n || name.endsWith(n) || n.endsWith(name),
  );
  return (hit && DISTRICT_COLORS[hit]) || CITY_AVG_COLOR;
}

export function districtColorByCode(code: string): string {
  return DISTRICT_COLOR_BY_CODE[code] ?? CITY_AVG_COLOR;
}

/** 노랑·연두처럼 밝은 칩은 어두운 글자 */
export function onDistrictColor(hex: string): string {
  const n = hex.replace('#', '');
  if (n.length < 6) return '#fff';
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? '#1b3a4b' : '#fff';
}

export function formatQuarterLabel(raw: string): string {
  const m = /^(\d{4})-?Q([1-4])$/i.exec(raw.replace('-Q', 'Q'));
  if (m) return `${m[1].slice(2)}-${m[2]}Q`;
  return raw;
}

export function insightIcon(key: string): string {
  const t = key.toLowerCase();
  if (t.includes('night') || t.includes('야간')) return 'moon';
  if (
    t.includes('pedestrian') ||
    t.includes('elderly') ||
    t.includes('보행')
  ) {
    return 'walk';
  }
  if (t.includes('signal') || t.includes('신호')) return 'traffic';
  if (t.includes('parking') || t.includes('주차')) return 'parking';
  if (t.startsWith('rel_')) return 'chart';
  if (t.includes('특이') || t.includes('없음')) return 'star';
  return 'pin';
}
