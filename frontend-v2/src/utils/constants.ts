const defaultApiUrl =
  typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? defaultApiUrl

export const APP_NAME = 'MegaBanx'

export const ROUTES = {
  HOME: '/',
  HOW: '/how',
  SCREENSHOTS: '/screenshots',
  SECURITY: '/security',
  PRICING: '/pricing',
  FAQ: '/faq',
  ABOUT_US: '/about-us',
  CONTACT: '/contact',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  COOKIES: '/cookies',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY: '/verify',
  DASHBOARD: '/dashboard',
  COMPANIES: '/dashboard/companies',
  UPLOAD: '/dashboard/upload',
  FILES: '/dashboard/files',
  HISTORY: '/dashboard/history',
  NOTIFICATIONS: '/dashboard/notifications',
  BILLING: '/dashboard/billing',
  INVOICING: '/dashboard/invoicing',
  SETTINGS: '/dashboard/settings',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_COMPANIES: '/admin/companies',
  ADMIN_VERIFICATIONS: '/admin/verifications',
  ADMIN_BILLING: '/admin/billing',
  ADMIN_LOGS: '/admin/logs',
  ADMIN_SETTINGS: '/admin/settings',
} as const
