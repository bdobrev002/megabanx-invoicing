import { apiFetch } from './client'
import type { Profile } from '@/types/profile.types'

export const profilesApi = {
  list: () => apiFetch<Profile[]>('/profiles'),

  create: (name: string) =>
    apiFetch<Profile>('/profiles', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  update: (id: string, name: string) =>
    apiFetch<Profile>(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),

  remove: (id: string) =>
    apiFetch<void>(`/profiles/${id}`, { method: 'DELETE' }),

  switchTo: (id: string) =>
    apiFetch<{ token: string }>(`/profiles/${id}/switch`, { method: 'POST' }),
}
