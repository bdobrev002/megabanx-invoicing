import { apiFetch } from './client'
import type { Notification } from '@/types/notification.types'

export const notificationsApi = {
  list: () => apiFetch<Notification[]>('/notifications'),

  markRead: (id: string) =>
    apiFetch<void>(`/notifications/${id}/read`, { method: 'PUT' }),

  markAllRead: () =>
    apiFetch<void>('/notifications/read-all', { method: 'PUT' }),
}
