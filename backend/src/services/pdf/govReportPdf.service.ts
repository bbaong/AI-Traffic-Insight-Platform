import { renderPdfTemplate } from './renderTemplate';
import { htmlToPdfBuffer } from './browser';
import { buildComparisonBars, buildSeverityChart } from './govChart';
import { formatKstDateTime } from '../formatKst';


export type GovReportPdfInput = {
    지역: string;
    작성자?: string;
    기관?: string;
    dashboard: Record<string, unknown>;
  };

  export function assertGovReportPdfInput(
    body: unknown,
  ): asserts body is GovReportPdfInput {
    const b = body as GovReportPdfInput;
    if (!b?.지역 || typeof b.지역 !== 'string') {
      throw new Error('지역은 필수입니다.');
    }
    if (!b.dashboard || typeof b.dashboard !== 'object') {
      throw new Error(
        '대시보드 스냅샷(dashboard)이 필요합니다. 지자체 대시보드에서 구·군을 선택한 뒤 다시 시도해 주세요.',
      );
    }
  }


export async function buildGovReportPdf(body: GovReportPdfInput): Promise<Buffer>{
    const dashboard = body.dashboard as Record<string, any>;

    const comparison = dashboard.comparison ?? null;
    const html = await renderPdfTemplate('gov_admin_report.ejs', {
        generated_at: formatKstDateTime(),
        author_name: (body.작성자 || '').trim() || '-',
        org_name: (body.기관 || '').trim() || '-',
        district_name: body.지역,
        period_label: dashboard.period_label || '-',
        top3: dashboard.top3 || [],
        selected: dashboard.selected || {},
        recommendation: `대시보드 스냅샷 기준 · 예상사고 ${(dashboard.selected || {}).count || 0}건`,
        comparison,
        comparisonBars: buildComparisonBars(comparison),
        suggestions: dashboard.suggestions || [],
        severityLatest: dashboard.severityLatest || [],
        severityChart: buildSeverityChart(dashboard.severitySeries),
        includeSummary: dashboard.includeSummary !== false,
    });

    return htmlToPdfBuffer(html);
}
  