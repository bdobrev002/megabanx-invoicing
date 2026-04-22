import { API_BASE_URL } from '@/utils/constants'
import { ApiError, apiFetch, uploadFetch } from './client'
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
      city?: string
      mol: string
      email?: string
      vat_number?: string
      managers: string[]
      partners: string[]
    }>(`/lookup-eik/${eik}`),

  uploadLogo: async (profileId: string, companyId: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    await uploadFetch(
      `/profiles/${profileId}/companies/${companyId}/logo`,
      fd,
    )
  },

  deleteLogo: (profileId: string, companyId: string) =>
    apiFetch<void>(`/profiles/${profileId}/companies/${companyId}/logo`, {
      method: 'DELETE',
    }),

  /** Fetch the logo as a Blob URL (authorized via Bearer token). */
  async fetchLogoBlobUrl(profileId: string, companyId: string): Promise<string | null> {
    const token = localStorage.getItem('token')
    const res = await fetch(
      `${API_BASE_URL}/profiles/${profileId}/companies/${companyId}/logo`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    )
    if (res.status === 404) return null
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(res.status, body.detail ?? res.statusText)
    }
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },
}
