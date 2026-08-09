import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGovReportPdf } from '../../gov/api/reportPdf';
import { fetchInsReportPdf } from '../../ins/api/reportPdf';
import { DAEGU_DISTRICTS } from '../../../shared/constants/daeguBoundaries';
import { ROUTES } from '../../../shared/constants/routes';
import { useDistrictStore } from '../../../shared/stores/districtStore';
import { PdfPreviewModal } from '../../../shared/components/ui/PdfPreviewModal';
import { useAuthStore } from '../../../stores/authStore';
import { useInsReportDraftStore } from '../stores/insReportDraftStore';
import styles from './ReportsPage.module.css';

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
    await runPdfJob(
      () =>
        fetchGovReportPdf({
          지역: selectedName,
          freq: 'Q',
          작성자: user?.name || undefined,
          기관: user?.orgName || undefined,
        }),
      `행정참고리포트_${selectedName}`,
    );
  }

  async function handleCreateInsPdf() {
    if (!insDraft) {
      setPdfError('대시보드에서「상담 참고 리포트 생성」으로 이동해 주세요.');
      return;
    }
    await runPdfJob(
      () =>
        fetchInsReportPdf({
          ...insDraft,
          작성자: user?.name || undefined,
        }),
      `상담참고리포트_${insDraft.구군}`,
    );
  }

  function handleDownloadPdf() {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `${downloadBase}_${Date.now()}.pdf`;
    a.click();
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>리포트</h1>
        <p className={styles.sub}>
          {isGov
            ? '대시보드에서 본 구·군을 기준으로 행정 참고 PDF를 만듭니다.'
            : '대시보드에서 가져온 고객 조건으로 상담 참고 PDF를 만듭니다.'}
        </p>
      </header>

      <section className={styles.card}>
        {isGov ? (
          <>
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
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => void handleCreateGovPdf()}
              disabled={!selectedName || pdfLoading}
            >
              {pdfLoading ? '리포트 생성 중…' : '행정 참고 리포트 생성'}
            </button>
          </>
        ) : (
          <>
            <h2 className={styles.cardTitle}>상담 참고 리포트</h2>
            {insDraft ? (
              <p className={styles.meta}>
                고객 조건:{' '}
                <strong>
                  {[insDraft.구군, insDraft.연령대, insDraft.성별, insDraft.차종]
                    .filter(Boolean)
                    .join(' · ')}
                </strong>
                {insDraft.고객명 ? (
                  <>
                    <br />
                    고객명: <strong>{insDraft.고객명}</strong>
                  </>
                ) : null}
              </p>
            ) : (
              <p className={styles.meta}>
                대시보드에서 분석 후「상담 참고 리포트 생성」을 눌러 이동해 주세요.{' '}
                <Link className={styles.link} to={dashboardPath}>
                  {dashboardLabel}로 이동
                </Link>
              </p>
            )}
            {pdfError ? (
              <p className={styles.error} role="alert">
                {pdfError}
              </p>
            ) : null}
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => void handleCreateInsPdf()}
              disabled={!insDraft || pdfLoading}
            >
              {pdfLoading ? '리포트 생성 중…' : '상담 참고 리포트 생성'}
            </button>
          </>
        )}
      </section>

      <PdfPreviewModal
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
