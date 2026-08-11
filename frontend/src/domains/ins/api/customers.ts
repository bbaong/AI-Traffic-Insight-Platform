import type { ApiResponse } from '../types/prediction';
import type {
  ConsultationsResponse,
  CustomerListItem,
  ReportItem,
} from '../types/customers';
import { sleep } from '../utils/sleep';
import {
  MOCK_REPORT,
  mockReportByGrade,
} from '../mocks/report.mock';
import { toRiskGrade } from '../constants/insEnums';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

async function readJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error('응답을 해석하지 못했습니다.');
  }
}

/** GET /api/customers — json.data만 사용 */
export async function fetchCustomers(q?: string): Promise<CustomerListItem[]> {
  const url = new URL(`${API_BASE}/api/customers`);
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

/** GET /api/customers/:id/consultations */
export async function fetchCustomerConsultations(
  customerId: string,
): Promise<ConsultationsResponse> {
  const res = await fetch(
    `${API_BASE}/api/customers/${encodeURIComponent(customerId)}/consultations`,
  );
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
 * 상담 참고 리포트.
 * TODO: 상담 저장 시 리포트가 함께 저장되는지 확정 후
 *   (a) consultation 응답에 포함되면 consultation.report 사용
 *   (b) 별도 API면 GET /api/consultations/:id/report 로 교체
 */
export async function fetchConsultationReport(
  consultationId: string,
  riskGrade?: string | null,
): Promise<ReportItem[]> {
  await sleep(200);
  const byId = MOCK_REPORT[consultationId];
  if (byId) return byId;
  return mockReportByGrade(toRiskGrade(riskGrade));
}
