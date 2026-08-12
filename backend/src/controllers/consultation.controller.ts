import { Request, Response } from 'express';
import { saveConsultation } from '../services/consultationSave.service';
import { getConsultationReport } from '../services/consultationReport.service';

// POST /api/consultations/save
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

// GET /api/consultations/:id/report
export const getConsultationReportHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const raw = req.params.id;
    if (!/^\d+$/.test(String(raw))) {
      return res.status(400).json({
        success: false,
        message: 'consultation id가 올바르지 않습니다.',
      });
    }

    const data = await getConsultationReport(BigInt(String(raw)));
    if (data == null) {
      return res.status(404).json({
        success: false,
        message: '상담을 찾을 수 없습니다.',
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: '리포트 조회 실패',
    });
  }
};