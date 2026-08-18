import { Request, Response } from 'express';
import {
  listCustomers,
  listCustomerConsultations,
  hideCustomer,
} from '../services/customer.service';
import { ok, fail, handleRouteError, HttpError} from '../lib/http';

function parseUserId(req: Request): string | undefined {
  const q = req.query.userId;
  if (typeof q === 'string' && q.trim()) return q.trim();
  const bodyId = (req.body as { userId?: unknown } | undefined)?.userId;
  if (bodyId != null && String(bodyId).trim()) return String(bodyId).trim();
  return undefined;
}

// GET /api/customers
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req);
    if (!userId) {
      throw new HttpError('userId(상담원)가 필요합니다.', 400);
    }
    const q =
      typeof req.query.q === 'string' && req.query.q.trim()
        ? req.query.q.trim()
        : undefined;

    const data = await listCustomers(q, userId);
    return ok(res, data, 200);
  } catch (error) {
    return handleRouteError(res, error, '고객 목록 조회 실패');
  }
};

// GET /api/customers/:id/consultations
export const getCustomerConsultations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new HttpError('고객 id가 필요합니다.', 400);
    }
    if (!/^\d+$/.test(String(id))) {
      return fail(res, 400, '잘못된 고객 id입니다.');
    }

    const userId = parseUserId(req);
    if (!userId) {
      throw new HttpError('userId(상담원)가 필요합니다.', 400);
    }

    const result = await listCustomerConsultations(id as string, userId);
    if (!result) {
      throw new HttpError('고객을 찾을 수 없습니다.', 404);
    }

    return ok(res, result.consultations, 200, {
      customerId: id,
      customer: result.customer,
    });
  } catch (error) {
    return handleRouteError(res, error, '상담 이력 조회 실패');
  }
};

// PATCH /api/customers/:id/hide
export const hideCustomerHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new HttpError('고객 id가 필요합니다.', 400);
    }
    if (!/^\d+$/.test(String(id))) {
      return fail(res, 400, '잘못된 고객 id입니다.');
    }

    const userId = parseUserId(req);
    if (!userId) {
      throw new HttpError('userId(상담원)가 필요합니다.', 400);
    }

    const data = await hideCustomer(id as string, userId);
    
    if (!data) {
      throw new HttpError('고객을 찾을 수 없습니다.', 404);
    }

    return ok(res, data, 200);
  } catch (error) {
    return handleRouteError(res, error, '고객 숨김 처리 실패');
  }
};