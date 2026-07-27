import { Router } from 'express';
import { createUsers, getUsers } from '../controllers/user.controller';

const router = Router();

router.get('/all', getUsers);
router.post('/create', createUsers);

export default router;