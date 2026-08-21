import { Request, Response } from 'express';
import { getComparisonByDistrictId } from '../services/govComparison.service';
import {
  listPriorityTop,
  listSuggestions,
  listTrend,
} from '../services/govForecast.service';
import {
  getRegionCompare,
  parseDistrictIdsQuery,
  REGION_COMPARE_MAX_DISTRICTS,
} from '../services/govRegionCompare.service';
import { ok, handleRouteError, HttpError } from '../lib/http';

/* 구별 ID 파싱 */
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
      throw new HttpError('성공한 예측 실행 결과가 없습니다.', 404);
    }

    return ok(res, data, 200, { limit });
  } catch (error) {
    return handleRouteError(res, error, '우선점검 TOP 조회 실패');
  }
};

export const getComparison = async (req: Request, res: Response) => {
  try {
    const districtId = parseDistrictId(req.params.districtId as string);
    if (districtId == null) {
        throw new HttpError('districtId가 올바르지 않습니다.', 400);
    }

    const data = await getComparisonByDistrictId(districtId);
    if (!data) {
      throw new HttpError('비교 지표 데이터가 없습니다.', 404);
    }

    return ok(res, data, 200);
  } catch (error) {
    return handleRouteError(res, error, '평균 대비 조회 실패');
  }
};

export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const districtId = parseDistrictId(req.params.districtId as string);
    if (districtId == null) {
      throw new HttpError('districtId가 올바르지 않습니다.', 400);
    }

    const data = await listSuggestions(districtId);
    return ok(res, data, 200, { districtId });
  } catch (error) {
    return handleRouteError(res, error, '우선점검 제안 조회 실패');
  }
};

export const getTrend = async (req: Request, res: Response) => {
  try {
    const districtId = parseDistrictId(req.params.districtId as string);
    if (districtId == null) {
      throw new HttpError('districtId가 올바르지 않습니다.', 400);
    }

    const data = await listTrend(districtId);
    return ok(res, data, 200, { districtId });
  } catch (error) {
    return handleRouteError(res, error, '추세 조회 실패');
  }
};

/** GET /api/gov/region-compare?districtIds=1,3,5 */
export const getRegionCompareHandler = async (req: Request, res: Response) => {
  try {
    const districtIds = parseDistrictIdsQuery(req.query.districtIds);
    if (districtIds == null || districtIds.length === 0) {
          throw new HttpError('districtIds 쿼리가 필요합니다. 예: ?districtIds=1,3,5 (최대 ' +
          REGION_COMPARE_MAX_DISTRICTS +
          '개)', 400);
    }

    const result = await getRegionCompare(districtIds);

    if (result.error === 'too_many') {
          throw new HttpError(`비교 구는 최대 ${REGION_COMPARE_MAX_DISTRICTS}개까지입니다.`, 400);
    }
    if (result.error === 'no_forecast') {
      throw new HttpError('성공한 예측 스냅샷이 없습니다. 배치를 먼저 실행하세요.', 404);
    }
    if (result.error === 'no_benchmark') {
      throw new HttpError('벤치마크 지표 데이터가 없습니다.', 404);
    }
    if (result.error === 'unknown_district') {
      throw new HttpError(`districtId ${result.districtId} 를 찾을 수 없습니다.`, 404);
    }
    if (result.error) {
      throw new HttpError('지역비교 요청이 올바르지 않습니다.', 400);
    }

    return ok(res, {
      meta: result.meta,
      cityAvg: result.cityAvg,
      districts: result.districts,
      insights: result.insights,
    });
  } catch (error) {
    return handleRouteError(res, error, '지역비교 조회 실패');
  }
};
