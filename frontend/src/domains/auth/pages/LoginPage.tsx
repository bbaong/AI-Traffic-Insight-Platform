import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { AuthTopBar } from '../components/AuthTopBar';
import {
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
} from '../components/RoleIcons';
import { ROUTES } from '../../../shared/constants/routes';
import { useAuthStore } from '../../../shared/stores/authStore';
import styles from './LoginPage.module.css';

const MAX_FAILURES = 5;
const LOCK_MS = 10 * 60 * 1000;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAttemptHint, setShowAttemptHint] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // 잠금 상태 체크
  const isLocked = lockedUntil !== null && now < lockedUntil;

  // 잠금 시간 체크
  useEffect(() => {
    if (!lockedUntil) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockedUntil) {
        setLockedUntil(null);
        setFailCount(0);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  // 로그인 처리
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting || isLocked) return;

    setSubmitting(true);
    setErrorMessage(null);
    setShowAttemptHint(false);

    try {
      // 로그인 요청
      const result = await login({
        loginId: loginId.trim(),
        password,
      });

      // 로그인 실패 처리
      if (result.ok === false) {
        // 비활성화된 계정 처리
        if (result.reason === 'INACTIVE') {
          setErrorMessage('비활성화된 계정입니다. 관리자에게 문의하세요.');
          setShowAttemptHint(false);
          return;
        }

        // 실패 회수 증가
        const nextFails = failCount + 1;
        setFailCount(nextFails);
        setErrorMessage('아이디 또는 비밀번호가 올바르지 않습니다.');
        setShowAttemptHint(true);

        // 최대 실패 회수 초과 시 잠금
        if (nextFails >= MAX_FAILURES) {
          setLockedUntil(Date.now() + LOCK_MS);
        }
        return;
      }

      setFailCount(0);
      setLockedUntil(null);
      setSession(result.user, result.accessToken, result.refreshToken, remember);

      // 관리자 계정 처리
      if (result.user.role === 'ROLE_A') {
        navigate(ROUTES.DASHBOARD_GOV, { replace: true });
      } else {
        // 보험사 계정 처리
        navigate(ROUTES.DASHBOARD_INS, { replace: true });
      }
    } finally {
      // 로그인 완료 후 상태 초기화
      setSubmitting(false);
    }
  }

  // 제출 가능 여부 체크
  const canSubmit =
    !submitting &&
    !isLocked &&
    loginId.trim() !== '' &&
    password !== '';

  // 페이지 렌더링
  return (
    <div className={styles.page}>
      <AuthTopBar />

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h1 className={styles.title}>로그인</h1>
            <p className={styles.subtitle}>
              기관에서 발급받은 계정으로 접속합니다.
            </p>
          </div>

          <form className={styles.body} onSubmit={handleSubmit} noValidate>
            {errorMessage ? (
              <div className={styles.errorBanner} role="alert" id="login-error">
                <span className={styles.errorIcon} aria-hidden="true">
                  <AlertCircleIcon size={18} />
                </span>
                <div>
                  <p className={styles.errorText}>{errorMessage}</p>
                  {showAttemptHint ? (
                    <p className={styles.errorHint}>
                      5회 실패 시 10분간 제한됩니다. (현재 {failCount}회)
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className={styles.field}>
              <label htmlFor="loginId" className={styles.label}>
                아이디
              </label>
              <input
                id="loginId"
                name="loginId"
                type="text"
                autoComplete="username"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className={styles.control}
                placeholder="아이디를 입력하세요"
                aria-describedby={errorMessage ? 'login-error' : undefined}
                disabled={isLocked}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                비밀번호
              </label>
              <div className={styles.passwordWrap}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.control}
                  placeholder="비밀번호를 입력하세요"
                  aria-describedby={errorMessage ? 'login-error' : undefined}
                  disabled={isLocked}
                />
                <button
                  type="button"
                  className={styles.toggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                  disabled={isLocked}
                >
                  {showPassword ? (
                    <EyeOffIcon size={18} />
                  ) : (
                    <EyeIcon size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className={styles.rememberRow}>
              <input
                id="remember"
                name="remember"
                type="checkbox"
                className={styles.checkbox}
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isLocked}
              />
              <label htmlFor="remember" className={styles.rememberLabel}>
                로그인 상태 유지
              </label>
            </div>

            <button
              type="submit"
              className={styles.submit}
              disabled={!canSubmit}
            >
              {submitting ? '로그인 중…' : '로그인'}
            </button>

            {isLocked ? (
              <p className={styles.lockHint}>잠시 후 다시 시도하세요</p>
            ) : null}

            <hr className={styles.divider} />

            <p className={styles.signupHint}>
              계정이 없으신가요{' '}
              <Link to={ROUTES.SIGNUP} className={styles.signupLink}>
                회원가입
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
