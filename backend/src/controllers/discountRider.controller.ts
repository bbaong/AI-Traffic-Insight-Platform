import { Request, Response } from 'express';
import { evaluateDiscountRiders } from '../services/discountRider.service';

// POST /api/discount-riders/evaluate — DB 쓰기 없음
export const evaluateDiscountRidersHandler = async (req: Request, res: Response) => {
  try {
    const data = evaluateDiscountRiders(req.body);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: '특약 판정 실패' });
  }
};
