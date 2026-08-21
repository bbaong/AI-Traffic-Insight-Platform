import { Router } from 'express';
import { evaluateDiscountRidersHandler } from '../controllers/discountRider.controller';

const router = Router();

router.post('/evaluate', evaluateDiscountRidersHandler);

export default router;
