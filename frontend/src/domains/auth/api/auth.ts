import type { LoginPayload, LoginResult, UserRole } from '../../../shared/types/auth';

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
      login_id?: string;
      name?: string;
      role?: string;
      is_active?: boolean;
      position?: string | null;
      email?: string | null;
      department_id?: number | null;
      org_name?: string | null;
      created_at?: string | null;
      last_login_at?: string | null;
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
        loginId: user.login_id ?? payload.loginId,
        name: user.name,
        role: user.role,
        position: user.position ?? null,
        email: user.email ?? null,
        departmentId:
          user.department_id != null ? Number(user.department_id) : null,
        departmentName: null,
        orgName: user.org_name ?? null,
        createdAt: user.created_at ?? null,
        lastLoginAt: user.last_login_at ?? null,
      },
    };
  }

  return { ok: false, reason: 'INVALID' };
}
