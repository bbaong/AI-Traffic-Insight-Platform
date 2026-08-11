import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { ROUTES } from '../constants/routes';
import { useAuthStore } from '../../stores/authStore';
import styles from './AppLayout.module.css';

const SIDEBAR_DRAWER_MQ = '(max-width: 1100px)';
const INS_CUSTOMERS_PAGE_CLASS = 'ins-customers-page';

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isInsCustomers = location.pathname === ROUTES.CUSTOMERS;

  useEffect(() => {
    const roots = [
      document.documentElement,
      document.body,
      document.getElementById('root'),
    ];
    if (isInsCustomers) {
      roots.forEach((el) => el?.classList.add(INS_CUSTOMERS_PAGE_CLASS));
    } else {
      roots.forEach((el) => el?.classList.remove(INS_CUSTOMERS_PAGE_CLASS));
    }
    return () => {
      roots.forEach((el) => el?.classList.remove(INS_CUSTOMERS_PAGE_CLASS));
    };
  }, [isInsCustomers]);

  useEffect(() => {
    const mq = window.matchMedia(SIDEBAR_DRAWER_MQ);
    function onChange(e: MediaQueryListEvent | MediaQueryList) {
      if (!('matches' in e ? e.matches : mq.matches)) {
        setSidebarOpen(false);
      }
    }
    onChange(mq);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [sidebarOpen]);

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  
  const title =
  location.pathname === ROUTES.MYPAGE
    ? '마이페이지'
    : location.pathname === ROUTES.REPORTS
      ? '리포트'
      : location.pathname === ROUTES.DASHBOARD_INS
        ? '보험 상담 대시보드'
        : location.pathname === ROUTES.CUSTOMERS
          ? '고객관리'
          : user.role === 'ROLE_A'
          ? '지자체 대시보드'
          : '보험사 대시보드';

  return (
    <div
      className={`${styles.layout}${isInsCustomers ? ` ${styles.layoutInsCustomers}` : ''}`}
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

      <div
        className={`${styles.mainColumn}${
          isInsCustomers ? ` ${styles.mainColumnInsCustomers}` : ''
        }`}
      >
        <Header
          title={title}
          role={user.role}
          onMenuClick={() => setSidebarOpen((v) => !v)}
          menuOpen={sidebarOpen}
        />
        <div
          className={`${styles.content}${
            location.pathname === ROUTES.DASHBOARD_INS
              ? ` ${styles.contentIns}`
              : location.pathname === ROUTES.CUSTOMERS
                ? ` ${styles.contentCustomers}`
                : ''
          }`}
        >
          <Outlet />
        </div>
      </div>
    </div>
  );
}
