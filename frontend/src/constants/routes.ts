export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  SIGNUP_FORM: '/signup/form',
  SIGNUP_COMPLETE: '/signup/complete',
  DASHBOARD_GOV: '/dashboard/gov',
  DASHBOARD_INS: '/dashboard/insurance',
  MYPAGE: '/mypage',
  SETTINGS: '/common/settings',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
