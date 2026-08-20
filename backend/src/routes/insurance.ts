import { Router } from 'express';
import {
  analyzeInsurance,
  reportPdfInsurance,
  sendReportPdfInsurance,
  chatInsurance,
} from '../controllers/insurance.controller';

const router = Router();

router.post('/chat', chatInsurance);

//분석 //http://localhost:5000/api/insurance/analyze
router.post('/analyze', analyzeInsurance);
//PDF 생성 //http://localhost:5000/api/insurance/report-pdf
router.post('/report-pdf', reportPdfInsurance);
//이메일 발송 //http://localhost:5000/api/insurance/report-pdf/email
router.post('/report-pdf/email', sendReportPdfInsurance);

export default router;