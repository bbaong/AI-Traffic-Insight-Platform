import { Request, Response } from 'express';
import { predictRisk } from '../services/aiPredict.service';
import {
  assertInsReportPdfInput,
  buildInsReportPdf,
} from '../services/pdf/insReportPdf.service';
import { ok, handleRouteError} from '../lib/http';

// POST /api/insurance/analyze — DB 쓰기 없음
export const analyzeInsurance = async (req: Request, res: Response) => {
  try {
    const data = await predictRisk(req.body);
    return ok(res, data);
  } catch (error) {
    return handleRouteError(res, error, '분석 실패');
  }
};

// POST /api/insurance/report-pdf — Backend Playwright PDF (application/pdf)
export const reportPdfInsurance = async (req: Request, res: Response) => {
  try {
    assertInsReportPdfInput(req.body);
    const buf = await buildInsReportPdf(req.body);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="ins-consult-report.pdf"',
    );
    return res.send(buf);
  } catch (error) {
    return handleRouteError(res, error, 'PDF 생성 실패');
  }
};