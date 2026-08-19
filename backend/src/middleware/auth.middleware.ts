import type { NextFunction, Request, Response } from 'express';
import { fail } from '../lib/http';
import { verifyAccessToken } from '../services/token.service';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return fail(res, 401, '인증이 필요합니다.');
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: BigInt(payload.sub),
      role: payload.role,
    };
    return next();
  } catch {
    return fail(res, 401, '액세스 토큰이 만료되었거나 유효하지 않습니다.');
  }
}