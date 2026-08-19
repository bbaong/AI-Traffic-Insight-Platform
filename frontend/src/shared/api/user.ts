import { apiFetch } from './http';

export type ChangePasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type VerifyPasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/** 비밀번호 재확인 (변경 없음) */
export async function verifyPassword(payload: {
  password: string;
}): Promise<VerifyPasswordResult> {
  const res = await apiFetch('/api/user/verify-password', {
    method: 'POST',
    body: JSON.stringify({
      password: payload.password,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };

  if (res.ok && data.success === true) {
    return {
      ok: true,
      message: data.message ?? '비밀번호 확인 완료',
    };
  }

  return {
    ok: false,
    message: data.message ?? '비밀번호 확인에 실패했습니다.',
  };
}

/** 비밀번호 변경 */
export async function changePassword(payload: {
  newPassword: string;
}): Promise<ChangePasswordResult> {
  const res = await apiFetch('/api/user/password', {
    method: 'PATCH',
    body: JSON.stringify({
      new_password: payload.newPassword,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };

  if (res.ok && data.success === true) {
    return {
      ok: true,
      message: data.message ?? '비밀번호가 변경되었습니다.',
    };
  }

  return {
    ok: false,
    message: data.message ?? '비밀번호 변경에 실패했습니다.',
  };
}

export type ChangeEmailResult =
  | { ok: true; message: string; email: string | null; changed: boolean }
  | { ok: false; message: string };

export async function changeEmail(payload: {
  email: string;
}): Promise<ChangeEmailResult> {
  const res = await apiFetch('/api/user/email', {
    method: 'PATCH',
    body: JSON.stringify({
      email: payload.email,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: { email?: string | null; changed?: boolean };
  };

  if (res.ok && data.success === true) {
    return {
      ok: true,
      message: data.message ?? '이메일이 저장되었습니다.',
      email: data.data?.email ?? null,
      changed: data.data?.changed ?? true,
    };
  }

  return {
    ok: false,
    message: data.message ?? '이메일 변경에 실패했습니다.',
  };
}