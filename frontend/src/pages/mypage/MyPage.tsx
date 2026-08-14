import { useEffect, useState } from 'react';
import { fetchDepartments } from '../../domains/auth/api/signup';
import { changeEmail } from '../../shared/api/user';
import { useAuthStore } from '../../shared/stores/authStore';
import styles from './MyPage.module.css';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatDateOnly(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CalendarIcon() {
  return (
    <svg
      className={styles.metaIcon}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className={styles.metaIcon}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function MyPage() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const [resolvedDeptName, setResolvedDeptName] = useState<string | null>(null);
  const [email, setEmail] = useState(() => user?.email?.trim() ?? '');
  const [emailFeedback, setEmailFeedback] = useState<{
    text: string;
    tone: 'error' | 'success';
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isGov = user?.role === 'ROLE_A';

  useEffect(() => {
    setEmail(user?.email?.trim() ?? '');
    setEmailFeedback(null);
  }, [user?.userId]);

  useEffect(() => {
    setEmail(user?.email?.trim() ?? '');
  }, [user?.email]);

  // TODO: 서버 로그인 응답에 department_name 추가 필요 (departments join)
  // 현재 auth.ts는 department_name이 오면 매핑하고, 없으면 null.
  // null + departmentId만 있을 때 fetchDepartments로 임시 매칭.
  useEffect(() => {
    if (!user || user.role !== 'ROLE_A') {
      setResolvedDeptName(null);
      return;
    }
    if (user.departmentName?.trim()) {
      setResolvedDeptName(user.departmentName.trim());
      return;
    }
    if (user.departmentId == null) {
      setResolvedDeptName(null);
      return;
    }

    let cancelled = false;
    const deptId = user.departmentId;

    fetchDepartments()
      .then((list) => {
        if (cancelled) return;
        const found = list.find((d) => d.departmentId === deptId);
        setResolvedDeptName(found?.departmentName?.trim() || null);
      })
      .catch(() => {
        if (!cancelled) setResolvedDeptName(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const accentClass = isGov ? styles.accentTeal : styles.accentAmber;
  const affiliationLabel = isGov ? '소속 부서' : '회사명·소속';
  const affiliationValue = isGov
    ? resolvedDeptName
    : user.orgName?.trim() || null;

  const position = user.position?.trim() || null;
  const subtitleParts = [
    isGov ? resolvedDeptName : user.orgName?.trim() || null,
    position,
  ].filter(Boolean);
  const subtitle = subtitleParts.join(' · ');

  const initial = (user.name.trim().charAt(0) || '?').toUpperCase();
  const createdLabel = formatDateOnly(user.createdAt);
  const lastLoginLabel = formatDateTime(user.lastLoginAt);

  const emailInvalid = email.trim() !== '' && !isValidEmail(email.trim());
  const userId = user.userId;

  async function handleChangeEmail() {
    if (submitting) return;
    const trimmed = email.trim();
    if (trimmed && !isValidEmail(trimmed)) {
      setEmailFeedback({
        text: '이메일 형식을 확인해 주세요',
        tone: 'error',
      });
      return;
    }
    setEmailFeedback(null);
    setSubmitting(true);
    try {
      const result = await changeEmail({
        userId,
        email: trimmed,
      });
      if (!result.ok) {
        setEmailFeedback({ text: result.message, tone: 'error' });
        return;
      }
      patchUser({ email: result.email });
      setEmailFeedback({
        text: result.message,
        tone: result.changed ? 'success' : 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const rows: {
    label: string;
    value: string;
    muted?: boolean;
    mono?: boolean;
  }[] = [
    {
      label: '아이디',
      value: user.loginId || '—',
      mono: true,
    },
    { label: '이름', value: user.name },
    {
      label: '직급·직책',
      value: position || '미등록',
      muted: !position,
    },
    {
      label: affiliationLabel,
      value: affiliationValue || '미등록',
      muted: !affiliationValue,
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.profile}>
        <div className={`${styles.avatar} ${accentClass}`} aria-hidden="true">
          {initial}
        </div>
        <div className={styles.profileText}>
          <h2 className={styles.name}>{user.name}</h2>
          {subtitle ? (
            <p className={styles.subtitle}>{subtitle}</p>
          ) : null}
        </div>
      </header>

      <section className={styles.card} aria-labelledby="mypage-account-heading">
        <div className={styles.cardHead}>
          <h3 id="mypage-account-heading" className={styles.cardTitle}>
            계정 정보
          </h3>
          <p className={styles.cardHint}>이메일 수정 가능 · 선택 항목</p>
        </div>
        <dl className={styles.list}>
          {rows.map((row) => (
            <div key={row.label} className={styles.row}>
              <dt className={styles.label}>{row.label}</dt>
              <dd
                className={`${styles.value}${row.mono ? ` ${styles.mono}` : ''}${row.muted ? ` ${styles.mutedValue}` : ''}`}
              >
                {row.value}
              </dd>
            </div>
          ))}

          <div className={styles.row}>
            <dt className={styles.label}>이메일</dt>
            <dd className={styles.value}>
              <div className={styles.emailEdit}>
                <input
                  type="email"
                  className={`${styles.emailInput}${emailInvalid ? ` ${styles.emailInputInvalid}` : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailFeedback(null);
                  }}
                  placeholder="이메일이 등록되지 않았습니다."
                  autoComplete="email"
                  aria-invalid={emailInvalid}
                />
                <button
                  type="button"
                  className={styles.emailBtn}
                  disabled={submitting || emailInvalid}
                  onClick={() => void handleChangeEmail()}
                >
                  {submitting ? '저장 중…' : '변경'}
                </button>
              </div>
              {emailFeedback || emailInvalid ? (
                <p
                  className={
                    emailFeedback?.tone === 'success'
                      ? styles.emailSuccess
                      : styles.emailError
                  }
                >
                  {emailFeedback?.text ?? '이메일 형식을 확인해 주세요'}
                </p>
              ) : null}
            </dd>
          </div>
        </dl>

      </section>

      <footer className={styles.meta}>
        {createdLabel ? (
          <span className={styles.metaItem}>
            <CalendarIcon />
            가입 {createdLabel}
          </span>
        ) : null}
        {lastLoginLabel ? (
          <span className={styles.metaItem}>
            <ClockIcon />
            최근 로그인 {lastLoginLabel}
          </span>
        ) : null}
      </footer>
    </div>
  );
}

export default MyPage;
