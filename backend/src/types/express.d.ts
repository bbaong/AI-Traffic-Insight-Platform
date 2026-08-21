import type { users_role } from '../generated/prisma/enums';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: bigint;
        role: users_role;
      };
    }
  }
}

export {};