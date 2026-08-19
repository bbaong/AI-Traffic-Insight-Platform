//src/controllers/user.Controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { ok, fail, handleRouteError, HttpError} from '../lib/http';
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../services/token.service';

//회원 가입
export const createUsers = async (req: Request, res: Response) => {
  try {
    const { login_id, password, name, role, department_id, org_name='',
      position='', email=''} = req.body;
    
    //유효성 검사
    if (!login_id || !password || !name || !role ) {
      throw new HttpError('모든 필드를 입력해주세요.', 400);
    }

    //id 중복 체크
    const idCheck = await prisma.users.findUnique({
      where: { login_id },
    });
    if (idCheck) {
      throw new HttpError('이미 존재하는 아이디입니다.', 400);
    }

    //비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
      data: { 
        login_id, 
        password_hash: hashedPassword, 
        name, 
        role, 
        department_id, 
        org_name, 
        position, 
        email, 
        created_at: new Date()
      },
    });
    const { password_hash, ...userWithoutPassword } = user;
    return ok(res, userWithoutPassword, 201, { message: '회원 가입 성공' });
  } catch (error) {
    return handleRouteError(res, error, '회원 가입 실패');
  }
};

//로그인 
export const loginUsers = async (req: Request, res: Response) => {
  try {
    const { id, password } = req.body;

    //유효성 검사
    if (!id || !password) {
      throw new HttpError('아이디와 비밀번호를 입력해주세요.', 400);
    }

    //아이디 조회
    const user = await prisma.users.findUnique({
      where: { login_id: id },
    });
    if (!user) {
      throw new HttpError('아이디가 존재하지 않습니다.', 400);
    }
    //비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new HttpError('비밀번호가 일치하지 않습니다.', 400);
    }
    // 비밀번호 검증 성공 후
    const [_, updatedUser] = await prisma.$transaction([
      prisma.user_login_logs.create({
        data: {
          user_id: user.user_id,
          ip_address: req.ip ?? req.socket.remoteAddress ?? null,
        },
      }),
      prisma.users.update({
        where: { user_id: user.user_id },
        data: { last_login_at: new Date() },
      }),
    ]);
    const { password_hash, ...safeUser } = updatedUser;

    const accessToken = signAccessToken(updatedUser.user_id, updatedUser.role);
    const refreshToken = await issueRefreshToken(updatedUser.user_id);

    return ok(
      res,
      { user: safeUser, accessToken, refreshToken },
      200,
      { message: '로그인 성공' },
    );
   
  } catch (error) {
    return handleRouteError(res, error, '로그인 실패');
  }
};

//회원 전체 조회
export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.users.findMany();
    const data = users.map((user) => {
      const { password_hash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    return res.json(data);
  } catch (error) {
    return handleRouteError(res, error, '회원 조회 실패');
  }
};

//id 중복 확인
export const idCheck = async (req: Request, res: Response) => {
  try {
    const { login_id } = req.body;
    const user = await prisma.users.findUnique({
      where: { login_id },
    });
    if (!user) {
      return ok(res, undefined, 200, { message: '아이디 중복 아님' });
    }
    return fail(res, 400, '아이디 중복');
  } catch (error) {
    return handleRouteError(res, error, '아이디 중복 확인 실패');
  }
};

//부서 목록 조회
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await prisma.departments.findMany({
      orderBy: { department_id: 'asc' },
      select: {
        department_id: true,
        department_name: true,
      },
    });
    return res.status(200).json(departments);
  } catch (error) {
    console.error(error);
    return handleRouteError(res, error, '부서 목록 조회 실패');
  }
};

//비밀번호 재확인 (변경 없음)
export const verifyPassword = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { password } = req.body;

    if (userId == null) throw new HttpError('인증이 필요합니다.', 401);
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

    return ok(res, undefined, 200, { message: '비밀번호 확인 완료' });
  } catch (error) {
    return handleRouteError(res, error, '비밀번호 확인 실패');
  }
};

// 이메일 변경 (선택 항목 — 빈 문자열이면 null)
export const changeEmail = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { email } = req.body;

    if (userId == null) {
      throw new HttpError('인증이 필요합니다.', 401);
    }

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
      return ok(res, { email: nextEmail, changed: false }, 200, {
        message: '변경된 내용이 없습니다.',
      });
    }

    const updated = await prisma.users.update({
      where: { user_id: user.user_id },
      data: { email: nextEmail },
    });

    const message =
      prev == null && nextEmail != null
        ? '이메일이 저장되었습니다.'
        : '이메일이 변경되었습니다.';

    return ok(res, { email: updated.email ?? null, changed: true }, 200, {
      message,
    });
  } catch (error) {
    return handleRouteError(res, error, '이메일 변경 실패');
  }
};

//비밀번호 변경
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    const { new_password } = req.body;

    if (userId == null) {
      throw new HttpError('인증이 필요합니다.', 401);
    }
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

    const isSameAsCurrent = await bcrypt.compare(
      new_password,
      user.password_hash,
    );
    if (isSameAsCurrent) {
      throw new HttpError('새 비밀번호는 현재 비밀번호와 달라야 합니다.', 400);
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await prisma.users.update({
      where: { user_id: user.user_id },
      data: { password_hash },
    });

    return ok(res, undefined, 200, { message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    return handleRouteError(res, error, '비밀번호 변경 실패');
  }
};

//토큰 갱신
export const refreshTokens = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      throw new HttpError('refreshToken은 필수입니다.', 400);
    }

    const rotated = await rotateRefreshToken(refreshToken);
    const user = await prisma.users.findUnique({
      where: { user_id: rotated.userId },
    });
    if (!user || !user.is_active) {
      throw new HttpError('사용자를 찾을 수 없습니다.', 401);
    }

    const accessToken = signAccessToken(user.user_id, user.role);
    return ok(res, { accessToken, refreshToken: rotated.refreshToken });
  } catch (error) {
    return handleRouteError(res, error, '토큰 갱신 실패');
  }
};

//로그아웃
export const logoutUsers = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    return ok(res, undefined, 200, { message: '로그아웃 되었습니다.' });
  } catch (error) {
    return handleRouteError(res, error, '로그아웃 실패');
  }
};