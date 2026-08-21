import { create } from 'zustand';

const STORAGE_KEY = 'ati_settings_verified_until';
/** 재확인 유효 시간: 10분 */
const TTL_MS = 10 * 60 * 1000;

function readVerifiedUntil(): number | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const until = Number(raw);
    if (!Number.isFinite(until) || Date.now() >= until) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return until;
  } catch {
    return null;
  }
}

interface SettingsVerifyState {
  verifiedUntil: number | null;
  isVerified: () => boolean;
  markVerified: () => void;
  clearVerified: () => void;
}

export const useSettingsVerifyStore = create<SettingsVerifyState>((set, get) => ({
  verifiedUntil: readVerifiedUntil(),
  isVerified: () => {
    const until = get().verifiedUntil;
    if (until == null || Date.now() >= until) {
      if (until != null) {
        sessionStorage.removeItem(STORAGE_KEY);
        set({ verifiedUntil: null });
      }
      return false;
    }
    return true;
  },
  markVerified: () => {
    const until = Date.now() + TTL_MS;
    sessionStorage.setItem(STORAGE_KEY, String(until));
    set({ verifiedUntil: until });
  },
  clearVerified: () => {
    sessionStorage.removeItem(STORAGE_KEY);
    set({ verifiedUntil: null });
  },
}));

/** 로그아웃 등에서 재확인 상태도 함께 비울 때 사용 */
export function clearSettingsVerifyStorage(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  useSettingsVerifyStore.getState().clearVerified();
}
