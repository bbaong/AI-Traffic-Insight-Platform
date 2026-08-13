import { useEffect } from 'react';
import styles from './PdfPreviewModal.module.css';

interface Props {
  open: boolean;
  pdfUrl: string | null;
  title?: string;
  downloading?: boolean;
  onClose: () => void;
  onDownload: () => void;
  accent?: 'teal' | 'amber';
}

export function PdfPreviewModal({
  open,
  pdfUrl,
  title = '상담 참고 리포트',
  downloading = false,
  accent = 'teal',
  onClose,
  onDownload,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className={styles.dim}
        aria-label="닫기"
        onClick={onClose}
      />
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.actions}>
            <button
              type="button"
              className={accent === 'amber' ? `${styles.primary} ${styles.primaryAmber}` : styles.primary}
              onClick={onDownload}
              disabled={!pdfUrl || downloading}
            >
              다운로드
            </button>
            <button type="button" className={styles.ghost} onClick={onClose}>
              닫기
            </button>
          </div>
        </header>
        <div className={styles.body}>
          {pdfUrl ? (
            <iframe className={styles.frame} title={title} src={pdfUrl} />
          ) : (
            <p className={styles.loading}>PDF를 불러오는 중…</p>
          )}
        </div>
      </div>
    </div>
  );
}