import { useEffect } from 'react';
import styles from './SaveSuccessModal.module.css';

type Props = {
  open: boolean;
  onGoReport: () => void;
  onGoCustomers: () => void;
};

export function SaveSuccessModal({ open, onGoReport, onGoCustomers }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.root} role="presentation">
      <button
        type="button"
        className={styles.dim}
        aria-label="닫기"
        onClick={onGoCustomers}
      />
      <div
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="save-success-title"
        aria-describedby="save-success-desc"
      >
        <div className={styles.icon} aria-hidden="true">
          ✓
        </div>
        <h2 id="save-success-title" className={styles.title}>
          상담이 저장되었습니다!
        </h2>
        <p id="save-success-desc" className={styles.message}>
          AI 분석 결과를 기반으로 상담 참고 리포트를 확인할 수 있습니다.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onGoReport}>
            리포트 확인하기 →
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={onGoCustomers}
          >
            고객관리로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
