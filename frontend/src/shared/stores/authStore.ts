import { create } from 'zustand';
import type { AuthUser } from '../types/auth';
import { clearSettingsVerifyStorage } from './settingsVerifyStore';

const STORAGE_KEY = 'ati_auth_user';

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

/** 스토리지만 비움. React 리렌더 없이 즉시 페이지 이동할 때 사용 */
export function clearAuthStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  clearSettingsVerifyStorage();
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser, remember: boolean) => void;
  clearUser: () => void;
  patchUser: (partial: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readStoredUser(),
  setUser: (user, remember) => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    const store = remember ? localStorage : sessionStorage;
    store.setItem(STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },
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
  clearUser: () => {
    clearAuthStorage();
    set({ user: null });
  },
}));
