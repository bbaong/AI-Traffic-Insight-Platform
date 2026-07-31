const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export type ChangePasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/** 비밀번호 변경 */
export async function changePassword(payload: {
  userId: number;
  currentPassword: string;
  newPassword: string;
}): Promise<ChangePasswordResult> {
  const res = await fetch(`${API_BASE}/api/user/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: payload.userId,
      current_password: payload.currentPassword,
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
