import styles from './Toast.module.css';

type ToastProps = {
  message: string;
  visible: boolean;
};

export function Toast({ message, visible }: ToastProps) {
  if (!visible) return null;

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.popup} role="status" aria-live="polite">
        <span className={styles.icon} aria-hidden="true">
          ✓
        </span>
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
}
