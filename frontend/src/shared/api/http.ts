export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

/* API URL 생성 */
export function apiUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  const url = new URL(path, API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/* JSON 읽기 */
export async function readJson<T>(
  res: Response,
  fallback = '응답을 해석하지 못했습니다.',
): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error(fallback);
  }
}

/* PDF 블럭 가져오기 */
export async function fetchPdfBlob(path: string, body: unknown): Promise<Blob> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get('Content-Type') ?? '';
  if (!res.ok || !contentType.includes('application/pdf')) {
    let message = 'PDF 생성에 실패했습니다.';
    try {
      const json = (await res.json()) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.blob();
}