import { Link, useNavigate } from 'react-router-dom';
import { AuthTopBar } from '../components/AuthTopBar';
import { RoleGateCard } from '../components/RoleGateCard';
import { SignupStepper } from '../components/SignupStepper';
import { ROUTES } from '../../../shared/constants/routes';
import { ROLE_META, type UserRole } from '../types/signup';
import styles from './SignupRoleGatePage.module.css';

export function SignupRoleGatePage() {
  const navigate = useNavigate();

  function handleSelectRole(role: UserRole): void {
    navigate(`${ROUTES.SIGNUP_FORM}?role=${role}`);
  }

  return (
    <div className={styles.page}>
      <AuthTopBar label="Step 1 · 업무 유형" />

      <main className={styles.main}>
        <div className={styles.inner}>
          <div className={styles.stepperWrap}>
            <SignupStepper currentStep={1} />
          </div>

          <div className={styles.headingBlock}>
            <h1 className={styles.title}>어떤 업무로 사용하시나요</h1>
            <p className={styles.subtitle}>
              아래 가입 유형을 확인하시고 해당하는 유형을 선택하세요.
            </p>
          </div>

          <div className={styles.grid} role="group" aria-label="업무 유형 선택">
            {(
              Object.entries(ROLE_META) as [
                UserRole,
                (typeof ROLE_META)[UserRole],
              ][]
            ).map(([role, meta]) => (
              <RoleGateCard
                key={role}
                role={role}
                meta={meta}
                onSelect={handleSelectRole}
              />
            ))}
          </div>

          <p className={styles.loginHint}>
            이미 계정이 있으신가요{' '}
            <Link to={ROUTES.LOGIN} className={styles.loginLink}>
              로그인
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default SignupRoleGatePage;
