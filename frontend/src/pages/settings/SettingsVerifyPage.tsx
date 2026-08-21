import { useState, type FormEvent } from 'react';
import { verifyPassword } from '../../shared/api/user';
import { useAuthStore } from '../../shared/stores/authStore';
import { useSettingsVerifyStore } from '../../shared/stores/settingsVerifyStore';
import styles from './SettingsPage.module.css';

export function SettingsVerifyPage() {
  const user = useAuthStore((s) => s.user);
  const markVerified = useSettingsVerifyStore((s) => s.markVerified);

  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const canSubmit = password !== '' && !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user || submitting) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      const result = await verifyPassword({
        password,
      });

      if (result.ok === false) {
        setSubmitError(result.message);
        return;
      }

      markVerified();
    } catch {
      setSubmitError('비밀번호 확인에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section
        className={styles.card}
        aria-labelledby="settings-verify-heading"
      >
        <h2 id="settings-verify-heading" className={styles.cardTitle}>
          비밀번호 재확인
        </h2>
        <p className={styles.hint}>
          설정 페이지로 이동하려면 현재 비밀번호를 입력해 주세요.
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError ? (
            <p className={styles.errorBanner} role="alert">
              {submitError}
            </p>
          ) : null}

          <div className={styles.field}>
            <label htmlFor="verifyPassword" className={styles.label}>
              현재 비밀번호
            </label>
            <input
              id="verifyPassword"
              name="verifyPassword"
              type="password"
              autoComplete="current-password"
              className={styles.control}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!canSubmit}
            >
              {submitting ? '확인 중…' : '확인'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default SettingsVerifyPage;
