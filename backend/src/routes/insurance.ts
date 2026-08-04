import { Router } from 'express';
import { analyzeInsurance } from '../controllers/insurance.controller';

const router = Router();

router.post('/analyze', analyzeInsurance);

export default router;
