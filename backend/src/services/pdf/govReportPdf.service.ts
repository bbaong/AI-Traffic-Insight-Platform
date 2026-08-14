import { renderPdfTemplate } from './renderTemplate';
import { htmlToPdfBuffer } from './browser';
import { buildComparisonBars, buildSeverityChart } from './govChart';
import { formatKstDateTime } from '../formatKst';

export async function buildGovReportPdf(body: {
  지역: string;
  작성자?: string;
  기관?: string;
  dashboard?: Record<string, any> | null;
}): Promise<Buffer> {
  const dashboard = body.dashboard;
  if (!dashboard) {
    throw new Error(
      '대시보드 스냅샷(dashboard)이 필요합니다. 지자체 대시보드에서 구·군을 선택한 뒤 다시 시도해 주세요.',
    );
  }

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