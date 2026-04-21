import { apiFetch } from './client'
import type { Stub } from '@/types/stub.types'

export const stubsApi = {
  list: (companyId: string) =>
    apiFetch<Stub[]>(`/stubs/${companyId}`),

  create: (companyId: string, data: Partial<Stub>) =>
    apiFetch<Stub>(`/stubs/${companyId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (companyId: string, stubId: string, data: Partial<Stub>) =>
    apiFetch<Stub>(`/stubs/${companyId}/${stubId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (companyId: string, stubId: string) =>
    apiFetch<void>(`/stubs/${companyId}/${stubId}`, { method: 'DELETE' }),
}
