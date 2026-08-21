import { Request, Response } from 'express';
import { evaluateDiscountRiders } from '../services/discountRider.service';
import { ok, handleRouteError } from '../lib/http';

/* POST /api/discount-riders/evaluate — DB 쓰기 없음 */
export const evaluateDiscountRidersHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const data = evaluateDiscountRiders(req.body);
    return ok(res, data);
  } catch (error) {
    return handleRouteError(res, error, '특약 판정 실패');
  }
};
