export const ROUTES = {
  LANDING: '/',
  LANDING_GOV: '/solutions/gov',
  LANDING_INS: '/solutions/ins',
  LOGIN: '/login',
  SIGNUP: '/signup',
  SIGNUP_FORM: '/signup/form',
  DASHBOARD_GOV: '/dashboard/gov',
  DASHBOARD_GOV_COMPARE: '/dashboard/gov/compare',
  DASHBOARD_INS: '/dashboard/insurance',
  MYPAGE: '/mypage',
  SETTINGS: '/common/settings',
  REPORTS: '/common/reports',
  CUSTOMERS: '/common/customers',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
