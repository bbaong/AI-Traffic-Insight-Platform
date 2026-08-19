import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import type { users_role } from '../generated/prisma/enums';

export type AccessPayload = {
  sub: string;
  role: users_role;
  typ: 'access';
};

export type RefreshPayload = {
  sub: string;
  jti: string;
  typ: 'refresh';
};

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET이 없습니다.');
  return s;
}

function accessExpiresSec(): number {
  return Math.floor(Number(process.env.JWT_ACCESS_EXPIRATION ?? 900000) / 1000);
}

function refreshExpiresSec(): number {
  return Math.floor(Number(process.env.JWT_REFRESH_EXPIRATION ?? 604800000) / 1000);
}


const KST_MS = 9 * 60 * 60 * 1000;

/** DB DATETIME에 한국 벽시계가 보이게 */
function toMysqlKst(d: Date): Date {
  return new Date(d.getTime() + KST_MS);
}

/** Prisma가 DATETIME을 UTC로 읽은 값을 실제 instant로 */
function fromMysqlKst(d: Date): Date {
  return new Date(d.getTime() - KST_MS);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(userId: bigint, role: users_role): string {
  return jwt.sign(
    { sub: userId.toString(), role, typ: 'access' } satisfies AccessPayload,
    secret(),
    { expiresIn: accessExpiresSec() },
  );
}

export async function issueRefreshToken(userId: bigint): Promise<string> {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: userId.toString(), jti, typ: 'refresh' } satisfies RefreshPayload,
    secret(),
    { expiresIn: refreshExpiresSec() },
  );

  const expiresAt = new Date(Date.now() + refreshExpiresSec() * 1000);
  await prisma.refresh_tokens.create({
    data: {
      user_id: userId,
      token_hash: hashToken(token),
      expires_at: toMysqlKst(expiresAt),
      created_at: toMysqlKst(new Date()),
    },
  });

  return token;
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, secret()) as AccessPayload;
  if (decoded.typ !== 'access') throw new Error('invalid token type');
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const decoded = jwt.verify(token, secret()) as RefreshPayload;
  if (decoded.typ !== 'refresh') throw new Error('invalid token type');
  return decoded;
}

export async function rotateRefreshToken(oldToken: string): Promise<{
  userId: bigint;
  refreshToken: string;
}> {
  const payload = verifyRefreshToken(oldToken);
  const userId = BigInt(payload.sub);
  const oldHash = hashToken(oldToken);

  const row = await prisma.refresh_tokens.findUnique({
    where: { token_hash: oldHash },
  });

  if (!row || row.user_id !== userId) {
    throw new Error('invalid refresh token');
  }
  
  const expired = fromMysqlKst(row.expires_at) < new Date();
  const revoked = row.revoked_at != null;
  if (revoked || expired) {
    throw new Error('invalid refresh token');
  }

  await prisma.refresh_tokens.update({
    where: { token_id: row.token_id },
    data: { revoked_at: toMysqlKst(new Date()) },
  });

  const refreshToken = await issueRefreshToken(userId);
  return { userId, refreshToken };
}

/** POST /api/tokens/revoke — 리프레시 토큰 무효화 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const hash = hashToken(token);
  await prisma.refresh_tokens.updateMany({
    where: { token_hash: hash, revoked_at: null },
    data: { revoked_at: toMysqlKst(new Date()) },
  });
}
