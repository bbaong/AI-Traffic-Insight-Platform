import { getRefreshToken, useAuthStore } from '../shared/stores/authStore';
import { refreshOnce } from '../shared/api/http';

export async function bootstrapAuth(): Promise<void> {
  const rt = getRefreshToken();
  if (!rt) return;
  const next = await refreshOnce();
  if (!next) {
    if (!useAuthStore.getState().accessToken) {
      useAuthStore.getState().clearUser();
    }
    return;
  }
  useAuthStore.getState().setAccessToken(next.accessToken, next.refreshToken);
}
