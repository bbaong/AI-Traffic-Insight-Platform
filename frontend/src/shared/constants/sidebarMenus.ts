import { ROUTES } from './routes';
import type { UserRole } from '../types/auth';

export interface MenuItem {
  id: string;
  label: string;
  path: string;
}

export const SIDEBAR_MENUS: Record<UserRole, MenuItem[]> = {
  ROLE_A: [
    { id: 'dashboard', label: '대시보드', path: ROUTES.DASHBOARD_GOV },
    { id: 'mypage', label: '마이페이지', path: ROUTES.MYPAGE },
    { id: 'reports', label: '리포트', path: ROUTES.REPORTS },
    { id: 'settings', label: '설정', path: ROUTES.SETTINGS },
  ],
  ROLE_B: [
    { id: 'dashboard', label: '대시보드', path: ROUTES.DASHBOARD_INS },
    { id: 'customers', label: '고객관리', path: ROUTES.CUSTOMERS },
    { id: 'reports', label: '리포트', path: ROUTES.REPORTS },
    { id: 'mypage', label: '마이페이지', path: ROUTES.MYPAGE },
    { id: 'settings', label: '설정', path: ROUTES.SETTINGS },
  ],
};
