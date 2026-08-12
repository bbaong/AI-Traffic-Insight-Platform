import { Router } from 'express';
import {
  getPriorityTop,
  getComparison,
  getSuggestions,
  getTrend,
} from '../controllers/gov.controller';

const router = Router();

router.get('/priority-top', getPriorityTop);
router.get('/comparison/:districtId', getComparison);
router.get('/suggestions/:districtId', getSuggestions);
router.get('/trend/:districtId', getTrend);

export default router;
