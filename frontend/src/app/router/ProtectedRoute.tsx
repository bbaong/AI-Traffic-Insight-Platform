import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../../shared/constants/routes';
import { useAuthStore } from '../../stores/authStore';

/** 로그인 필수. 없으면 /login */
export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
