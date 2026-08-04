import { Router } from 'express';
import { saveConsultationHandler } from '../controllers/consultation.controller';

const router = Router();

router.post('/save', saveConsultationHandler);

export default router;
