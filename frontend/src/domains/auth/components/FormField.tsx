import type { ReactNode } from 'react';
import styles from './FormField.module.css';

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  success?: string;
  children: ReactNode;
}

export function FormField({
  id,
  label,
  required = false,
  hint,
  error,
  success,
  children,
}: FormFieldProps) {
  const messageId = error
    ? `${id}-error`
    : success
      ? `${id}-success`
      : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        <span>
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </label>
      {children}
      {error ? (
        <p id={messageId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {!error && success ? (
        <p id={messageId} className={styles.success} role="status">
          {success}
        </p>
      ) : null}
    </div>
  );
}
