import { useEffect, useState, type FormEvent } from 'react';
import { changePassword } from '../../shared/api/user';
import { Toast } from '../../shared/components/ui/Toast';
import { ROUTES } from '../../shared/constants/routes';
import { logout } from '../../domains/auth/api/auth';
import {
  clearAuthStorage,
  getRefreshToken,
  useAuthStore,
} from '../../shared/stores/authStore';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    if (!showSuccessToast) return;
    const id = window.setTimeout(() => {
      void (async () => {
        const refreshToken = getRefreshToken();
        await logout(refreshToken);
        clearAuthStorage();
        window.location.replace(ROUTES.LOGIN);
      })();
    }, 1200);
    return () => window.clearTimeout(id);
  }, [showSuccessToast]);

  if (!user) return null;

  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const newPasswordTooShort =
    newPassword.length > 0 && newPassword.length < 8;

  const canSubmit =
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || submitting) return;

    setFieldError(null);
    setSubmitError(null);

    if (newPassword.length < 8) {
      setFieldError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await changePassword({
        newPassword,
      });

      if (result.ok === false) {
        setSubmitError(result.message);
        return;
      }

      setNewPassword('');
      setConfirmPassword('');
      setShowSuccessToast(true);
    } catch {
      setSubmitError('비밀번호 변경에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="settings-password-heading">
        <h2 id="settings-password-heading" className={styles.cardTitle}>
          비밀번호 변경
        </h2>
        <p className={styles.hint}>
          새 비밀번호를 입력해 변경합니다. (최소 8자)
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError ? (
            <p className={styles.errorBanner} role="alert">
              {submitError}
            </p>
          ) : null}

          <div className={styles.field}>
            <label htmlFor="newPassword" className={styles.label}>
              새 비밀번호
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              className={`${styles.control} ${
                newPasswordTooShort ? styles.controlInvalid : ''
              }`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-invalid={newPasswordTooShort}
              aria-describedby={
                newPasswordTooShort ? 'newPassword-error' : undefined
              }
            />
            {newPasswordTooShort ? (
              <p id="newPassword-error" className={styles.fieldError}>
                비밀번호는 8자 이상이어야 합니다.
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword" className={styles.label}>
              새 비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              className={`${styles.control} ${
                passwordMismatch ? styles.controlInvalid : ''
              }`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={passwordMismatch}
              aria-describedby={
                passwordMismatch ? 'confirmPassword-error' : undefined
              }
            />
            {passwordMismatch ? (
              <p id="confirmPassword-error" className={styles.fieldError}>
                비밀번호가 일치하지 않습니다.
              </p>
            ) : null}
          </div>

          {fieldError ? (
            <p className={styles.fieldError} role="alert">
              {fieldError}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!canSubmit}
            >
              {submitting ? '변경 중…' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </section>

      <Toast message="비밀번호가 변경되었습니다" visible={showSuccessToast} />
    </div>
  );
}

export default SettingsPage;
