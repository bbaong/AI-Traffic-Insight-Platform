import { Request, Response } from 'express';
import { saveConsultation } from '../services/consultationSave.service';

// POST /api/consultations/save — 유일한 DB 쓰기
export const saveConsultationHandler = async (req: Request, res: Response) => {
  try {
    const data = await saveConsultation(req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '상담 저장 실패',
    });
  }
};


export const predictRiskHandler = async (req: Request, res: Response) => {
  try {
    const data = await saveConsultation(req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '상담 저장 실패',
    });
  }
};