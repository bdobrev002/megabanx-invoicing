import { apiFetch } from './client'
import type { AuthUser } from '@/types/auth.types'

interface LoginResponse {
  needs_tos?: boolean
  message?: string
}

interface VerifyResponse {
  token: string
  user: AuthUser
}

export const authApi = {
  register: (name: string, email: string, tos_accepted: boolean) =>
    apiFetch<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, tos_accepted }),
    }),

  login: (email: string, tos_accepted?: boolean, name?: string) =>
    apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, tos_accepted, name }),
    }),

  verify: (email: string, code: string) =>
    apiFetch<VerifyResponse>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  me: () => apiFetch<AuthUser>('/auth/me'),

  logout: () =>
    apiFetch<void>('/auth/logout', { method: 'POST' }).catch(() => {
      // Server logout may fail if token expired, that's ok
    }),
}
