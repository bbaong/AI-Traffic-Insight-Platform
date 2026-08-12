import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../../shared/layouts/AppLayout';
import { ROUTES } from '../../shared/constants/routes';
import { LandingPage } from '../../pages/home/LandingPage';
import { LoginPage } from '../../domains/auth/pages/LoginPage';
import { SignupFormEntryPage } from '../../domains/auth/pages/SignupFormEntryPage';
import { SignupRoleGatePage } from '../../domains/auth/pages/SignupRoleGatePage';
import { GovDashboardPage } from '../../domains/gov/pages/GovDashboardPage';
import { InsDashboardPage } from '../../domains/ins/pages/InsDashboardPage';
import { DevPolygonPickerPage } from '../../pages/dev/DevPolygonPickerPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { MyPage } from '../../pages/mypage/MyPage';
import { SettingsGate } from '../../pages/settings/SettingsGate';
import { ReportsPage } from '../../domains/reports/pages/ReportsPage';
import { CustomersPage } from '../../domains/ins/pages/CustomersPage';

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

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<RoleRoute allow="ROLE_A" />}>
            <Route path={ROUTES.DASHBOARD_GOV} element={<GovDashboardPage />} />
          </Route>
          <Route element={<RoleRoute allow="ROLE_B" />}>
            <Route path={ROUTES.DASHBOARD_INS} element={<InsDashboardPage />} />
            <Route path={ROUTES.CUSTOMERS} element={<CustomersPage />} />
          </Route>
          <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
          <Route path={ROUTES.MYPAGE} element={<MyPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsGate />} />
        </Route>
      </Route>

      <Route path="/dev/polygon-picker" element={<DevPolygonPickerPage />} />
      <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
    </Routes>
  );
}
