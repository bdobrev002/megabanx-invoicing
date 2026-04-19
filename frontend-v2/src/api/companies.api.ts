import { apiFetch } from './client'
import type { Company } from '@/types/company.types'

/** All company endpoints require profile_id in the path. */
export const companiesApi = {
  list: (profileId: string) =>
    apiFetch<Company[]>(`/profiles/${profileId}/companies`),

  create: (profileId: string, data: Partial<Company>) =>
    apiFetch<Company>(`/profiles/${profileId}/companies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (profileId: string, companyId: string, data: Partial<Company>) =>
    apiFetch<Company>(`/profiles/${profileId}/companies/${companyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (profileId: string, companyId: string) =>
    apiFetch<void>(`/profiles/${profileId}/companies/${companyId}`, {
      method: 'DELETE',
    }),

  lookupEik: (eik: string) =>
    apiFetch<{
      name: string
      address: string
      mol: string
      managers: string[]
      partners: string[]
    }>(`/lookup-eik/${eik}`),
}
