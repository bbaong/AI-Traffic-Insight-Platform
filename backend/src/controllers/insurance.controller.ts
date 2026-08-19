import { Request, Response } from 'express';
import { predictRisk } from '../services/aiPredict.service';
import {
  assertInsReportPdfInput,
  buildInsReportPdf,
} from '../services/pdf/insReportPdf.service';
import { ok, handleRouteError, HttpError } from '../lib/http';
import { sendPdfByEmail } from '../services/email.service';

//분석
export const analyzeInsurance = async (req: Request, res: Response) => {
  try {
    const data = await predictRisk(req.body);
    return ok(res, data);
  } catch (error) {
    return handleRouteError(res, error, '분석 실패');
  }
};

//PDF 생성
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

//이메일 발송
export const sendReportPdfInsurance = async (req: Request, res: Response) => {
  try {
    const toEmail = String(req.body.toEmail ?? '').trim();
    assertInsReportPdfInput(req.body);

    if (!toEmail) {
      throw new HttpError('수신 이메일이 필요합니다.', 400);
    }

    const customerName = (req.body.고객명 || '').trim() || '고객';
    const buf = await buildInsReportPdf(req.body);

    await sendPdfByEmail({
      toEmail,
      subject: `[AI Traffic Insight] ${customerName} 고객님의 보험 상담 보고서`,
      text: `안녕하세요, ${customerName} 고객님.\n보험 상담 참고 리포트를 발송해드리오니 확인 부탁드립니다.`,
      filename: `상담보고서_${customerName}.pdf`,
      pdfBuffer: buf,
    });

    return ok(res, { sent: true, to: toEmail });
  } catch (error) {
    return handleRouteError(res, error, '이메일 발송 실패');
  }
};