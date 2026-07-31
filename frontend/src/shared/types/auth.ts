export type UserRole = 'ROLE_A' | 'ROLE_B';

export interface MockUser {
  userId: number;
  loginId: string;
  /** 목업 전용 평문. 실제 DB는 password_hash */
  password: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface LoginPayload {
  loginId: string;
  password: string;
}

export type AuthUser = {
  userId: number;
  loginId: string;
  name: string;
  role: UserRole;
  position: string | null;
  email: string | null;
  departmentId: number | null;
  departmentName: string | null; // 없으면 null (추후 API)
  orgName: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
};

export type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: 'INVALID' | 'INACTIVE' };
