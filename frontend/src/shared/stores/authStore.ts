import { create } from 'zustand';
import type { AuthUser } from '../types/auth';
import { clearSettingsVerifyStorage } from './settingsVerifyStore';

const STORAGE_KEY = 'ati_auth_user';
const RT_KEY = 'ati_refresh_token';

/* 스토리지에서 사용자 정보 읽기 */
function readStoredUser(): AuthUser | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/* 스토리지만 비움. React 리렌더 없이 즉시 페이지 이동할 때 사용 */
export function clearAuthStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(RT_KEY);
  sessionStorage.removeItem(RT_KEY);
  clearSettingsVerifyStorage();
}

/* 인증 상태 스토어 타입 */
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setSession: (
    user: AuthUser,
    accessToken: string,
    refreshToken: string,
    remember: boolean,
  ) => void;
  setAccessToken: (accessToken: string, refreshToken?: string) => void;
  clearUser: () => void;
  patchUser: (partial: Partial<AuthUser>) => void;
}

/* 리프레시 토큰 읽기 */
function readRefreshToken(): string | null {
  return localStorage.getItem(RT_KEY) ?? sessionStorage.getItem(RT_KEY);
}

/* 리프레시 토큰 가져오기 */
export function getRefreshToken(): string | null {
  return readRefreshToken();
}

/* 인증 상태 스토어 생성 */
export const useAuthStore = create<AuthState>((set) => ({
  user: readStoredUser(),
  accessToken: null,
  /* 세션 설정 */
  setSession: (user, accessToken, refreshToken, remember) => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RT_KEY);
    sessionStorage.removeItem(RT_KEY);
    const store = remember ? localStorage : sessionStorage;
    store.setItem(STORAGE_KEY, JSON.stringify(user));
    store.setItem(RT_KEY, refreshToken);
    set({ user, accessToken });
  },
  /* 액세스 토큰 설정 */
  setAccessToken: (accessToken, refreshToken) => {
    if (refreshToken) {
      if (localStorage.getItem(RT_KEY) != null) {
        localStorage.setItem(RT_KEY, refreshToken);
      } else {
        sessionStorage.setItem(RT_KEY, refreshToken);
      }
    }
    set({ accessToken });
  },
  /* 사용자 정보 수정 */
  patchUser: (partial) => {
    set((state) => {
      if (!state.user) return state;
      const next = { ...state.user, ...partial };
      const raw = JSON.stringify(next);
      if (localStorage.getItem(STORAGE_KEY) != null) {
        localStorage.setItem(STORAGE_KEY, raw);
      } else if (sessionStorage.getItem(STORAGE_KEY) != null) {
        sessionStorage.setItem(STORAGE_KEY, raw);
      }
      return { user: next };
    });
  },
  /* 사용자 정보 초기화 */
  clearUser: () => {
    clearAuthStorage();
    set({ user: null, accessToken: null });
  },
}));