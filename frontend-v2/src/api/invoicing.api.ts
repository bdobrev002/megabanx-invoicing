import { apiFetch } from './client'
import type { InvoiceClient, InvoiceItem, InvoiceStub, InvoiceFormData, InvoiceLine, IssuedInvoiceMeta } from '@/types/invoicing.types'

/** Map frontend InvoiceFormData field names to backend InvoiceCreateSchema names */
function toBackendPayload(data: InvoiceFormData) {
  return {
    document_type: data.doc_type,
    client_id: data.client_id,
    stub_id: data.stub_id,
    invoice_number: data.invoice_number,
    issue_date: data.date,
    due_date: data.due_date,
    tax_event_date: data.delivery_date,
    lines: data.lines.map((l: InvoiceLine) => ({
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unit_price: l.price,
      vat_rate: l.vat_rate,
      value: l.value,
    })),
    notes: data.notes,
    internal_notes: data.internal_notes,
    discount_type: data.discount_type,
    discount: data.discount_value,
    no_vat: data.no_vat,
    no_vat_reason: data.no_vat_reason,
    price_with_vat: data.price_with_vat,
    payment_method: data.payment_method,
    sync_mode: data.sync_mode,
    delay_minutes: data.delay_minutes,
  }
}

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
      body: JSON.stringify({ ...toBackendPayload(data), company_id: companyId, profile_id: profileId }),
    }),

  getInvoice: (invoiceId: string) =>
    apiFetch<{ meta: IssuedInvoiceMeta; lines: unknown[] }>(`/invoicing/invoices/${invoiceId}`),

  updateInvoice: (invoiceId: string, companyId: string, profileId: string, data: InvoiceFormData) =>
    apiFetch<IssuedInvoiceMeta>(`/invoicing/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...toBackendPayload(data), company_id: companyId, profile_id: profileId }),
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
