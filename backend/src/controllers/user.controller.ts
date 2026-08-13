//src/controllers/user.Controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';

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
    return res.status(200).json({
      success: true,
      message: '로그인 성공',
      data: safeUser,
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

//비밀번호 재확인 (변경 없음)
export const verifyPassword = async (req: Request, res: Response) => {
  try {
    const { user_id, password } = req.body;

    if (user_id == null || !password) {
      return res.status(400).json({
        success: false,
        message: 'user_id, password는 필수입니다.',
      });
    }

    const user = await prisma.users.findUnique({
      where: { user_id: BigInt(user_id) },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '비밀번호가 일치하지 않습니다.',
      });
    }

    return res.status(200).json({
      success: true,
      message: '비밀번호 확인 완료',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: '비밀번호 확인 실패',
    });
  }
};

// 이메일 변경 (선택 항목 — 빈 문자열이면 null)
export const changeEmail = async (req: Request, res: Response) => {
  try {
    const { user_id, email } = req.body;

    if (user_id == null) {
      return res.status(400).json({
        success: false,
        message: 'user_id는 필수입니다.',
      });
    }

    const raw = typeof email === 'string' ? email.trim() : '';
    const nextEmail = raw === '' ? null : raw;

    if (nextEmail != null) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail);
      if (!ok) {
        return res.status(400).json({
          success: false,
          message: '이메일 형식이 올바르지 않습니다.',
        });
      }
    }

    const user = await prisma.users.findUnique({
      where: { user_id: BigInt(user_id) },
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    const prev = user.email?.trim() || null;
    if (prev === nextEmail) {
      return res.status(200).json({
        success: true,
        message: '변경된 내용이 없습니다.',
        data: { email: nextEmail, changed: false },
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

    return res.status(200).json({
      success: true,
      message,
      data: { email: updated.email ?? null, changed: true },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: '이메일 변경 실패',
    });
  }
};

//비밀번호 변경
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { user_id, new_password } = req.body;

    if (user_id == null || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'user_id, new_password는 필수입니다.',
      });
    }

    if (typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호는 8자 이상이어야 합니다.',
      });
    }

    const user = await prisma.users.findUnique({
      where: { user_id: BigInt(user_id) },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      });
    }

    const isSameAsCurrent = await bcrypt.compare(
      new_password,
      user.password_hash,
    );
    if (isSameAsCurrent) {
      return res.status(400).json({
        success: false,
        message: '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
      });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await prisma.users.update({
      where: { user_id: user.user_id },
      data: { password_hash },
    });

    return res.status(200).json({
      success: true,
      message: '비밀번호가 변경되었습니다.',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: '비밀번호 변경 실패',
    });
  }
};

