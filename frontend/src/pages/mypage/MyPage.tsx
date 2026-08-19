import { useEffect, useState } from 'react';
import { fetchDepartments } from '../../domains/auth/api/signup';
import { changeEmail, changePosition } from '../../shared/api/user';
import { useAuthStore } from '../../shared/stores/authStore';
import styles from './MyPage.module.css';
import { isValidEmail } from '../../shared/utils/email';

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
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className={styles.metaIcon}
      width="14"
      height="14"
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M480-120q-138 0-240.5-91.5T122-440h82q14 104 92.5 172T480-200q117 0 198.5-81.5T760-480q0-117-81.5-198.5T480-760q-69 0-129 32t-101 88h110v80H120v-240h80v94q51-64 124.5-99T480-840q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-480q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-120Zm112-192L440-464v-216h80v184l128 128-56 56Z" />
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
  const [positionInput, setPositionInput] = useState(
    () => user?.position?.trim() ?? '',
  );
  const [positionFeedback, setPositionFeedback] = useState<{
    text: string;
    tone: 'error' | 'success';
  } | null>(null);
  const [saving, setSaving] = useState<'email' | 'position' | null>(null);

  const isGov = user?.role === 'ROLE_A';

  useEffect(() => {
    setEmail(user?.email?.trim() ?? '');
    setEmailFeedback(null);
    setPositionInput(user?.position?.trim() ?? '');
    setPositionFeedback(null);
  }, [user?.userId]);

  useEffect(() => {
    setEmail(user?.email?.trim() ?? '');
  }, [user?.email]);

  useEffect(() => {
    setPositionInput(user?.position?.trim() ?? '');
  }, [user?.position]);

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
  const positionTooLong = positionInput.trim().length > 50;
  const userId = user.userId;

  async function handleChangeEmail() {
    if (saving) return;
    const trimmed = email.trim();
    if (trimmed && !isValidEmail(trimmed)) {
      setEmailFeedback({
        text: '이메일 형식을 확인해 주세요',
        tone: 'error',
      });
      return;
    }
    setEmailFeedback(null);
    setSaving('email');
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
      setSaving(null);
    }
  }

  async function handleChangePosition() {
    if (saving) return;
    const trimmed = positionInput.trim();
    if (trimmed.length > 50) {
      setPositionFeedback({
        text: '직급·직책은 50자 이하여야 합니다',
        tone: 'error',
      });
      return;
    }
    setPositionFeedback(null);
    setSaving('position');
    try {
      const result = await changePosition({
        userId,
        position: trimmed,
      });
      if (!result.ok) {
        setPositionFeedback({ text: result.message, tone: 'error' });
        return;
      }
      patchUser({ position: result.position });
      setPositionFeedback({
        text: result.message,
        tone: result.changed ? 'success' : 'error',
      });
    } finally {
      setSaving(null);
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
  ];

  const affiliationRow = {
    label: affiliationLabel,
    value: affiliationValue || '미등록',
    muted: !affiliationValue,
  };

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
          <p className={styles.cardHint}>이메일·직급 수정 가능 · 선택 항목</p>
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
            <dt className={styles.label}>직급·직책</dt>
            <dd className={styles.value}>
              <div className={styles.emailEdit}>
                <input
                  type="text"
                  className={`${styles.emailInput}${positionTooLong ? ` ${styles.emailInputInvalid}` : ''}`}
                  value={positionInput}
                  onChange={(e) => {
                    setPositionInput(e.target.value);
                    setPositionFeedback(null);
                  }}
                  placeholder="직급·직책이 등록되지 않았습니다."
                  maxLength={50}
                  autoComplete="organization-title"
                  aria-invalid={positionTooLong}
                />
                <button
                  type="button"
                  className={styles.emailBtn}
                  disabled={saving !== null || positionTooLong}
                  onClick={() => void handleChangePosition()}
                >
                  {saving === 'position' ? '저장 중…' : '변경'}
                </button>
              </div>
              {positionFeedback || positionTooLong ? (
                <p
                  className={
                    positionFeedback?.tone === 'success'
                      ? styles.emailSuccess
                      : styles.emailError
                  }
                >
                  {positionFeedback?.text ?? '직급·직책은 50자 이하여야 합니다'}
                </p>
              ) : null}
            </dd>
          </div>

          <div className={styles.row}>
            <dt className={styles.label}>{affiliationRow.label}</dt>
            <dd
              className={`${styles.value}${affiliationRow.muted ? ` ${styles.mutedValue}` : ''}`}
            >
              {affiliationRow.value}
            </dd>
          </div>

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
                  disabled={saving !== null || emailInvalid}
                  onClick={() => void handleChangeEmail()}
                >
                  {saving === 'email' ? '저장 중…' : '변경'}
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
