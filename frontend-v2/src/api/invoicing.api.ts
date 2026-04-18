import { apiFetch } from './client'
import type { InvoiceClient, InvoiceItem, InvoiceStub, InvoiceFormData } from '@/types/invoicing.types'

export const invoicingApi = {
  getClients: (companyId: string) =>
    apiFetch<InvoiceClient[]>(`/invoicing/${companyId}/clients`),

  createClient: (companyId: string, data: Partial<InvoiceClient>) =>
    apiFetch<InvoiceClient>(`/invoicing/${companyId}/clients`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateClient: (companyId: string, clientId: string, data: Partial<InvoiceClient>) =>
    apiFetch<InvoiceClient>(`/invoicing/${companyId}/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeClient: (companyId: string, clientId: string) =>
    apiFetch<void>(`/invoicing/${companyId}/clients/${clientId}`, { method: 'DELETE' }),

  getItems: (companyId: string) =>
    apiFetch<InvoiceItem[]>(`/invoicing/${companyId}/items`),

  createItem: (companyId: string, data: Partial<InvoiceItem>) =>
    apiFetch<InvoiceItem>(`/invoicing/${companyId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateItem: (companyId: string, itemId: string, data: Partial<InvoiceItem>) =>
    apiFetch<InvoiceItem>(`/invoicing/${companyId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeItem: (companyId: string, itemId: string) =>
    apiFetch<void>(`/invoicing/${companyId}/items/${itemId}`, { method: 'DELETE' }),

  getStubs: (companyId: string) =>
    apiFetch<InvoiceStub[]>(`/invoicing/${companyId}/stubs`),

  createInvoice: (companyId: string, data: InvoiceFormData) =>
    apiFetch<{ pdf_url: string; invoice_id: string }>(`/invoicing/${companyId}/create`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  previewPdf: (companyId: string, data: InvoiceFormData) =>
    apiFetch<Blob>(`/invoicing/${companyId}/preview`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendEmail: (invoiceId: string, to: string, subject: string, body: string) =>
    apiFetch<void>(`/invoicing/send-email`, {
      method: 'POST',
      body: JSON.stringify({ invoice_id: invoiceId, to, subject, body }),
    }),
}
