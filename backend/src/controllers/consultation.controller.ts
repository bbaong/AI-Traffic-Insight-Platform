import { Request, Response } from 'express';
import { saveConsultation } from '../services/consultationSave.service';
import { getConsultationReport } from '../services/consultationReport.service';
import { ok, handleRouteError, HttpError} from '../lib/http';

// POST /api/consultations/save
export const saveConsultationHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (userId == null) {
      throw new HttpError('인증이 필요합니다.', 401);
    }
    const data = await saveConsultation(req.body, userId);
    return ok(res, data, 201);
  } catch (error) {
    return handleRouteError(res, error, '상담 저장 실패');
  }
};

// GET /api/consultations/:id/report
export const getConsultationReportHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.auth?.userId;
    if (userId == null) {
      throw new HttpError('인증이 필요합니다.', 401);
    }

    const raw = req.params.id;
    if (!/^\d+$/.test(String(raw))) {
      throw new HttpError('consultation id가 올바르지 않습니다.', 400);
    }

    const data = await getConsultationReport(BigInt(String(raw)), userId);
    if (data == null) {
      throw new HttpError('상담을 찾을 수 없습니다.', 404);
    }

    return ok(res, data, 200);
  } catch (error) {
    return handleRouteError(res, error, '리포트 조회 실패');
  }
};