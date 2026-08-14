import type {
  Department,
  SignupGovPayload,
  SignupInsPayload,
} from '../types/signup';
import { apiUrl } from '../../../shared/api/http';

export type SignupResult =
  | { ok: true }
  | { ok: false; message: string };

/** 아이디 중복 확인 */
export async function checkLoginId(
  loginId: string,
): Promise<{ available: boolean }> {
  const res = await fetch(apiUrl('/api/user/idCheck'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login_id: loginId }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
  };

  if (res.ok && data.success === true) {
    return { available: true };
  }

  if (res.status === 400 && data.success === false) {
    return { available: false };
  }

  throw new Error('checkLoginId failed');
}

/** departments 테이블 목록 */
export async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch(apiUrl('/api/user/departments'));

  if (!res.ok) {
    throw new Error('fetchDepartments failed');
  }

  const data = (await res.json()) as Array<{
    department_id: number;
    department_name: string;
  }>;

  // snake_case → UI용 camelCase
  return data.map((d) => ({
    departmentId: d.department_id,
    departmentName: d.department_name,
  }));
}

/** 지자체 회원가입 */
export async function signupGov(
  payload: SignupGovPayload,
): Promise<SignupResult> {
  return signupRequest({
    login_id: payload.loginId,
    password: payload.password,
    name: payload.name,
    role: payload.role,
    department_id: payload.departmentId,
    org_name: null,
    position: payload.position ?? null,
    email: payload.email ?? null,
  });
}

export async function signupIns(
  payload: SignupInsPayload,
): Promise<SignupResult> {
  return signupRequest({
    login_id: payload.loginId,
    password: payload.password,
    name: payload.name,
    role: payload.role,
    department_id: null,
    org_name: payload.orgName,
    position: payload.position ?? null,
    email: payload.email ?? null,
  });
}

/** 회원가입 요청 */
async function signupRequest(body: Record<string, unknown>): Promise<SignupResult> {
  // 회원가입 요청
  const res = await fetch(apiUrl('/api/user/create'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // 회원가입 응답
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    error?: string;
  };

  // 회원가입 실패 처리
  if (!res.ok || data.success === false) {
    return {
      ok: false,
      message: data.error ?? data.message ?? '회원가입에 실패했습니다.',
    };
  }

  // 회원가입 성공 처리
  return { ok: true };
}