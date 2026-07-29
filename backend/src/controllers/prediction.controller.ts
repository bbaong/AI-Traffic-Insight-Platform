import 'dotenv/config';
import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

//bigint string to bigint
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

//예측 모델 추론
export const predict = async (req: Request, res: Response) => {

};

//예측 결과 조회
export const getPrediction = async (req: Request, res: Response) => {

};
