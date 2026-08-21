import { Router } from 'express';
import {
  getCustomers,
  getCustomerConsultations,
  hideCustomerHandler,
} from '../controllers/customer.controller';

const router = Router();

router.get('/', getCustomers);
router.patch('/:id/hide', hideCustomerHandler);
router.get('/:id/consultations', getCustomerConsultations);

export default router;
