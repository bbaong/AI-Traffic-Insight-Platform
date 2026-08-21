import { ROUTES } from './routes';
import type { UserRole } from '../types/auth';

export type SidebarIcon =
  | 'home'
  | 'compare'
  | 'user'
  | 'file'
  | 'settings'
  | 'customers';

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: SidebarIcon;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

export const SIDEBAR_MENUS: Record<UserRole, MenuSection[]> = {
  ROLE_A: [
    {
      id: 'workspace',
      title: '워크스페이스',
      items: [
        { id: 'dashboard', label: '대시보드', path: ROUTES.DASHBOARD_GOV, icon: 'home' },
      ],
    },
    {
      id: 'tools',
      title: '분석',
      items: [
        {
          id: 'compare',
          label: '지역비교',
          path: ROUTES.DASHBOARD_GOV_COMPARE,
          icon: 'compare',
        },
        { id: 'reports', label: '리포트', path: ROUTES.REPORTS, icon: 'file' },
      ],
    },
    {
      id: 'account',
      title: '계정',
      items: [
        { id: 'mypage', label: '마이페이지', path: ROUTES.MYPAGE, icon: 'user' },
        { id: 'settings', label: '설정', path: ROUTES.SETTINGS, icon: 'settings' },
      ],
    },
  ],
  ROLE_B: [
    {
      id: 'workspace',
      title: '워크스페이스',
      items: [
        {
          id: 'dashboard',
          label: '대시보드',
          path: ROUTES.DASHBOARD_INS,
          icon: 'home',
        },
      ],
    },
    {
      id: 'tools',
      title: '상담',
      items: [
        {
          id: 'customers',
          label: '고객관리',
          path: ROUTES.CUSTOMERS,
          icon: 'customers',
        },
        { id: 'reports', label: '리포트', path: ROUTES.REPORTS, icon: 'file' },
      ],
    },
    {
      id: 'account',
      title: '계정',
      items: [
        { id: 'mypage', label: '마이페이지', path: ROUTES.MYPAGE, icon: 'user' },
        { id: 'settings', label: '설정', path: ROUTES.SETTINGS, icon: 'settings' },
      ],
    },
  ],
};

export function flattenSidebarMenus(role: UserRole): MenuItem[] {
  return SIDEBAR_MENUS[role].flatMap((section) => section.items);
}
