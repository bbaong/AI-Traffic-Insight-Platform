import 'dotenv/config';
import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

//bigint string to bigint
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

//지도 데이터 조회
export const getMap = async (req: Request, res: Response) => {
};

