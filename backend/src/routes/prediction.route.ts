import { Router } from 'express';
import {
  getPrediction,
  predict,
  predictGov,
} from '../controllers/prediction.controller';

const router = Router();

// 보험사 — 기존 위험도 모델
router.post('/predict', predict);

// 지자체 — traffic_accident_model
router.post('/predict/gov', predictGov);

// 예측 결과 조회 (미구현)
router.get('/predictions/:id', getPrediction);

export default router;