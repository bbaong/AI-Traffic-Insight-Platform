import { apiUrl } from './http';

export async function refreshSession(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const res = await fetch(apiUrl('/api/user/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { accessToken?: string; refreshToken?: string };
  };
  if (
    !res.ok ||
    !data.success ||
    !data.data?.accessToken ||
    !data.data.refreshToken
  ) {
    return null;
  }
  return {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
  };
}