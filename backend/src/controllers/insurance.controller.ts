import { Request, Response } from 'express';
import { predictRisk } from '../services/aiPredict.service';

// POST /api/insurance/analyze — DB 쓰기 없음
export const analyzeInsurance = async (req: Request, res: Response) => {
  try {
    const data = await predictRisk(req.body);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: '분석 실패' });
  }
};
