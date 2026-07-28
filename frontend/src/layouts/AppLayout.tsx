import { Navigate, Outlet } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { ROUTES } from '../constants/routes';
import { useAuthStore } from '../stores/authStore';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const title =
    user.role === 'ROLE_A' ? '지자체 대시보드' : '보험사 대시보드';

  return (
    <div className={styles.layout} data-accent={user.role === 'ROLE_A' ? 'teal' : 'amber'}>
      <Sidebar role={user.role} />
      <div className={styles.mainColumn}>
        <Header title={title} role={user.role} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AppLayout;
