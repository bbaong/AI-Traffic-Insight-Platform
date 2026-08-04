import 'dotenv/config';
import { Request, Response } from 'express';

const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

export const predictIns = async (req: Request, res: Response) => {
  try {
    const { 구군, 연령대, 성별, 차종, 주야, 노면상태 } = req.body;

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
        노면상태: 노면상태 ?? '건조',
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

export const predictGov = async (req: Request, res: Response) => {
  try {
    const { 지역, as_of, freq } = req.body ?? {};

    const aiRes = await fetch(`${AI_BASE}/predict/gov`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        지역: 지역 ?? null,
        as_of: as_of ?? null,
        freq: freq ?? 'Q',
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      return res.status(502).json({
        success: false,
        message: 'AI 서버(지자체) 추론 실패',
        error: detail,
      });
    }

    const data = await aiRes.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: '지자체 예측 요청 실패',
      error: String(error),
    });
  }
};

export const predictGovHistory = async (req: Request, res: Response) => {
  try {
    const { 지역, as_of, n_history } = req.body ?? {};

    if (!지역 || typeof 지역 !== 'string') {
      return res.status(400).json({
        success: false,
        message: '지역은 필수입니다.',
      });
    }

    const aiRes = await fetch(`${AI_BASE}/predict/gov/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        지역,
        as_of: as_of ?? null,
        n_history: n_history ?? 3,
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      // AI가 400이면 그대로 넘기고, 그 외(503 등)는 502로 묶어도 됨
      const status = aiRes.status === 400 ? 400 : 502;
      return res.status(status).json({
        success: false,
        message: 'AI 서버(지자체 history) 추론 실패',
        error: detail,
      });
    }

    const data = await aiRes.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: '지자체 history 예측 요청 실패',
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