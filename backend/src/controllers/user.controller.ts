//src/controllers/user.Controller.ts
import 'dotenv/config';
import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

//bigint string to bigint
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

//회원 가입
export const createUsers = async (req: Request, res: Response) => {
  try {
    const { login_id, password, name, role, department_id, org_name='',
      position='', email=''} = req.body;
    
    //유효성 검사
    if (!login_id || !password || !name || !role ) {
      return res.status(400).json({ 
        success: false,
        error: '모든 필드를 입력해주세요.' });
    }

    //id 중복 체크
    const idCheck = await prisma.users.findUnique({
      where: { login_id },
    });
    if (idCheck) {
      return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
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
    return res.status(201).json({
      success: true,
      message: '회원 가입 성공',
      data: userWithoutPassword
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '회원 가입 실패' });
  }
};

//로그인 
export const loginUsers = async (req: Request, res: Response) => {
  try {
    const { id, password } = req.body;

    //유효성 검사
    if (!id || !password) {
      return res.status(400).json({ 
        success: false,
        message: '아이디와 비밀번호를 입력해주세요.',
        error: 'id, password 필수 입력' });
    }

    //아이디 조회
    const user = await prisma.users.findUnique({
      where: { login_id: id },
    });
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: '아이디가 존재하지 않습니다.',
        error: 'id 존재하지 않음' });
    }
    //비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: '비밀번호가 일치하지 않습니다.',
        error: 'password 일치하지 않음' });
    }
    //로그인 성공
    return res.status(200).json({ 
      success: true, 
      message: '로그인 성공',
      data: user
    });
   
  } catch (error) {
    console.error(error);
    return res.status(500).json({ 
      success: false, 
      message: '로그인 실패',
      error: '로그인 실패' });
  }
};

//회원 전체 조회
export const getUsers = async (req: Request, res: Response) => {
  const users = await prisma.users.findMany();
  res.json(users.map((user: any) => {
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }));
};

//id 중복 확인
export const idCheck = async (req: Request, res: Response) => {
  const { login_id } = req.body;
  const user = await prisma.users.findUnique({
    where: { login_id: login_id },
  });
  if (!user) {
    return res.status(200).json({ success: true, message: '아이디 중복 아님' });
  }
  return res.status(400).json({ success: false, message: '아이디 중복' });
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
    return res.status(500).json({ error: '부서 목록 조회 실패' });
  }
};

