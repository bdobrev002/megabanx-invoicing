import { API_BASE_URL } from '@/utils/constants'
import { ApiError, apiFetch } from './client'

export interface InvoiceTemplateVariant {
  key: string
  name: string
  description: string
}

/**
 * Invoice PDF template gallery + live preview endpoints (Stage 6B).
 *
 * ``previewUrl`` returns a short-lived ``blob:`` URL. The caller must
 * ``URL.revokeObjectURL`` it when it is no longer needed.
 */
export const invoiceTemplatesApi = {
  list: () =>
    apiFetch<{ templates: InvoiceTemplateVariant[] }>('/invoicing/invoice-templates'),

  async previewUrl(templateKey: string, documentType: string = 'invoice'): Promise<string> {
    const token = localStorage.getItem('token')
    const qs = new URLSearchParams({ document_type: documentType }).toString()
    const res = await fetch(
      `${API_BASE_URL}/invoicing/invoice-templates/${encodeURIComponent(templateKey)}/preview?${qs}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(res.status, body.detail ?? res.statusText)
    }
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },
}
