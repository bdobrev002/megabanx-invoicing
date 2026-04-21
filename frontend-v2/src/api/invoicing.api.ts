import { apiFetch } from './client'
import type { InvoiceClient, InvoiceItem, InvoiceStub, InvoiceFormData, IssuedInvoiceMeta } from '@/types/invoicing.types'

export const invoicingApi = {
  getClients: (companyId: string, profileId: string) =>
    apiFetch<InvoiceClient[]>(`/invoicing/clients?company_id=${companyId}&profile_id=${profileId}`),

  createClient: (companyId: string, profileId: string, data: Partial<InvoiceClient>) =>
    apiFetch<InvoiceClient>('/invoicing/clients', {
      method: 'POST',
      body: JSON.stringify({ ...data, company_id: companyId, profile_id: profileId }),
    }),

  updateClient: (clientId: string, data: Partial<InvoiceClient>) =>
    apiFetch<InvoiceClient>(`/invoicing/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeClient: (clientId: string) =>
    apiFetch<void>(`/invoicing/clients/${clientId}`, { method: 'DELETE' }),

  getItems: (companyId: string, profileId: string) =>
    apiFetch<InvoiceItem[]>(`/invoicing/items?company_id=${companyId}&profile_id=${profileId}`),

  createItem: (companyId: string, profileId: string, data: Partial<InvoiceItem>) =>
    apiFetch<InvoiceItem>('/invoicing/items', {
      method: 'POST',
      body: JSON.stringify({ ...data, company_id: companyId, profile_id: profileId }),
    }),

  updateItem: (itemId: string, data: Partial<InvoiceItem>) =>
    apiFetch<InvoiceItem>(`/invoicing/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeItem: (itemId: string) =>
    apiFetch<void>(`/invoicing/items/${itemId}`, { method: 'DELETE' }),

  getStubs: (companyId: string, profileId: string) =>
    apiFetch<InvoiceStub[]>(`/invoicing/stubs?company_id=${companyId}&profile_id=${profileId}`),

  createStub: (companyId: string, profileId: string, data: Partial<InvoiceStub>) =>
    apiFetch<InvoiceStub>('/invoicing/stubs', {
      method: 'POST',
      body: JSON.stringify({ ...data, company_id: companyId, profile_id: profileId }),
    }),

  updateStub: (stubId: string, data: Partial<InvoiceStub>) =>
    apiFetch<InvoiceStub>(`/invoicing/stubs/${stubId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeStub: (stubId: string) =>
    apiFetch<void>(`/invoicing/stubs/${stubId}`, { method: 'DELETE' }),

  getInvoices: (companyId: string, profileId: string) =>
    apiFetch<IssuedInvoiceMeta[]>(`/invoicing/invoices?company_id=${companyId}&profile_id=${profileId}`),

  createInvoice: (companyId: string, profileId: string, data: InvoiceFormData) =>
    apiFetch<IssuedInvoiceMeta>('/invoicing/invoices', {
      method: 'POST',
      body: JSON.stringify({ ...data, company_id: companyId, profile_id: profileId }),
    }),

  getInvoice: (invoiceId: string) =>
    apiFetch<{ meta: IssuedInvoiceMeta; lines: unknown[] }>(`/invoicing/invoices/${invoiceId}`),

  updateInvoice: (invoiceId: string, companyId: string, profileId: string, data: InvoiceFormData) =>
    apiFetch<IssuedInvoiceMeta>(`/invoicing/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, company_id: companyId, profile_id: profileId }),
    }),

  removeInvoice: (invoiceId: string) =>
    apiFetch<void>(`/invoicing/invoices/${invoiceId}`, { method: 'DELETE' }),

  getCompanySettings: (companyId: string, profileId: string) =>
    apiFetch<unknown>(`/invoicing/company-settings?company_id=${companyId}&profile_id=${profileId}`),

  updateCompanySettings: (companyId: string, profileId: string, data: unknown) =>
    apiFetch<unknown>(`/invoicing/company-settings?company_id=${companyId}&profile_id=${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getSyncSettings: (companyId: string, profileId: string) =>
    apiFetch<unknown>(`/invoicing/sync-settings?company_id=${companyId}&profile_id=${profileId}`),

  updateSyncSettings: (companyId: string, profileId: string, data: unknown) =>
    apiFetch<unknown>(`/invoicing/sync-settings?company_id=${companyId}&profile_id=${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  sendEmail: (invoiceId: string, to: string, subject: string, body: string) =>
    apiFetch<void>('/invoicing/send-email', {
      method: 'POST',
      body: JSON.stringify({ invoice_id: invoiceId, to, subject, body }),
    }),
}
