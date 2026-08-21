import { useEffect, useState } from 'react';
import { isValidEmail } from '../../utils/email';
import styles from './PdfPreviewModal.module.css';

//PDF 미리보기 모달 타입
interface Props {
  open: boolean;
  pdfUrl: string | null;
  title?: string;
  downloading?: boolean;
  sending?: boolean;
  sendError?: string | null;
  sendOk?: string | null;
  onClose: () => void;
  onDownload: () => void;
  onSendEmail: (toEmail: string) => void;
  accent?: 'teal' | 'amber';
}

//PDF 미리보기 모달
export function PdfPreviewModal({
  open,
  pdfUrl,
  title = '상담 참고 리포트',
  downloading = false,
  sending = false,
  sendError = null,
  sendOk = null,
  accent = 'teal',
  onClose,
  onDownload,
  onSendEmail,
}: Props) {
  
  const [toEmail, setToEmail] = useState('');

  //모달 닫히면 이메일 초기화
  useEffect(() => {
    if (!open) setToEmail('');
  }, [open]);

  //이메일 유효성 검사
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
        <div className={styles.emailBar}>
          <input
            type="email"
            className={styles.emailInput}
            placeholder="받을 사람 이메일"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            disabled={!pdfUrl || sending}
            autoComplete="email"
          />
          <button
            type="button"
            className={accent === 'amber' ? `${styles.primary} ${styles.primaryAmber}` : styles.primary}
            disabled={!pdfUrl || sending || !isValidEmail(toEmail.trim())}
            onClick={() => onSendEmail(toEmail.trim())}
          >
            {sending ? '보내는 중…' : '이메일 보내기'}
          </button>
          {sendError ? (
            <p className={styles.emailMsgError}>{sendError}</p>
          ) : sendOk ? (
            <p className={styles.emailMsgOk}>{sendOk}</p>
          ) : null}
        </div>
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