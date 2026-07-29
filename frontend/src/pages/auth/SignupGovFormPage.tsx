import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchDepartments, signupGov } from '../../api/signup';
import { AuthTopBar } from '../../components/auth/AuthTopBar';
import { FormField } from '../../components/signup/FormField';
import fieldStyles from '../../components/signup/FormField.module.css';
import {
  SignupAccountFields,
  type SignupAccountFieldName,
  type SignupAccountValues,
} from '../../components/signup/SignupAccountFields';
import { SignupStepper } from '../../components/signup/SignupStepper';
import { Toast } from '../../components/ui/Toast';
import { ROUTES } from '../../constants/routes';
import type { Department, SignupGovPayload } from '../../types/signup';
import styles from './SignupFormPage.module.css';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function SignupGovFormPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const role = params.get('role');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState<string | undefined>();

  const [account, setAccount] = useState<SignupAccountValues>({
    loginId: '',
    password: '',
    passwordConfirm: '',
    name: '',
    position: '',
  });
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setDepartmentsLoading(true);
    fetchDepartments()
      .then((list) => {
        if (!cancelled) {
          setDepartments(list);
          setDepartmentsError(undefined);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDepartmentsError('부서 목록을 불러오지 못했습니다');
        }
      })
      .finally(() => {
        if (!cancelled) setDepartmentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const emailInvalid = email.trim() !== '' && !isValidEmail(email.trim());

  const canSubmit = useMemo(() => {
    return (
      isIdChecked &&
      account.password.length >= 8 &&
      account.password === account.passwordConfirm &&
      account.name.trim() !== '' &&
      departmentId !== null &&
      (email.trim() === '' || isValidEmail(email.trim()))
    );
  }, [isIdChecked, account, departmentId, email]);

  const disabledHint = useMemo(() => {
    if (canSubmit) return null;
    if (!isIdChecked) return '아이디 중복확인을 완료하세요';
    if (account.password.length < 8) return '비밀번호는 8자 이상이어야 합니다';
    if (account.password !== account.passwordConfirm) {
      return '비밀번호가 일치하지 않습니다';
    }
    if (account.name.trim() === '') return '이름을 입력하세요';
    if (departmentId === null) return '소속 부서를 선택하세요';
    if (emailInvalid) return '이메일 형식을 확인해 주세요';
    return '필수 항목을 모두 입력하세요';
  }, [canSubmit, isIdChecked, account, departmentId, emailInvalid]);

  if (role !== 'ROLE_A') {
    return <Navigate to={ROUTES.SIGNUP} replace />;
  }

  function handleAccountChange(
    field: SignupAccountFieldName,
    value: string,
  ): void {
    setAccount((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit || departmentId === null || submitting) return;

    const payload: SignupGovPayload = {
      role: 'ROLE_A',
      loginId: account.loginId.trim(),
      password: account.password,
      name: account.name.trim(),
      departmentId,
    };

    const trimmedPosition = account.position.trim();
    if (trimmedPosition) payload.position = trimmedPosition;

    const trimmedEmail = email.trim();
    if (trimmedEmail) payload.email = trimmedEmail;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await signupGov(payload);

      if (result.ok === false) {
        setSubmitError(result.message);
        return;
      }

      setShowSuccessToast(true);
      window.setTimeout(() => {
        navigate(ROUTES.SIGNUP_COMPLETE);
      }, 1200);
    } catch {
      setSubmitError('회원가입에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page} data-accent="teal">
      <AuthTopBar label="Step 2 · 지자체" accent="teal" />
      <div className={styles.accentBar} aria-hidden="true" />

      <main className={styles.main}>
        <div className={styles.inner}>
          <SignupStepper currentStep={2} roleLabel="지자체" accent="teal" />

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <SignupAccountFields
              accent="teal"
              values={account}
              onChange={handleAccountChange}
              isIdChecked={isIdChecked}
              onCheckedChange={setIsIdChecked}
            />

            <section className={styles.section} aria-labelledby="org-heading">
              <div className={styles.sectionHead}>
                <h2 id="org-heading" className={styles.sectionTitle}>
                  소속 정보
                </h2>
                <span className={styles.roleBadge}>지자체</span>
              </div>
              <p className={styles.sectionSub}>
                등록된 부서 목록에서 선택하세요.
              </p>

              <FormField
                id="departmentId"
                label="소속 부서"
                required
                error={departmentsError}
              >
                <select
                  id="departmentId"
                  name="departmentId"
                  value={departmentId ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDepartmentId(value === '' ? null : Number(value));
                  }}
                  className={`${fieldStyles.control} ${fieldStyles.select}`}
                  disabled={departmentsLoading || Boolean(departmentsError)}
                >
                  <option value="">
                    {departmentsLoading
                      ? '부서 목록 불러오는 중…'
                      : '부서를 선택하세요'}
                  </option>
                  {departments.map((dept) => (
                    <option key={dept.departmentId} value={dept.departmentId}>
                      {dept.departmentName}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="email"
                label="이메일"
                hint="· 선택"
                error={
                  emailInvalid ? '이메일 형식이 올바르지 않습니다' : undefined
                }
              >
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${fieldStyles.control} ${
                    emailInvalid ? fieldStyles.controlInvalid : ''
                  }`}
                  placeholder="name@daegu.go.kr"
                  aria-invalid={emailInvalid}
                  aria-describedby={emailInvalid ? 'email-error' : undefined}
                  maxLength={100}
                />
              </FormField>
            </section>

            <div className={styles.actions}>
              <Link to={ROUTES.SIGNUP} className={styles.prevBtn}>
                이전
              </Link>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={!canSubmit || submitting}
              >
                {submitting ? '가입 중…' : '가입 완료'}
              </button>
            </div>
            {submitError ? (
              <p className={styles.submitError} role="alert">
                {submitError}
              </p>
            ) : null}
            {!canSubmit && !submitting && disabledHint ? (
              <p className={styles.submitHint}>{disabledHint}</p>
            ) : null}
          </form>
        </div>
      </main>
      <Toast message="가입성공" visible={showSuccessToast} />
    </div>
  );
}

export default SignupGovFormPage;
