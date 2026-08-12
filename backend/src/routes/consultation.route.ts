import { Router } from 'express';
import {
  saveConsultationHandler,
  getConsultationReportHandler,
} from '../controllers/consultation.controller';

const router = Router();

router.post('/save', saveConsultationHandler);
router.get('/:id/report', getConsultationReportHandler);

export default router;