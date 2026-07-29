import { Router } from 'express';
import { getMap } from '../controllers/analytics.controller';

const router = Router();

//지도 데이터 조회
//GET /analytics/map
router.get('/analytics/map', getMap);

export default router;