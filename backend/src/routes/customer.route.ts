import { Router } from 'express';
import {
  getCustomers,
  getCustomerConsultations,
} from '../controllers/customer.controller';

const router = Router();

router.get('/', getCustomers);
router.get('/:id/consultations', getCustomerConsultations);

export default router;
