import { Request, Response } from 'express';
import { getComparisonByDistrictId } from '../services/govComparison.service';
import {
  listPriorityTop,
  listSuggestions,
  listTrend,
} from '../services/govForecast.service';

function parseDistrictId(raw: string | undefined) {
  const districtId = Number(raw);
  if (!Number.isInteger(districtId) || districtId <= 0) return null;
  return districtId;
}

export const getPriorityTop = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 3;
    const data = await listPriorityTop(limit);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: '성공한 예측 실행 결과가 없습니다.',
      });
    }

    return res.status(200).json({
      success: true,
      data,
      limit,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: '우선점검 TOP 조회 실패',
    });
  }
};

export const getComparison = async (req: Request, res: Response) => {
  try {
    const districtId = parseDistrictId(req.params.districtId as string);
    if (districtId == null) {
      return res.status(400).json({
        success: false,
        message: 'districtId가 올바르지 않습니다.',
      });
    }

    const data = await getComparisonByDistrictId(districtId);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: '비교 지표 데이터가 없습니다.',
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: '평균 대비 조회 실패',
    });
  }
};

export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const districtId = parseDistrictId(req.params.districtId as string);
    if (districtId == null) {
      return res.status(400).json({
        success: false,
        message: 'districtId가 올바르지 않습니다.',
      });
    }

    const data = await listSuggestions(districtId);
    return res.status(200).json({
      success: true,
      data,
      districtId,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: '우선점검 제안 조회 실패',
    });
  }
};

export const getTrend = async (req: Request, res: Response) => {
  try {
    const districtId = parseDistrictId(req.params.districtId as string);
    if (districtId == null) {
      return res.status(400).json({
        success: false,
        message: 'districtId가 올바르지 않습니다.',
      });
    }

    const data = await listTrend(districtId);
    return res.status(200).json({
      success: true,
      data,
      districtId,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: '추세 조회 실패',
    });
  }
};
