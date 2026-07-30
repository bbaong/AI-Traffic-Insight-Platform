import 'dotenv/config';
import { Request, Response } from 'express';

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

export const predict = async (req: Request, res: Response) => {
  try {
    const { 구군, 연령대, 성별, 차종, 주야, variant } = req.body;

    if (!구군 || !연령대 || !성별 || !차종) {
      return res.status(400).json({
        success: false,
        message: '구군, 연령대, 성별, 차종은 필수입니다.',
      });
    }

    const aiRes = await fetch(`${AI_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        구군,
        연령대,
        성별,
        차종,
        주야: 주야 ?? '주간',
        variant: variant ?? 'weighted',
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      return res.status(502).json({
        success: false,
        message: 'AI 서버 추론 실패',
        error: detail,
      });
    }

    const data = await aiRes.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: '예측 요청 실패',
      error: String(error),
    });
  }
};

/** 지자체용 — traffic_accident_model.pkl */
export const predictGov = async (req: Request, res: Response) => {
  try {
    const {
      지역,
      연령대 = '51-60세',
      성별 = '남',
      차종 = '승용',
      주야 = '주간',
      노면상태 = '건조',
    } = req.body;

    if (!지역) {
      return res.status(400).json({
        success: false,
        message: '지역(구·군)은 필수입니다.',
      });
    }

    const aiRes = await fetch(`${AI_BASE}/predict/gov`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        지역,
        연령대,
        성별,
        차종,
        주야,
        노면상태,
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      return res.status(502).json({
        success: false,
        message: 'AI 서버(GOV) 추론 실패',
        error: detail,
      });
    }

    const data = await aiRes.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'GOV 예측 요청 실패',
      error: String(error),
    });
  }
};

export const getPrediction = async (_req: Request, res: Response) => {
  return res.status(501).json({
    success: false,
    message: '아직 구현되지 않았습니다.',
  });
};