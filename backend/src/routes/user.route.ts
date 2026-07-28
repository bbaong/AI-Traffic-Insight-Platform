import { Router } from 'express';
import { createUsers, getUsers, loginUsers } from '../controllers/user.controller';

const router = Router();

router.get('/all', getUsers);
router.post('/create', createUsers);
router.post('/login', loginUsers);

export default router;