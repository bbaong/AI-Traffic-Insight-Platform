import { create } from 'zustand';
import type { AuthUser } from '../types/auth';

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

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser, remember: boolean) => void;
  clearUser: () => void;
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
  clearUser: () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    set({ user: null });
  },
}));
