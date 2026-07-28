import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types/auth';

export interface RoleRouteProps {
  allow: UserRole;
}

/**
 * 허용 role만 통과. 다른 role이면 자기 대시보드로 돌려보낸다.
 */
export function RoleRoute({ allow }: RoleRouteProps) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (user.role !== allow) {
    const fallback =
      user.role === 'ROLE_A' ? ROUTES.DASHBOARD_GOV : ROUTES.DASHBOARD_INS;
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
