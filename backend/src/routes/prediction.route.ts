import { Router } from 'express';
import { getPrediction, predictIns, predictGov } from '../controllers/prediction.controller';

const router = Router();

router.post('/predict-ins', predictIns);
router.post('/predict-gov', predictGov);

// 예측 결과 조회 (미구현)
router.get('/predictions/:id', getPrediction);

export default router;