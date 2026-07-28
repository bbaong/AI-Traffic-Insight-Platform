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
    { id: 'priority', label: '우선점검 시군구', path: '/gov/priority' },
    { id: 'risk-map', label: '위험 지도', path: '/common/risk-map' },
    { id: 'stats', label: '사고 통계', path: '/common/accident-stats' },
    { id: 'compare', label: '지역 비교', path: '/gov/compare' },
    { id: 'reports', label: '리포트', path: '/common/reports' },
    { id: 'settings', label: '설정', path: '/common/settings' },
  ],
  ROLE_B: [
    { id: 'dashboard', label: '대시보드', path: ROUTES.DASHBOARD_INS },
    { id: 'customer', label: '고객 분석', path: '/insurance/customer' },
    { id: 'risk-map', label: '위험 지도', path: '/common/risk-map' },
    { id: 'stats', label: '사고 통계', path: '/common/accident-stats' },
    { id: 'cohort', label: '고객군 비교', path: '/insurance/cohort' },
    { id: 'reports', label: '리포트', path: '/common/reports' },
    { id: 'settings', label: '설정', path: '/common/settings' },
  ],
};
