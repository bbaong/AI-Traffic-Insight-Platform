import { MOCK_USERS } from '../mocks/users.mock';
import type { LoginPayload, LoginResult } from '../types/auth';

/**
 * 로그인.
 * TODO: 실제 POST /auth/login 으로 교체
 */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  await new Promise((r) => setTimeout(r, 400));

  const found = MOCK_USERS.find((u) => u.loginId === payload.loginId);

  // 보안: 아이디 존재 여부를 노출하지 않기 위해
  //       아이디 불일치와 비번 불일치를 같은 INVALID 로 통일
  if (!found || found.password !== payload.password) {
    return { ok: false, reason: 'INVALID' };
  }

  if (!found.isActive) {
    return { ok: false, reason: 'INACTIVE' };
  }

  return {
    ok: true,
    user: {
      userId: found.userId,
      name: found.name,
      role: found.role,
    },
  };
}
