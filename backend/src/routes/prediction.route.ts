import { Router } from 'express';
import { getPrediction, predict } from '../controllers/prediction.controller';

const router = Router();

//예측 모델 추론
router.post('/predict', predict);

//예측 결과 조회
router.get('/predictions/:id', getPrediction);

export default router;