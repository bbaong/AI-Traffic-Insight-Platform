import type { UserRole } from '../../../shared/types/auth';

export type { UserRole } from '../../../shared/types/auth';

export interface RoleMeta {
  label: string;
  description: string;
  tags: string[];
  icon: string;
  accent: 'teal' | 'amber';
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
  ROLE_A: {
    label: '지자체',
    description:
      '관할 시군구의 사고 위험도와 우선점검 대상을 확인하고\n행정 참고 리포트를 만듭니다.',
    tags: ['위험도 지도', '우선점검 순위'],
    icon: 'building-bank',
    accent: 'teal',
  },
  ROLE_B: {
    label: '보험사',
    description:
      '고객 조건별 사고 위험 점수와 중상 확률을 산출하고\n상담 참고 자료를 받습니다.',
    tags: ['위험 점수', '상담 리포트'],
    icon: 'shield-half',
    accent: 'amber',
  },
};

export function isUserRole(value: string | null): value is UserRole {
  return value === 'ROLE_A' || value === 'ROLE_B';
}

export interface Department {
  departmentId: number;
  departmentName: string;
}

export interface SignupGovPayload {
  role: 'ROLE_A';
  loginId: string;
  password: string;
  name: string;
  departmentId: number;
  position?: string;
  email?: string;
}

export interface SignupInsPayload {
  role: 'ROLE_B';
  loginId: string;
  password: string;
  name: string;
  orgName: string;
  position?: string;
  email?: string;
}

