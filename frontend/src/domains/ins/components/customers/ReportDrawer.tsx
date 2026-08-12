import { useEffect, useState } from 'react';
import type { Consultation, ReportItem } from '../../types/customers';
import {
  consultationTypeLabel,
  formatConsultDate,
  toRiskGrade,
  RISK_GRADE_META,
} from '../../constants/insEnums';
import styles from './ReportDrawer.module.css';

type Props = {
  open: boolean;
  customerName: string;
  consultation: Consultation | null;
  items: ReportItem[];
  loading: boolean;
  canDownloadPdf?: boolean;
  onDownloadPdf?: () => Promise<void>;
  onClose: () => void;
};

export function ReportDrawer({
  open,
  customerName,
  consultation,
  items,
  loading,
  canDownloadPdf = false,
  onDownloadPdf,
  onClose,
}: Props) {
  const [dlOpen, setDlOpen] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (dlOpen) setDlOpen(false);
        else onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, dlOpen]);

  useEffect(() => {
    if (!open) {
      setDlOpen(false);
      setDlError(null);
      setDlLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const grade = toRiskGrade(consultation?.riskGrade);
  const gradeMeta = grade ? RISK_GRADE_META[grade] : null;
  const score =
    consultation?.riskScore != null ? consultation.riskScore.toFixed(1) : '-';

  return (
    <div className={styles.root} role="presentation">
      <button
        type="button"
        className={styles.dim}
        aria-label="닫기"
        onClick={onClose}
      />
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-drawer-title"
      >
        <header className={styles.head}>
          <div>
            <h2 id="report-drawer-title" className={styles.title}>
              상담 참고 리포트
            </h2>
            {consultation ? (
              <p className={styles.summary}>
                {customerName} · {formatConsultDate(consultation.consultedAt)}{' '}
                {consultationTypeLabel(consultation.consultationType)} · 위험{' '}
                {score}
                {gradeMeta ? ` ${gradeMeta.label}` : ''}
              </p>
            ) : null}
          </div>
          <button type="button" className={styles.close} onClick={onClose}>
            ×
          </button>
        </header>

        <div className={styles.legend} aria-label="추천 범례">
          <span className={styles.legOn}>추천</span>
          <span className={styles.legOff}>비추천</span>
        </div>

        <div className={styles.body}>
          {loading ? (
            <p className={styles.empty}>리포트를 불러오는 중…</p>
          ) : items.length === 0 ? (
            <p className={styles.empty}>저장된 리포트가 없습니다</p>
          ) : (
            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.coverageKey} className={styles.item}>
                  <div className={styles.itemHead}>
                    <h3 className={styles.itemName}>{item.coverageName}</h3>
                    <span
                      className={
                        item.recommended ? styles.badgeOn : styles.badgeOff
                      }
                    >
                      {item.recommended ? '추천' : '비추천'}
                    </span>
                  </div>
                  <p className={styles.reason}>{item.reasonText}</p>
                  <p className={styles.basis}>근거 · {item.basisText}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className={styles.foot}>
          <button
            type="button"
            className={styles.pdfBtn}
            onClick={() => {
              setDlError(null);
              setDlOpen(true);
            }}
          >
            다운로드
          </button>
        </footer>
      </aside>

      {dlOpen ? (
        <div className={styles.dlRoot} role="presentation">
          <button
            type="button"
            className={styles.dlDim}
            aria-label="닫기"
            onClick={() => setDlOpen(false)}
          />
          <div
            className={styles.dlPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-download-title"
          >
            <h3 id="report-download-title" className={styles.dlTitle}>
              다운로드
            </h3>
            <p className={styles.dlHint}>파일 형식 선택</p>
            <div className={styles.dlList}>
              <button
                type="button"
                className={styles.dlItem}
                disabled={!canDownloadPdf || !onDownloadPdf || dlLoading}
                onClick={() => {
                  if (!onDownloadPdf) return;
                  setDlError(null);
                  setDlLoading(true);
                  void onDownloadPdf()
                    .then(() => setDlOpen(false))
                    .catch((e: unknown) => {
                      setDlError(
                        e instanceof Error
                          ? e.message
                          : 'PDF 다운로드에 실패했습니다.',
                      );
                    })
                    .finally(() => setDlLoading(false));
                }}
              >
                PDF (.pdf)
              </button>
              <button type="button" className={styles.dlItem} disabled>
                Excel (.xlsx)
              </button>
              <button type="button" className={styles.dlItem} disabled>
                Word (.docx)
              </button>
            </div>
            {dlError ? <p className={styles.dlError}>{dlError}</p> : null}
            <p className={styles.dlTodo}>Excel·Word는 추후 지원 예정입니다.</p>
            <button
              type="button"
              className={styles.dlCancel}
              onClick={() => setDlOpen(false)}
            >
              취소
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
