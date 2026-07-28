import { Navigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { SignupGovFormPage } from './SignupGovFormPage';
import { SignupInsFormPage } from './SignupInsFormPage';

/**
 * Step 2 진입점.
 * ROLE_A → 지자체 폼, ROLE_B → 보험사 폼, 그 외 → 게이트.
 */
export function SignupFormEntryPage() {
  const [params] = useSearchParams();
  const role = params.get('role');

  if (role === 'ROLE_A') {
    return <SignupGovFormPage />;
  }

  if (role === 'ROLE_B') {
    return <SignupInsFormPage />;
  }

  return <Navigate to={ROUTES.SIGNUP} replace />;
}

export default SignupFormEntryPage;
