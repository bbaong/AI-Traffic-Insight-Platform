import { apiUrl } from "./http";

export type ChangePasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type VerifyPasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/** 비밀번호 재확인 (변경 없음) */
export async function verifyPassword(payload: {
  userId: number;
  password: string;
}): Promise<VerifyPasswordResult> {
  const res = await fetch(apiUrl('/api/user/verify-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: payload.userId,
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
  userId: number;
  newPassword: string;
}): Promise<ChangePasswordResult> {
  const res = await fetch(apiUrl('/api/user/password'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: payload.userId,
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
  userId: number;
  email: string;
}): Promise<ChangeEmailResult> {
  const res = await fetch(apiUrl('/api/user/email'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: payload.userId,
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

export type ChangePositionResult =
  | { ok: true; message: string; position: string | null; changed: boolean }
  | { ok: false; message: string };

export async function changePosition(payload: {
  userId: number;
  position: string;
}): Promise<ChangePositionResult> {
  const res = await fetch(apiUrl('/api/user/position'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: payload.userId,
      position: payload.position,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: { position?: string | null; changed?: boolean };
  };

  if (res.ok && data.success === true) {
    return {
      ok: true,
      message: data.message ?? '직급·직책이 저장되었습니다.',
      position: data.data?.position ?? null,
      changed: data.data?.changed ?? true,
    };
  }

  return {
    ok: false,
    message: data.message ?? '직급·직책 변경에 실패했습니다.',
  };
}