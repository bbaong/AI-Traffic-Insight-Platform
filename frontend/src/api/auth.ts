import type { LoginPayload, LoginResult, UserRole } from '../types/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

function isUserRole(value: unknown): value is UserRole {
  return value === 'ROLE_A' || value === 'ROLE_B';
}

/** 로그인 */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: payload.loginId,
      password: payload.password,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: {
      user_id?: string | number;
      name?: string;
      role?: string;
      is_active?: boolean;
    };
  };

  if (res.ok && data.success === true && data.data) {
    const user = data.data;

    if (user.is_active === false) {
      return { ok: false, reason: 'INACTIVE' };
    }

    if (!isUserRole(user.role) || !user.name) {
      return { ok: false, reason: 'INVALID' };
    }

    const userId = Number(user.user_id);
    if (!Number.isFinite(userId)) {
      return { ok: false, reason: 'INVALID' };
    }

    return {
      ok: true,
      user: {
        userId,
        name: user.name,
        role: user.role,
      },
    };
  }

  return { ok: false, reason: 'INVALID' };
}
