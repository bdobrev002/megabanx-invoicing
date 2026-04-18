import { apiFetch } from './client'
import type { AuthUser } from '@/types/auth.types'

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    apiFetch<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  verify: (token: string) =>
    apiFetch<{ token: string; user: AuthUser }>(`/auth/verify/${token}`),

  me: () => apiFetch<AuthUser>('/auth/me'),

  logout: () => {
    localStorage.removeItem('token')
  },
}
