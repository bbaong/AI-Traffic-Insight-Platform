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

const router = Router();

router.get('/all', getUsers);
router.get('/departments', getDepartments);
router.post('/create', createUsers);
router.post('/login', loginUsers);
router.post('/idCheck', idCheck);
router.post('/verify-password', verifyPassword);
router.patch('/password', changePassword);
router.patch('/email', changeEmail);

export default router;