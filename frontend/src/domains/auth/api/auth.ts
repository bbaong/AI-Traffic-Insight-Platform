import type { LoginPayload, LoginResult, UserRole } from '../../../shared/types/auth';
import { apiUrl } from '../../../shared/api/http';
import { clearAuthStorage, getRefreshToken } from '../../../shared/stores/authStore';

// 사용자 권한 검증
function isUserRole(value: unknown): value is UserRole {
  return value === 'ROLE_A' || value === 'ROLE_B';
}

// 로그인
export async function login(payload: LoginPayload): Promise<LoginResult> {
  const res = await fetch(apiUrl('/api/user/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: payload.loginId, password: payload.password }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: {
      user?: {
        user_id?: string | number;
        login_id?: string;
        name?: string;
        role?: string;
        is_active?: boolean;
        position?: string | null;
        email?: string | null;
        department_id?: number | null;
        department_name?: string | null;
        org_name?: string | null;
        created_at?: string | null;
        last_login_at?: string | null;
      };
      accessToken?: string;
      refreshToken?: string;
    };
  };

  if (res.ok && data.success === true && data.data?.user) {
    const user = data.data.user;
    const accessToken = data.data.accessToken;
    const refreshToken = data.data.refreshToken;
    if (user.is_active === false) {
      return { ok: false, reason: 'INACTIVE' };
    }
    if (!isUserRole(user.role) || !user.name || !accessToken || !refreshToken) {
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
        departmentName: user.department_name?.trim() || null,
        orgName: user.org_name ?? null,
        createdAt: user.created_at ?? null,
        lastLoginAt: user.last_login_at ?? null,
      },
      accessToken,
      refreshToken,
    };
  }

  return { ok: false, reason: 'INVALID' };
}

// 로그아웃 (refresh token 무효화)
export async function logout(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return;
  await fetch(apiUrl('/api/user/logout'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => undefined);
}

// 로그아웃 후 리다이렉트
export async function signOut(redirectTo: string): Promise<void> {
  await logout(getRefreshToken());
  clearAuthStorage();
  window.location.replace(redirectTo);
}