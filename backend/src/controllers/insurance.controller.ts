import { Request, Response } from 'express';
import { predictRisk } from '../services/aiPredict.service';

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

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

// POST /api/insurance/report-pdf — AI PDF proxy (application/pdf)
export const reportPdfInsurance = async (req: Request, res: Response) => {
  try {
    const { 구군, 연령대, 성별, 차종 } = req.body ?? {};
    if (!구군 || !연령대 || !성별 || !차종) {
      return res.status(400).json({
        success: false,
        message: '구군, 연령대, 성별, 차종은 필수입니다.',
      });
    }

    const aiRes = await fetch(`${AI_BASE}/report/ins-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      return res.status(502).json({
        success: false,
        message: 'AI PDF 생성 실패',
        error: detail,
      });
    }

    const buf = Buffer.from(await aiRes.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="ins-consult-report.pdf"',
    );
    return res.send(buf);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'PDF 요청 실패',
      error: String(error),
    });
  }
};