import { Router } from 'express';
import {
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

export default router;
