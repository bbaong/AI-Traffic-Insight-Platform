export const GOV_PRED_CACHE_KEY = 'gov:forecasts:Q';
export const GOV_HOTSPOT_CACHE_KEY = 'gov:hotspots';
export const GOV_PDF_SNAPSHOT_KEY = 'gov_pdf_snapshot_v1';

export function historySessionKey(region: string): string {
  return `gov:history:${region}:4`;
}

export function readSessionJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSessionJson(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota 등은 무시 */
  }
}

