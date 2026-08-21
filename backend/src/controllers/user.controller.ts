import { Request, Response } from 'express';
import { ok, fail, handleRouteError, HttpError } from '../lib/http';
import {
  changeUserEmail,
  changeUserPassword,
  changeUserPosition,
  checkLoginId,
  createUser,
  listDepartments,
  listUsers,
  loginUser,
  logoutUser,
  refreshUserTokens,
  verifyUserPassword,
} from '../services/user.service';

function requireUserId(req: Request): bigint {
  if (req.auth?.userId == null) {
    throw new HttpError('인증이 필요합니다.', 401);
  }
  return req.auth.userId;
}

export const createUsers = async (req: Request, res: Response) => {
  try {
    const data = await createUser(req.body);
    return ok(res, data, 201, { message: '회원 가입 성공' });
  } catch (error) {
    return handleRouteError(res, error, '회원 가입 실패');
  }
};

export const loginUsers = async (req: Request, res: Response) => {
  try {
    const { id, password } = req.body;
    const ipAddress = req.ip ?? req.socket.remoteAddress ?? null;
    const data = await loginUser(id, password, ipAddress);
    return ok(res, data, 200, { message: '로그인 성공' });
  } catch (error) {
    return handleRouteError(res, error, '로그인 실패');
  }
};

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const data = await listUsers();
    return ok(res, data, 200);
  } catch (error) {
    return handleRouteError(res, error, '회원 조회 실패');
  }
};

export const getDepartments = async (_req: Request, res: Response) => {
  try {
    const departments = await listDepartments();
    return ok(res, departments, 200);
  } catch (error) {
    return handleRouteError(res, error, '부서 목록 조회 실패');
  }
};

export const idCheck = async (req: Request, res: Response) => {
  try {
    const { login_id } = req.body;
    const available = await checkLoginId(login_id);
    if (available) {
      return ok(res, undefined, 200, { message: '아이디 중복 아님' });
    }
    return fail(res, 400, '아이디 중복');
  } catch (error) {
    return handleRouteError(res, error, '아이디 중복 확인 실패');
  }
};

export const verifyPassword = async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(req);
    const { password } = req.body;
    await verifyUserPassword(userId, password);
    return ok(res, undefined, 200, { message: '비밀번호 확인 완료' });
  } catch (error) {
    return handleRouteError(res, error, '비밀번호 확인 실패');
  }
};

export const changeEmail = async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(req);
    const result = await changeUserEmail(userId, req.body.email);
    return ok(res, { email: result.email, changed: result.changed }, 200, {
      message: result.message,
    });
  } catch (error) {
    return handleRouteError(res, error, '이메일 변경 실패');
  }
};

export const changePosition = async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(req);
    const result = await changeUserPosition(userId, req.body.position);
    return ok(
      res,
      { position: result.position, changed: result.changed },
      200,
      { message: result.message },
    );
  } catch (error) {
    return handleRouteError(res, error, '직급·직책 변경 실패');
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(req);
    const { new_password } = req.body;
    await changeUserPassword(userId, new_password);
    return ok(res, undefined, 200, { message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    return handleRouteError(res, error, '비밀번호 변경 실패');
  }
};

export const refreshTokens = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      throw new HttpError('refreshToken은 필수입니다.', 400);
    }
    const data = await refreshUserTokens(refreshToken);
    return ok(res, data);
  } catch (error) {
    return handleRouteError(res, error, '토큰 갱신 실패');
  }
};

export const logoutUsers = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    await logoutUser(refreshToken);
    return ok(res, undefined, 200, { message: '로그아웃 되었습니다.' });
  } catch (error) {
    return handleRouteError(res, error, '로그아웃 실패');
  }
};