import { apiFetch } from './client'
import type { AdminUser, AdminStats, SystemLog } from '@/types/admin.types'
import type { PendingVerification } from '@/types/verification.types'

export const adminApi = {
  getStats: () => apiFetch<AdminStats>('/admin/stats'),

  getUsers: () => apiFetch<AdminUser[]>('/admin/users'),

  getUser: (id: string) => apiFetch<AdminUser>(`/admin/users/${id}`),

  updateUser: (id: string, data: Partial<AdminUser>) =>
    apiFetch<AdminUser>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getPendingVerifications: () =>
    apiFetch<PendingVerification[]>('/admin/verifications'),

  approveVerification: (id: string) =>
    apiFetch<void>(`/admin/verifications/${id}/approve`, { method: 'POST' }),

  rejectVerification: (id: string, reason: string) =>
    apiFetch<void>(`/admin/verifications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getLogs: (page = 1, limit = 50) =>
    apiFetch<{ logs: SystemLog[]; total: number }>(
      `/admin/logs?page=${page}&limit=${limit}`,
    ),
}
