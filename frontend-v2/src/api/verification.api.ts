import { apiFetch } from './client'
import type { PendingVerification } from '@/types/verification.types'

export const verificationApi = {
  start: (companyId: string, method: string) =>
    apiFetch<{ verification_id: string; code: string }>('/verification/start', {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId, method }),
    }),

  checkStatus: (verificationId: string) =>
    apiFetch<{ status: string; verified: boolean }>(
      `/verification/${verificationId}/status`,
    ),

  getPending: () =>
    apiFetch<PendingVerification[]>('/verification/pending'),

  uploadIdCard: (verificationId: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch(`/verification/${verificationId}/id-card`, {
      method: 'POST',
      body: fd,
    })
  },
}
