import { Router } from 'express';
import {
  changePassword,
  createUsers,
  getDepartments,
  getUsers,
  idCheck,
  loginUsers,
} from '../controllers/user.controller';

const router = Router();

router.get('/all', getUsers);
router.get('/departments', getDepartments);
router.post('/create', createUsers);
router.post('/login', loginUsers);
router.post('/idCheck', idCheck);
router.patch('/password', changePassword);

export default router;