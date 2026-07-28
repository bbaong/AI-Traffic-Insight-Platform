import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../../layouts/AppLayout';
import { ROUTES } from '../../constants/routes';
import { LandingPage } from '../../pages/home/LandingPage';
import { LoginPage } from '../../pages/auth/LoginPage';
import { SignupCompletePage } from '../../pages/auth/SignupCompletePage';
import { SignupFormEntryPage } from '../../pages/auth/SignupFormEntryPage';
import { SignupRoleGatePage } from '../../pages/auth/SignupRoleGatePage';
import { GovDashboardPage } from '../../pages/gov/GovDashboardPage';
import { InsDashboardPage } from '../../pages/ins/InsDashboardPage';
import { DevPolygonPickerPage } from '../../pages/dev/DevPolygonPickerPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

/**
 * 앱 라우터.
 * 랜딩·인증은 ProtectedRoute 바깥.
 * 대시보드는 AppLayout + ProtectedRoute + RoleRoute 안쪽.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.LANDING} element={<LandingPage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.SIGNUP} element={<SignupRoleGatePage />} />
      <Route path={ROUTES.SIGNUP_FORM} element={<SignupFormEntryPage />} />
      <Route path={ROUTES.SIGNUP_COMPLETE} element={<SignupCompletePage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<RoleRoute allow="ROLE_A" />}>
            <Route path={ROUTES.DASHBOARD_GOV} element={<GovDashboardPage />} />
          </Route>
          <Route element={<RoleRoute allow="ROLE_B" />}>
            <Route path={ROUTES.DASHBOARD_INS} element={<InsDashboardPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/dev/polygon-picker" element={<DevPolygonPickerPage />} />
      <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
    </Routes>
  );
}
