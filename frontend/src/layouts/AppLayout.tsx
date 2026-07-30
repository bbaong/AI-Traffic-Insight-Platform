import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { ROUTES } from '../constants/routes';
import { useAuthStore } from '../stores/authStore';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const title =
    location.pathname === ROUTES.MYPAGE
      ? '마이페이지'
      : user.role === 'ROLE_A'
        ? '지자체 대시보드'
        : '보험사 대시보드';

  return (
    <div
      className={styles.layout}
      data-accent={user.role === 'ROLE_A' ? 'teal' : 'amber'}
    >
      <div
        className={`${styles.backdrop} ${sidebarOpen ? styles.backdropVisible : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      <Sidebar
        role={user.role}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />

      <div className={styles.mainColumn}>
        <Header
          title={title}
          role={user.role}
          onMenuClick={() => setSidebarOpen((v) => !v)}
          menuOpen={sidebarOpen}
        />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}