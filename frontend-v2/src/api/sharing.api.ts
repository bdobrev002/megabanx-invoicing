import { apiFetch } from './client'
import type { CompanyShare, SharedCompanyInfo } from '@/types/company.types'

/** Sharing endpoints — scoped to profile_id + company_id. */
export const sharingApi = {
  getShares: (profileId: string, companyId: string) =>
    apiFetch<CompanyShare[]>(
      `/profiles/${profileId}/companies/${companyId}/shares`,
    ),

  share: (profileId: string, companyId: string, email: string, canUpload: boolean) =>
    apiFetch<CompanyShare>(
      `/profiles/${profileId}/companies/${companyId}/shares`,
      {
        method: 'POST',
        body: JSON.stringify({ email, can_upload: canUpload }),
      },
    ),

  updatePermission: (profileId: string, companyId: string, shareId: string, canUpload: boolean) =>
    apiFetch<void>(
      `/profiles/${profileId}/companies/${companyId}/shares/${shareId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ can_upload: canUpload }),
      },
    ),

  removeShare: (profileId: string, companyId: string, shareId: string) =>
    apiFetch<void>(
      `/profiles/${profileId}/companies/${companyId}/shares/${shareId}`,
      { method: 'DELETE' },
    ),

  getSharedWithMe: () =>
    apiFetch<SharedCompanyInfo[]>('/shared-companies'),
}
