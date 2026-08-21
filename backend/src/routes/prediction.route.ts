import { Router } from 'express';
import {
  predictIns,
  predictGov,
  predictGovHistory,
  predictGovHotspots,
  predictGovReportPdf,
  sendGovReportPdf,
  getGovForecasts,
} from '../controllers/prediction.controller';

const router = Router();

//사고예측 //http://localhost:5000/api/prediction/predict-ins
router.post('/predict-ins', predictIns);

//사고예측 //http://localhost:5000/api/prediction/predict-gov
router.post('/predict-gov', predictGov);

//사고예측 기록 //http://localhost:5000/api/prediction/predict-gov-history
router.post('/predict-gov-history', predictGovHistory);

//사고예측 핫스폿 //http://localhost:5000/api/prediction/predict-gov-hotspots
router.get('/predict-gov-hotspots', predictGovHotspots);

//행정 참고 보고서 PDF 생성 //http://localhost:5000/api/prediction/gov-report-pdf
router.post('/gov-report-pdf', predictGovReportPdf);

//행정 참고 보고서 PDF 이메일 발송 //http://localhost:5000/api/prediction/gov-report-pdf/email
router.post('/gov-report-pdf/email', sendGovReportPdf);

//행정 예측 예보 //http://localhost:5000/api/prediction/gov-forecasts
router.get('/gov-forecasts', getGovForecasts);

export default router;
