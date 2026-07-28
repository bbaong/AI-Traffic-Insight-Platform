import type { Department } from '../types/signup';

/**
 * 아이디 중복 확인.
 * TODO: GET /api/auth/check-login-id?loginId=... 로 교체
 */
export async function checkLoginId(
  loginId: string,
): Promise<{ available: boolean }> {
  await new Promise((r) => setTimeout(r, 300));
  return { available: !['admin', 'test', 'jhhan'].includes(loginId) };
}

/**
 * 지자체 부서 목록.
 * TODO: GET /api/departments 로 교체
 * departments.contact_phone 은 응답에 포함되더라도 UI에 노출하지 않는다.
 */
export async function fetchDepartments(): Promise<Department[]> {
  await new Promise((r) => setTimeout(r, 300));
  return [
    { departmentId: 1, departmentName: '교통정책과 교통안전팀' },
    { departmentId: 2, departmentName: '교통정책과 교통기획팀' },
    { departmentId: 3, departmentName: '건설교통국 도로과' },
  ];
}
