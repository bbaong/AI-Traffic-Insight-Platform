import type { ApiResponse } from '../types/prediction';
import type {
  ConsultationsResponse,
  CustomerListItem,
  ReportItem,
} from '../types/customers';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

async function readJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error('응답을 해석하지 못했습니다.');
  }
}

/** GET /api/customers — json.data만 사용 */
export async function fetchCustomers(
  q?: string,
  userId?: number,
): Promise<CustomerListItem[]> {
  if (userId == null) throw new Error('로그인이 필요합니다.');
  const url = new URL(`${API_BASE}/api/customers`);
  url.searchParams.set('userId', String(userId));
  const query = q?.trim();
  if (query) url.searchParams.set('q', query);
  
  const res = await fetch(url.toString());
  const json = await readJson<ApiResponse<CustomerListItem[]>>(res);

  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    if (res.status === 404) throw new Error('고객 목록을 찾을 수 없습니다.');
    if (res.status === 400) throw new Error(json.message ?? '검색어가 올바르지 않습니다.');
    throw new Error(json.message ?? '고객 목록을 불러오지 못했습니다.');
  }

  return json.data;
}

export interface HideCustomerResult {
  customerId: string;
  isHidden: boolean;
  hiddenAt: string | null;
}

/** PATCH /api/customers/:id/hide — Soft Delete(목록 숨김) */
export async function hideCustomer(
  customerId: string,
  userId: number,
): Promise<HideCustomerResult> {
  const url = new URL(
    `${API_BASE}/api/customers/${encodeURIComponent(customerId)}/hide`,
  );
  url.searchParams.set('userId', String(userId));
  const res = await fetch(url.toString(), { method: 'PATCH' });
  const json = await readJson<ApiResponse<HideCustomerResult>>(res);

  if (res.status === 404) {
    throw new Error(json.message ?? '고객을 찾을 수 없습니다.');
  }
  if (res.status === 400) {
    throw new Error(json.message ?? '잘못된 고객입니다.');
  }
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? '고객을 삭제하지 못했습니다.');
  }
  return json.data;
}

/** 여러 고객을 순차 숨김. 일부 실패해도 나머지는 진행 */
export async function hideCustomers(
  customerIds: string[],
  userId: number,
): Promise<{
  hiddenIds: string[];
  failed: Array<{ id: string; message: string }>;
}> {
  const hiddenIds: string[] = [];
  const failed: Array<{ id: string; message: string }> = [];

  const results = await Promise.allSettled(
    customerIds.map(async (id) => {
      await hideCustomer(id, userId);
      return id;
    }),
  );

  results.forEach((result, i) => {
    const id = customerIds[i];
    if (!id) return;
    if (result.status === 'fulfilled') {
      hiddenIds.push(id);
      return;
    }
    failed.push({
      id,
      message:
        result.reason instanceof Error
          ? result.reason.message
          : '고객을 삭제하지 못했습니다.',
    });
  });

  return { hiddenIds, failed };
}

/** GET /api/customers/:id/consultations */
export async function fetchCustomerConsultations(
  customerId: string,
  userId: number,
): Promise<ConsultationsResponse> {
  const url = new URL(
    `${API_BASE}/api/customers/${encodeURIComponent(customerId)}/consultations`,
  );
  url.searchParams.set('userId', String(userId));
  const res = await fetch(url.toString());
  const json = await readJson<
    {
      success: boolean;
      message?: string;
      customerId?: string;
      customer?: ConsultationsResponse['customer'];
      data?: ConsultationsResponse['data'];
    }
  >(res);

  if (res.status === 404) {
    throw new Error(json.message ?? '고객을 찾을 수 없습니다.');
  }
  if (res.status === 400) {
    throw new Error(json.message ?? '잘못된 고객입니다.');
  }
  if (!res.ok || !json.success || !json.customer || !Array.isArray(json.data)) {
    throw new Error(json.message ?? '상담 이력을 불러오지 못했습니다.');
  }

  return {
    customerId: json.customerId ?? customerId,
    customer: json.customer,
    data: json.data,
  };
}

/**
 * 상담 참고 리포트 — GET /api/consultations/:id/report
 */
export async function fetchConsultationReport(
  consultationId: string,
  _riskGrade?: string | null,
): Promise<ReportItem[]> {
  const res = await fetch(
    `${API_BASE}/api/consultations/${encodeURIComponent(consultationId)}/report`,
  );
  const json = await readJson<{
    success?: boolean;
    message?: string;
    data?: ReportItem[];
  }>(res);

  if (!res.ok || json.success !== true || !Array.isArray(json.data)) {
    throw new Error(json.message ?? '리포트를 불러오지 못했습니다.');
  }
  return json.data;
}