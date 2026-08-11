import { Router } from 'express';
import {
  getPrediction,
  predictIns,
  predictGov,
  predictGovHistory,
  predictGovHotspots,
  predictGovReportPdf,
  getGovForecasts,
} from '../controllers/prediction.controller';

const router = Router();

router.post('/predict-ins', predictIns);
router.post('/predict-gov', predictGov);
router.post('/predict-gov-history', predictGovHistory);
router.get('/predict-gov-hotspots', predictGovHotspots);
router.post('/gov-report-pdf', predictGovReportPdf);
router.get('/gov-forecasts', getGovForecasts);

// 예측 결과 조회 (미구현)
router.get('/predictions/:id', getPrediction);

export default router;
