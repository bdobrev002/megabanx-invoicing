import { apiFetch } from './client'
import type { CompanyShare, SharedCompanyInfo } from '@/types/company.types'

export const sharingApi = {
  getShares: (companyId: string) =>
    apiFetch<CompanyShare[]>(`/sharing/company/${companyId}`),

  share: (companyId: string, email: string, canUpload: boolean) =>
    apiFetch<CompanyShare>('/sharing', {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId, email, can_upload: canUpload }),
    }),

  updatePermission: (shareId: string, canUpload: boolean) =>
    apiFetch<void>(`/sharing/${shareId}`, {
      method: 'PUT',
      body: JSON.stringify({ can_upload: canUpload }),
    }),

  removeShare: (shareId: string) =>
    apiFetch<void>(`/sharing/${shareId}`, { method: 'DELETE' }),

  getSharedWithMe: () =>
    apiFetch<SharedCompanyInfo[]>('/sharing/shared-with-me'),

  leaveShared: (shareId: string) =>
    apiFetch<void>(`/sharing/leave/${shareId}`, { method: 'POST' }),
}
