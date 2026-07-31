import { useEffect, useState, type FormEvent } from 'react';
import { changePassword } from '../../api/user';
import { Toast } from '../../components/ui/Toast';
import { useAuthStore } from '../../stores/authStore';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    if (!showSuccessToast) return;
    const id = window.setTimeout(() => setShowSuccessToast(false), 1400);
    return () => window.clearTimeout(id);
  }, [showSuccessToast]);

  if (!user) return null;

  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const newPasswordTooShort =
    newPassword.length > 0 && newPassword.length < 8;
  const sameAsCurrent =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    currentPassword === newPassword;

  const canSubmit =
    currentPassword !== '' &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !sameAsCurrent &&
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
    if (currentPassword === newPassword) {
      setFieldError('현재 비밀번호와 동일합니다.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await changePassword({
        userId: user.userId,
        currentPassword,
        newPassword,
      });

      if (result.ok === false) {
        setSubmitError(result.message);
        return;
      }

      setCurrentPassword('');
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
          현재 비밀번호 확인 후 새 비밀번호로 변경합니다. (최소 8자)
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError ? (
            <p className={styles.errorBanner} role="alert">
              {submitError}
            </p>
          ) : null}

          <div className={styles.field}>
            <label htmlFor="currentPassword" className={styles.label}>
              현재 비밀번호
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              className={styles.control}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

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
                newPasswordTooShort || sameAsCurrent
                  ? styles.controlInvalid
                  : ''
              }`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              aria-invalid={newPasswordTooShort || sameAsCurrent}
              aria-describedby={
                newPasswordTooShort || sameAsCurrent
                  ? 'newPassword-error'
                  : undefined
              }
            />
            {newPasswordTooShort ? (
              <p id="newPassword-error" className={styles.fieldError}>
                비밀번호는 8자 이상이어야 합니다.
              </p>
            ) : null}
            {!newPasswordTooShort && sameAsCurrent ? (
              <p id="newPassword-error" className={styles.fieldError}>
                현재 비밀번호와 동일합니다.
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
