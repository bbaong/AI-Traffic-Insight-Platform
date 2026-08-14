import { gradeLabel, tokkStatusLabel } from './labels';
import { renderPdfTemplate } from './renderTemplate';
import { htmlToPdfBuffer } from './browser';
import { formatKstDateTimeDot } from '../formatKst';

export type InsReportPdfInput = {
  구군: string;
  연령대: string;
  성별: string;
  차종: string;
  예측등급: string;
  위험도: number;
  담보추천?: Array<{
    id: string;
    name: string;
    recommended: boolean;
    script: string;
    reason: string;
  }>;
  고객명?: string;
  작성자?: string;
  memo?: string;
  checklist?: Record<string, string>;
  tokkResults?: Array<{
    id: string;
    name: string;
    desc?: string;
    status: string;
    icon?: string;
  }>;
  analyzedAt?: string;
  consultType?: string;
  orgName?: string;
};

export function assertInsReportPdfInput(body: any): asserts body is InsReportPdfInput {
  if (!body?.구군 || !body?.연령대 || !body?.성별 || !body?.차종) {
    throw new Error('구군, 연령대, 성별, 차종은 필수입니다.');
  }
  if (body.예측등급 == null || body.예측등급 === '' || body.위험도 == null || body.위험도 === '') {
    throw new Error('예측등급, 위험도는 필수입니다. (미리보기 draft를 보내 주세요)');
  }
  if (!Array.isArray(body.담보추천)) {
    throw new Error('담보추천 배열이 필요합니다.');
  }
}

export async function buildInsReportPdf(body: InsReportPdfInput): Promise<Buffer> {
  const memoText = (body.memo || '').trim() || null;
  const generatedAt =
    (body.analyzedAt || '').trim() || formatKstDateTimeDot();

  const tokkResults = (body.tokkResults || []).map((row) => ({
    ...row,
    status_label: tokkStatusLabel(row.status),
  }));

  const html = await renderPdfTemplate('ins_consult_report.ejs', {
    generated_at: generatedAt,
    customer_name: (body.고객명 || '').trim() || null,
    author_name: (body.작성자 || '').trim() || '-',
    org_name: (body.orgName || '').trim() || null,
    consult_type: (body.consultType || '').trim() || '신규',
    profile: {
      구군: body.구군,
      연령대: body.연령대,
      성별: body.성별,
      차종: body.차종,
    },
    prediction: {
      예측등급: gradeLabel(String(body.예측등급)),
      위험도: Number(body.위험도),
    },
    coverages: body.담보추천 || [],
    checklist: body.checklist || {},
    tokk_results: tokkResults,
    memo: memoText,
  });

  return htmlToPdfBuffer(html);
}