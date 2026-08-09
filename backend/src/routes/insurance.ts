import { Router } from 'express';
import {
  analyzeInsurance,
  reportPdfInsurance,
} from '../controllers/insurance.controller';

const router = Router();

router.post('/analyze', analyzeInsurance);
router.post('/report-pdf', reportPdfInsurance);

export default router;