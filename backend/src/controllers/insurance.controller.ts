import { Request, Response } from 'express';
import { ok, fail } from '../lib/http';
import { AiHttpError, predictRisk } from '../services/aiPredict.service';
import {
  assertInsReportPdfInput,
  buildInsReportPdf,
} from '../services/pdf/insReportPdf.service';

// POST /api/insurance/analyze — DB 쓰기 없음
export const analyzeInsurance = async (req: Request, res: Response) => {
  try {
    const data = await predictRisk(req.body);
    return ok(res, data);
  } catch (error) {
    console.error(error);
    if (error instanceof AiHttpError) {
      return fail(res, error.status, '분석 실패', error.detail);
    }
    return fail(res, 500, '분석 실패');
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
    console.error(error);
    const message =
      error instanceof Error ? error.message : 'PDF 요청 실패';
    // 검증 실패 메시지는 400
    if (
      message.includes('필수') ||
      message.includes('필요합니다') ||
      message.includes('draft')
    ) {
      return fail(res, 400, message);
    }
    return fail(res, 500, 'PDF 생성 실패', error);
  }
};