import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { HttpError } from '../lib/http';
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from './token.service';
import type { users_role } from '../generated/prisma/enums';

function omitPassword<T extends { password_hash: string }>(user: T) {
  const { password_hash: _, ...rest } = user;
  return rest;
}

function isUserRole(value: unknown): value is users_role {
  return value === 'ROLE_A' || value === 'ROLE_B';
}
export async function createUser(input: {
  login_id: string;
  password: string;
  name: string;
  role: unknown;
  department_id?: unknown;
  org_name?: string;
  position?: string;
  email?: string;
}) {
  const {
    login_id,
    password,
    name,
    role,
    department_id,
    org_name = '',
    position = '',
    email = '',
  } = input;

  if (!login_id || !password || !name || !role) {
    throw new HttpError('모든 필드를 입력해주세요.', 400);
  }

  const idCheck = await prisma.users.findUnique({
    where: { login_id },
  });
  if (idCheck) {
    throw new HttpError('이미 존재하는 아이디입니다.', 400);
  }

  if (!isUserRole(role)) {
    throw new HttpError('role이 올바르지 않습니다.', 400);
  }
  
  const departmentId =
    department_id == null || department_id === ''
      ? null
      : Number(department_id);
  if (departmentId != null && !Number.isInteger(departmentId)) {
    throw new HttpError('department_id가 올바르지 않습니다.', 400);
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.users.create({
    data: {
      login_id,
      password_hash: hashedPassword,
      name,
      role,                 // users_role
      department_id: departmentId,  // number | null
      org_name,
      position,
      email,
      created_at: new Date(),
    },
  });


  return omitPassword(user);
}

export async function loginUser(
  id: string,
  password: string,
  ipAddress: string | null,
) {
  if (!id || !password) {
    throw new HttpError('아이디와 비밀번호를 입력해주세요.', 400);
  }

  const user = await prisma.users.findUnique({
    where: { login_id: id },
  });
  if (!user) {
    throw new HttpError('아이디가 존재하지 않습니다.', 400);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new HttpError('비밀번호가 일치하지 않습니다.', 400);
  }

  const [, updatedUser] = await prisma.$transaction([
    prisma.user_login_logs.create({
      data: {
        user_id: user.user_id,
        ip_address: ipAddress,
      },
    }),
    prisma.users.update({
      where: { user_id: user.user_id },
      data: { last_login_at: new Date() },
    }),
  ]);

  const accessToken = signAccessToken(updatedUser.user_id, updatedUser.role);
  const refreshToken = await issueRefreshToken(updatedUser.user_id);

  return {
    user: omitPassword(updatedUser),
    accessToken,
    refreshToken,
  };
}

export async function listUsers() {
  const users = await prisma.users.findMany();
  return users.map(omitPassword);
}

export async function checkLoginId(login_id: string) {
  const user = await prisma.users.findUnique({
    where: { login_id },
  });
  return user == null;
}

export async function listDepartments() {
  return prisma.departments.findMany({
    orderBy: { department_id: 'asc' },
    select: {
      department_id: true,
      department_name: true,
    },
  });
}

export async function verifyUserPassword(userId: bigint, password: string) {
  if (!password) throw new HttpError('password는 필수입니다.', 400);

  const user = await prisma.users.findUnique({
    where: { user_id: userId },
  });
  if (!user) {
    throw new HttpError('사용자를 찾을 수 없습니다.', 404);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new HttpError('비밀번호가 일치하지 않습니다.', 401);
  }
}

export async function changeUserEmail(userId: bigint, email: unknown) {
  const raw = typeof email === 'string' ? email.trim() : '';
  const nextEmail = raw === '' ? null : raw;

  if (nextEmail != null) {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail);
    if (!valid) {
      throw new HttpError('이메일 형식이 올바르지 않습니다.', 400);
    }
  }

  const user = await prisma.users.findUnique({
    where: { user_id: userId },
  });
  if (!user) {
    throw new HttpError('사용자를 찾을 수 없습니다.', 404);
  }

  const prev = user.email?.trim() || null;
  if (prev === nextEmail) {
    return { email: nextEmail, changed: false as const, message: '변경된 내용이 없습니다.' };
  }

  const updated = await prisma.users.update({
    where: { user_id: user.user_id },
    data: { email: nextEmail },
  });

  const message =
    prev == null && nextEmail != null
      ? '이메일이 저장되었습니다.'
      : '이메일이 변경되었습니다.';

  return { email: updated.email ?? null, changed: true as const, message };
}

export async function changeUserPassword(userId: bigint, new_password: unknown) {
  if (!new_password) {
    throw new HttpError('new_password는 필수입니다.', 400);
  }
  if (typeof new_password !== 'string' || new_password.length < 8) {
    throw new HttpError('새 비밀번호는 8자 이상이어야 합니다.', 400);
  }

  const user = await prisma.users.findUnique({
    where: { user_id: userId },
  });
  if (!user) {
    throw new HttpError('사용자를 찾을 수 없습니다.', 404);
  }

  const isSameAsCurrent = await bcrypt.compare(new_password, user.password_hash);
  if (isSameAsCurrent) {
    throw new HttpError('새 비밀번호는 현재 비밀번호와 달라야 합니다.', 400);
  }

  const password_hash = await bcrypt.hash(new_password, 10);
  await prisma.users.update({
    where: { user_id: user.user_id },
    data: { password_hash },
  });
}

export async function refreshUserTokens(refreshToken: string) {
  const rotated = await rotateRefreshToken(refreshToken);
  const user = await prisma.users.findUnique({
    where: { user_id: rotated.userId },
  });
  if (!user || !user.is_active) {
    throw new HttpError('사용자를 찾을 수 없습니다.', 401);
  }

  const accessToken = signAccessToken(user.user_id, user.role);
  return { accessToken, refreshToken: rotated.refreshToken };
}

export async function logoutUser(refreshToken?: string) {
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
}