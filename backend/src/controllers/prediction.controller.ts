import { Request, Response } from 'express';
import { ok, fail } from '../lib/http';
import { getLatestGovForecast } from '../services/govForecast.service';
import {
  AiHttpError,
  predictRisk,
  predictGov as aiPredictGov,
  predictGovHistory as aiPredictGovHistory,
  fetchHotspots,
} from '../services/aiPredict.service';
import {
  assertGovReportPdfInput,
  buildGovReportPdf,
} from '../services/pdf/govReportPdf.service';

function handleAiError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
) {
  console.error(error);
  if (error instanceof AiHttpError) {
    return fail(res, error.status, fallbackMessage, error.detail);
  }
  return fail(res, 500, fallbackMessage, error);
}

/** POST /api/prediction/predict-ins — 사고예측 요청 */
export const predictIns = async (req: Request, res: Response) => {
  try {
    const { 구군, 연령대, 성별, 차종, 주야, 노면상태 } = req.body;

    if (!구군 || !연령대 || !성별 || !차종) {
      return fail(res, 400, '구군, 연령대, 성별, 차종은 필수입니다.');
    }

    const data = await predictRisk({
      구군,
      연령대,
      성별,
      차종,
      주야,
      노면상태,
    });
    return ok(res, data);
  } catch (error) {
    return handleAiError(res, error, 'AI 서버 추론 실패');
  }
};

/** POST /api/prediction/predict-gov — 지자체 예측 요청 */
export const predictGov = async (req: Request, res: Response) => {
  try {
    const { 지역, as_of, freq } = req.body ?? {};
    const data = await aiPredictGov({ 지역, as_of, freq });
    return ok(res, data);
  } catch (error) {
    return handleAiError(res, error, 'AI 서버(지자체) 추론 실패');
  }
};

/** GET /api/prediction/gov-forecasts — Gov 예측 스냅샷 조회 */
export const getGovForecasts = async (req: Request, res: Response) => {
  try {
    const freq = (req.query.freq as 'Q' | 'H' | undefined) ?? 'Q';
    const as_of = req.query.as_of as string | undefined;
    const scope = (req.query.scope as string | undefined) ?? 'DAEGU';

    const data = await getLatestGovForecast({ freq, as_of, scope });
    if (!data) {
      return fail(
        res,
        404,
        '저장된 Gov 예측 스냅샷이 없습니다. 배치를 먼저 실행하세요.',
      );
    }
    return ok(res, data);
  } catch (error) {
    console.error(error);
    return fail(
      res,
      500,
      error instanceof Error ? error.message : 'forecast 조회 실패',
    );
  }
};

/** POST /api/prediction/predict-gov-history — 지자체 history 예측 요청 */
export const predictGovHistory = async (req: Request, res: Response) => {
  try {
    const { 지역, as_of, n_history } = req.body ?? {};

    if (!지역 || typeof 지역 !== 'string') {
      return fail(res, 400, '지역은 필수입니다.');
    }

    const data = await aiPredictGovHistory({ 지역, as_of, n_history });
    return ok(res, data);
  } catch (error) {
    return handleAiError(res, error, 'AI 서버(지자체 history) 추론 실패');
  }
};

/** GET /api/prediction/predict-gov-hotspots — 대구 공식 사고다발 TOP3 */
export const predictGovHotspots = async (req: Request, res: Response) => {
  try {
    const year = req.query.year ?? req.body?.year;
    const refresh = req.query.refresh ?? req.body?.refresh;
    const include_polygon =
      req.query.include_polygon ?? req.body?.include_polygon;

    const data = await fetchHotspots({ year, refresh, include_polygon });
    return ok(res, data);
  } catch (error) {
    return handleAiError(res, error, 'AI 서버(다발지역) 조회 실패');
  }
};


/** POST /api/prediction/gov-report-pdf — Backend Playwright PDF */
export const predictGovReportPdf = async (req: Request, res: Response) => {
  try {
    assertGovReportPdfInput(req.body);
    const buf = await buildGovReportPdf(req.body);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="gov-admin-report.pdf"',
    );
    return res.send(buf);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : 'PDF 생성 실패';
    if (
      message.includes('필수') ||
      message.includes('필요합니다') ||
      message.includes('스냅샷')
    ) {
      return fail(res, 400, message);
    }
    return fail(res, 500, 'GOV PDF 생성 실패', error);
  }
};