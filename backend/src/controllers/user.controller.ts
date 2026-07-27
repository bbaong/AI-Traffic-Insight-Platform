//src/controllers/user.Controller.ts
import 'dotenv/config';
import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

//bigint string to bigint
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

//회원 가입
export const createUsers = async (req: Request, res: Response) => {
  try {
    const { login_id, password, name, role, department_id='', org_name='',
      position='', email=''} = req.body;
    
    //유효성 검사
    if (!login_id || !password || !name || !role ) {
      return res.status(400).json({ 
        success: false,
        error: '모든 필드를 입력해주세요.' });
    }

    //login_id 중복 체크
    const login_idCheck = await prisma.users.findUnique({
      where: { login_id },
    });
    if (login_idCheck) {
      return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    }

    const user = await prisma.users.create({
      data: { 
        login_id, 
        password_hash: password, 
        name, 
        role, 
        department_id, 
        org_name, 
        position, 
        email, 
        created_at: new Date()
      },
    });
    return res.status(201).json({
      success: true,
      message: '회원 가입 성공',
      data: user
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '회원 가입 실패' });
  }
};

//회원 전체 조회
export const getUsers = async (req: Request, res: Response) => {
  const users = await prisma.users.findMany();
  res.json(users);
};
