import { apiFetch } from './client'
import type { InvoiceHistoryItem, InvoiceFilter } from '@/types/invoice.types'

export const invoicesApi = {
  list: (filters?: InvoiceFilter) => {
    const params = new URLSearchParams()
    if (filters?.company_id) params.set('company_id', filters.company_id)
    if (filters?.type) params.set('type', filters.type)
    if (filters?.date_from) params.set('date_from', filters.date_from)
    if (filters?.date_to) params.set('date_to', filters.date_to)
    if (filters?.search) params.set('search', filters.search)
    const qs = params.toString()
    return apiFetch<InvoiceHistoryItem[]>(`/invoices${qs ? `?${qs}` : ''}`)
  },

  getById: (id: string) =>
    apiFetch<InvoiceHistoryItem>(`/invoices/${id}`),
}
