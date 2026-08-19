import { getRefreshToken, useAuthStore } from '../stores/authStore';
import { refreshSession } from './session';

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

export function apiUrl(path: string, params?: QueryParams): string {
  const url = new URL(path, API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

let refreshInFlight: Promise<{
  accessToken: string;
  refreshToken: string;
} | null> | null = null;

async function refreshOnce(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  if (refreshInFlight) return refreshInFlight;
  const rt = getRefreshToken();
  if (!rt) return null;
  refreshInFlight = refreshSession(rt).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  params?: QueryParams,
): Promise<Response> {
  const run = (accessToken: string | null) => {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(apiUrl(path, params), { ...init, headers });
  };

  let res = await run(useAuthStore.getState().accessToken);

  if (res.status === 401) {
    const next = await refreshOnce();
    if (!next) {
      useAuthStore.getState().clearUser();
      return res;
    }
    useAuthStore.getState().setAccessToken(next.accessToken, next.refreshToken);
    res = await run(next.accessToken);
  }

  return res;
}

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

export async function fetchPdfBlob(path: string, body: unknown): Promise<Blob> {
  const res = await apiFetch(path, {
    method: 'POST',
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