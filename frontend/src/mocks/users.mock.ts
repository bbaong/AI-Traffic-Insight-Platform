import type { MockUser } from '../shared/types/auth';

// 테스트 계정
//   지자체: gov_daegu / test1234  → /dashboard/gov 로 분기
//   보험사: ins_sample / test1234 → /dashboard/insurance 로 분기
//   비활성: inactive / test1234   → 로그인 거부 (INACTIVE)

export const MOCK_USERS: MockUser[] = [
  {
    userId: 1,
    loginId: 'gov_daegu',
    password: 'test1234',
    name: '한지훈',
    role: 'ROLE_A',
    isActive: true,
  },
  {
    userId: 2,
    loginId: 'ins_sample',
    password: 'test1234',
    name: '김서연',
    role: 'ROLE_B',
    isActive: true,
  },
  {
    userId: 3,
    loginId: 'inactive',
    password: 'test1234',
    name: '비활성계정',
    role: 'ROLE_A',
    isActive: false,
  },
];
