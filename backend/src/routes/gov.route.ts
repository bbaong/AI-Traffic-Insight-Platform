import { Router } from 'express';
import {
  getPriorityTop,
  getComparison,
  getSuggestions,
  getTrend,
  getRegionCompareHandler,
} from '../controllers/gov.controller';

const router = Router();

router.get('/priority-top', getPriorityTop);
router.get('/comparison/:districtId', getComparison);
router.get('/suggestions/:districtId', getSuggestions);
router.get('/trend/:districtId', getTrend);
router.get('/region-compare', getRegionCompareHandler);

export default router;
