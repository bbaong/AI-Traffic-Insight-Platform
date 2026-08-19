import { Router } from 'express';
import {
  changePassword,
  createUsers,
  getDepartments,
  getUsers,
  idCheck,
  loginUsers,
  verifyPassword,
  changeEmail,
} from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { logoutUsers, refreshTokens } from '../controllers/user.controller';

const router = Router();

//회원 가입
//부서 조회
router.get('/departments', getDepartments);
//회원 가입
router.post('/create', createUsers);
//로그인
router.post('/login', loginUsers);
//아이디 중복 조회
router.post('/idCheck', idCheck);
//토큰 갱신
router.post('/refresh', refreshTokens);
//로그아웃
router.post('/logout', logoutUsers);

//회원 정보 조회
router.use(requireAuth);
//모든 회원 조회
router.get('/all', getUsers);
//비밀번호 확인
router.post('/verify-password', verifyPassword);
//비밀번호 변경
router.patch('/password', changePassword);
//이메일 변경
router.patch('/email', changeEmail);

export default router;