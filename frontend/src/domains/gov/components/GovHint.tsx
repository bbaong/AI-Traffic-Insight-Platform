import { useId, type ReactNode } from 'react';
import styles from './GovHint.module.css';

export function GovHint({
  text,
  children,
  align = 'start',
  nowrap = false,
}: {
  text: string;
  children: ReactNode;
  align?: 'start' | 'end';
  nowrap?: boolean;
}) {
  const id = useId();

  return (
    <span
      className={`${styles.wrap} ${align === 'end' ? styles.alignEnd : ''} ${
        nowrap ? styles.nowrap : ''
      }`}
    >
      <span className={styles.trigger} tabIndex={0} aria-describedby={id}>
        {children}
      </span>
      <span id={id} className={styles.pop} role="tooltip">
        {text}
      </span>
    </span>
  );
}
