import { useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { signupIns } from '../api/signup';
import { AuthTopBar } from '../components/AuthTopBar';
import { FormField } from '../components/FormField';
import fieldStyles from '../components/FormField.module.css';
import {
  SignupAccountFields,
  type SignupAccountFieldName,
  type SignupAccountValues,
} from '../components/SignupAccountFields';
import { SignupStepper } from '../components/SignupStepper';
import { Toast } from '../../../shared/components/ui/Toast';
import { ROUTES } from '../../../shared/constants/routes';
import type { SignupInsPayload } from '../types/signup';
import styles from './SignupFormPage.module.css';
import { isValidEmail } from '../../../shared/utils/email';

export function SignupInsFormPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const role = params.get('role');

  const [account, setAccount] = useState<SignupAccountValues>({
    loginId: '',
    password: '',
    passwordConfirm: '',
    name: '',
    position: '',
  });
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const emailInvalid = email.trim() !== '' && !isValidEmail(email.trim());
  const orgNameTrimmed = orgName.trim();
  const orgNameValid =
    orgNameTrimmed !== '' && orgName.length <= 100;

  const canSubmit = useMemo(() => {
    return (
      isIdChecked &&
      account.password.length >= 8 &&
      account.password === account.passwordConfirm &&
      account.name.trim() !== '' &&
      orgNameValid &&
      (email.trim() === '' || isValidEmail(email.trim()))
    );
  }, [isIdChecked, account, orgNameValid, email]);

  const disabledHint = useMemo(() => {
    if (canSubmit) return null;
    if (!isIdChecked) return '아이디 중복확인을 완료하세요';
    if (account.password.length < 8) return '비밀번호는 8자 이상이어야 합니다';
    if (account.password !== account.passwordConfirm) {
      return '비밀번호가 일치하지 않습니다';
    }
    if (account.name.trim() === '') return '이름을 입력하세요';
    if (orgNameTrimmed === '') return '회사명·소속을 입력하세요';
    if (orgName.length > 100) return '회사명은 100자 이하여야 합니다';
    if (emailInvalid) return '이메일 형식을 확인해 주세요';
    return '필수 항목을 모두 입력하세요';
  }, [
    canSubmit,
    isIdChecked,
    account,
    orgNameTrimmed,
    orgName.length,
    emailInvalid,
  ]);

  if (role !== 'ROLE_B') {
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
    if (!canSubmit || submitting) return;

    const payload: SignupInsPayload = {
      role: 'ROLE_B',
      loginId: account.loginId.trim(),
      password: account.password,
      name: account.name.trim(),
      orgName: orgNameTrimmed,
    };

    const trimmedPosition = account.position.trim();
    if (trimmedPosition) payload.position = trimmedPosition;

    const trimmedEmail = email.trim();
    if (trimmedEmail) payload.email = trimmedEmail;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await signupIns(payload);

      if (result.ok === false) {
        setSubmitError(result.message);
        return;
      }

      setShowSuccessToast(true);
      window.setTimeout(() => {
        navigate(ROUTES.LANDING, {
          replace: true,
          state: { signupSuccess: true },
        });
      }, 1200);
    } catch {
      setSubmitError('회원가입에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page} data-accent="amber">
      <AuthTopBar label="Step 2 · 보험사" />
      <div className={styles.accentBar} aria-hidden="true" />

      <main className={styles.main}>
        <div className={styles.inner}>
          <SignupStepper currentStep={2} roleLabel="보험사" />

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <SignupAccountFields
              accent="amber"
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
                <span className={styles.roleBadge}>보험사</span>
              </div>
              <p className={styles.sectionSub}>
                소속 회사·지역본부명을 입력하세요.
              </p>

              <FormField id="orgName" label="회사명·소속" required>
                <input
                  id="orgName"
                  name="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className={fieldStyles.control}
                  placeholder="예) OO손해보험 대구 수성지역본부"
                  maxLength={100}
                />
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
                  placeholder="name@company.com"
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

export default SignupInsFormPage;
