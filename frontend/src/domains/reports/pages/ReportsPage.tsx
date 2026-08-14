import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchInsReportPdf } from '../../ins/api/reportPdf';
import { DAEGU_DISTRICTS } from '../../../shared/constants/daeguBoundaries';
import { ROUTES } from '../../../shared/constants/routes';
import { useDistrictStore } from '../../../shared/stores/districtStore';
import { PdfPreviewModal } from '../../../shared/components/ui/PdfPreviewModal';
import { useAuthStore } from '../../../stores/authStore';
import { useInsReportDraftStore } from '../stores/insReportDraftStore';
import { InsConsultReportView } from '../components/InsConsultReportView';
import styles from './ReportsPage.module.css';
import {
  fetchGovReportPdf,
  type GovReportPdfDashboardPayload,
} from '../../gov/api/reportPdf';

type GovPdfSnapshot = {
  지역: string;
  period_label: string;
  top3: GovReportPdfDashboardPayload['top3'];
  selected: GovReportPdfDashboardPayload['selected'];
  comparison?: GovReportPdfDashboardPayload['comparison'] | null;
  suggestions?: GovReportPdfDashboardPayload['suggestions'] | null;
  severityLatest?: GovReportPdfDashboardPayload['severityLatest'] | null;
  severitySeries?: GovReportPdfDashboardPayload['severitySeries'] | null; // 추가
};

type GovPdfSections = {
  top3: boolean;
  comparison: boolean;
  severityLatest: boolean;
  severityChart: boolean;
  suggestions: boolean;
  summary: boolean;
};

const DEFAULT_GOV_SECTIONS: GovPdfSections = {
  top3: true,
  comparison: true,
  severityLatest: true,
  severityChart: true,
  suggestions: true,
  summary: true,
};

const EMPTY_GOV_SECTIONS: GovPdfSections = {
  top3: false,
  comparison: false,
  severityLatest: false,
  severityChart: false,
  suggestions: false,
  summary: false,
};

const GOV_SECTION_OPTIONS: Array<{ key: keyof GovPdfSections; label: string }> =
  [
    { key: 'top3', label: '우선점검 TOP3' },
    { key: 'comparison', label: '구·시 비교 지표' },
    { key: 'severityLatest', label: '경중 구성(표)' },
    { key: 'severityChart', label: '경중 추이(차트)' },
    { key: 'suggestions', label: '우선점검 제안' },
    { key: 'summary', label: '선택 지역 AI 요약' },
  ];

/**
 * 역할별 리포트 생성 페이지.
 * GOV: districtStore 선택 구·군 / INS: 대시보드에서 넘긴 draft.
 */
export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const isGov = user?.role === 'ROLE_A';

  const selectedCode = useDistrictStore((s) => s.selectedCode);
  const selectedName =
    DAEGU_DISTRICTS.find((d) => d.code === selectedCode)?.name ?? null;

  const insDraft = useInsReportDraftStore((s) => s.draft);

  const dashboardPath = isGov ? ROUTES.DASHBOARD_GOV : ROUTES.DASHBOARD_INS;
  const dashboardLabel = isGov ? '지자체 대시보드' : '보험 상담 대시보드';

  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [downloadBase, setDownloadBase] = useState('report');
  const [includeMemo, setIncludeMemo] = useState(true);
  const [govSections, setGovSections] =
    useState<GovPdfSections>(DEFAULT_GOV_SECTIONS);

  useEffect(() => {
    setIncludeMemo(Boolean(insDraft?.memo));
  }, [insDraft]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const closePdfModal = useCallback(() => {
    setPdfOpen(false);
    setPdfError(null);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  async function runPdfJob(load: () => Promise<Blob>, fileBase: string) {
    setPdfLoading(true);
    setPdfError(null);
    setDownloadBase(fileBase);
    setPdfOpen(true);
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try {
      const blob = await load();
      setPdfUrl(URL.createObjectURL(blob));
    } catch (e) {
      setPdfError(
        e instanceof Error ? e.message : 'PDF 생성에 실패했습니다.',
      );
      setPdfOpen(false);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleCreateGovPdf() {
    if (!selectedName) {
      setPdfError('대시보드에서 구·군을 먼저 선택해 주세요.');
      return;
    }
    let snapshot: GovPdfSnapshot | null = null;
    try {
      const raw = sessionStorage.getItem('gov_pdf_snapshot_v1');
      snapshot = raw ? (JSON.parse(raw) as GovPdfSnapshot) : null;
    } catch {
      snapshot = null;
    }

    if (!snapshot || snapshot.지역 !== selectedName) {
      setPdfError('대시보드에서 구·군을 선택한 뒤 다시 시도해 주세요.');
      return;
    }

    await runPdfJob(
      () =>
        fetchGovReportPdf({
          지역: selectedName,
          freq: 'Q',
          작성자: user?.name || undefined,
          기관: user?.orgName || undefined,
          dashboard: {
            period_label: snapshot.period_label,
            top3: govSections.top3 ? snapshot.top3 : [],
            selected: snapshot.selected,
            comparison: govSections.comparison
              ? (snapshot.comparison ?? undefined)
              : undefined,
            suggestions: govSections.suggestions
              ? (snapshot.suggestions ?? undefined)
              : undefined,
            severityLatest: govSections.severityLatest
              ? (snapshot.severityLatest ?? undefined)
              : undefined,
            severitySeries: govSections.severityChart
              ? (snapshot.severitySeries ?? undefined)
              : undefined,
            includeSummary: govSections.summary,
          },
        }),
      `행정참고리포트_${selectedName}`,
    );
  }

  async function handleCreateInsPdf() {
    if (!insDraft) {
      setPdfError('대시보드에서「상담 참고 리포트 생성」으로 이동해 주세요.');
      return;
    }
    const { source: _source, memo, ...draftFields } = insDraft;
    const name = (insDraft.고객명?.trim() || '고객').replace(/[\\/:*?"<>|]/g, '_');
    await runPdfJob(
      () => fetchInsReportPdf({
          ...draftFields,
          ...(includeMemo && memo ? { memo } : {}),
          작성자: user?.name || undefined,
        }),
      `상담참고리포트_${name}`,
    );
  }

  function handleDownloadPdf() {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    const ymd = new Date()
      .toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
      .replace(/-/g, '');
    a.download = `${downloadBase}_${ymd}.pdf`;
    a.click();
  }

  return (
    <div className={styles.page}>
      {isGov || !insDraft ? (
        <header className={styles.header}>
          <h1 className={styles.title}>리포트</h1>
          <p className={styles.sub}>
            {isGov
              ? '대시보드에서 본 구·군을 기준으로 행정 참고 PDF를 만듭니다.'
              : '대시보드에서 가져온 고객 조건으로 상담 참고 PDF를 만듭니다.'}
          </p>
        </header>
      ) : null}
  
      {isGov ? (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>행정 참고 리포트</h2>
          <p className={styles.meta}>
            대상 지역: <strong>{selectedName ?? '선택 없음'}</strong>
            {!selectedName ? (
              <>
                {' '}
                —{' '}
                <Link className={styles.link} to={dashboardPath}>
                  대시보드에서 구·군 선택
                </Link>
              </>
            ) : null}
          </p>
          {pdfError ? (
            <p className={styles.error} role="alert">
              {pdfError}
            </p>
          ) : null}
          <fieldset className={styles.sectionChecks}>
            <legend>PDF에 포함할 항목</legend>
            <div className={styles.sectionCheckActions}>
              <button
                type="button"
                className={styles.sectionCheckBtn}
                onClick={() => setGovSections(DEFAULT_GOV_SECTIONS)}
              >
                전체 선택
              </button>
              <button
                type="button"
                className={styles.sectionCheckBtn}
                onClick={() => setGovSections(EMPTY_GOV_SECTIONS)}
              >
                전체 해제
              </button>
            </div>
            {GOV_SECTION_OPTIONS.map(({ key, label }) => (
              <label key={key} className={styles.memoInclude}>
                <input
                  type="checkbox"
                  checked={govSections[key]}
                  onChange={(e) =>
                    setGovSections((s) => ({
                      ...s,
                      [key]: e.target.checked,
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => void handleCreateGovPdf()}
            disabled={!selectedName || pdfLoading}
          >
            {pdfLoading ? '리포트 생성 중…' : '행정 참고 리포트 생성'}
          </button>
        </section>
      ) : !insDraft ? (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>상담 참고 리포트</h2>
          <p className={styles.meta}>
            대시보드에서 분석 후 「상담 참고 리포트 생성」을 눌러 이동해 주세요.<br/>{' '}
            <Link className={styles.link} to={dashboardPath}>
              {dashboardLabel}로 이동
            </Link>
          </p>
        </section>
      ) : (
        <InsConsultReportView
          draft={insDraft}
          orgLabel={user?.orgName || '보험사'}
          pdfLoading={pdfLoading}
          pdfError={pdfError}
          includeMemo={includeMemo}
          onIncludeMemoChange={setIncludeMemo}
          onCreatePdf={() => void handleCreateInsPdf()}
        />
      )}
  
      <PdfPreviewModal
        accent={isGov ? 'teal' : 'amber'}
        open={pdfOpen}
        pdfUrl={pdfUrl}
        title={isGov ? '행정 참고 리포트' : '상담 참고 리포트'}
        downloading={pdfLoading}
        onClose={closePdfModal}
        onDownload={handleDownloadPdf}
      />
    </div>
  );
}

export default ReportsPage;
