import { apiFetch, uploadFetch } from './client'
import type { InvoiceRecord } from '@/types/file.types'

/** Invoice file endpoints — all scoped to profile_id. */
export const filesApi = {
  getFolderStructure: (profileId: string) =>
    apiFetch<{ folders: { name: string; subfolders: { name: string; file_count: number }[] }[] }>(
      `/profiles/${profileId}/folder-structure`,
    ),

  upload: (profileId: string, file: File, companyId?: string, invoiceType?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    const params = new URLSearchParams()
    if (companyId) params.set('company_id', companyId)
    if (invoiceType) params.set('invoice_type', invoiceType)
    const qs = params.toString()
    return uploadFetch(`/profiles/${profileId}/upload${qs ? `?${qs}` : ''}`, fd)
  },

  list: (profileId: string, companyId?: string, invoiceType?: string) => {
    const params = new URLSearchParams()
    if (companyId) params.set('company_id', companyId)
    if (invoiceType) params.set('invoice_type', invoiceType)
    const qs = params.toString()
    return apiFetch<InvoiceRecord[]>(
      `/profiles/${profileId}/invoices${qs ? `?${qs}` : ''}`,
    )
  },

  getById: (profileId: string, invoiceId: string) =>
    apiFetch<InvoiceRecord>(`/profiles/${profileId}/invoices/${invoiceId}`),

  download: (profileId: string, invoiceId: string) =>
    apiFetch<Blob>(`/profiles/${profileId}/invoices/${invoiceId}/download`, {
      responseType: 'blob',
    }),

  remove: (profileId: string, invoiceId: string) =>
    apiFetch<void>(`/profiles/${profileId}/invoices/${invoiceId}`, {
      method: 'DELETE',
    }),

  getInbox: (profileId: string) =>
    apiFetch<InvoiceRecord[]>(`/profiles/${profileId}/inbox`),

  resync: (profileId: string, invoiceId: string) =>
    apiFetch<{ message: string; invoice: InvoiceRecord }>(
      `/profiles/${profileId}/invoices/${invoiceId}/resync`,
      { method: 'POST' },
    ),
}
