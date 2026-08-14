import { Request, Response } from 'express';
import { ok, fail } from '../lib/http';
import {
  AiHttpError,
  predictRisk,
  fetchInsReportPdf,
} from '../services/aiPredict.service';

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

// POST /api/insurance/report-pdf — AI PDF proxy (application/pdf)
export const reportPdfInsurance = async (req: Request, res: Response) => {
  try {
    const {
      구군,
      연령대,
      성별,
      차종,
      예측등급,
      위험도,
      담보추천,
    } = req.body ?? {};
    if (!구군 || !연령대 || !성별 || !차종) {
      return fail(res, 400, '구군, 연령대, 성별, 차종은 필수입니다.');
    }
    if (예측등급 == null || 예측등급 === '' || 위험도 == null || 위험도 === '') {
      return fail(res, 400, '예측등급, 위험도는 필수입니다. (미리보기 draft를 보내 주세요)');
    }
    if (!Array.isArray(담보추천)) {
      return fail(res, 400, '담보추천 배열이 필요합니다.');
    }

    const buf = await fetchInsReportPdf(req.body);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="ins-consult-report.pdf"',
    );
    return res.send(buf);
  } catch (error) {
    console.error(error);
    if (error instanceof AiHttpError) {
      return fail(res, error.status, 'AI PDF 생성 실패', error.detail);
    }
    return fail(res, 500, 'PDF 요청 실패', error);
  }
};
