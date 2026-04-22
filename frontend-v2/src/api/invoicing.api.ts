import { apiFetch } from './client'
import type {
  EmailTemplate,
  EmailTemplateCreate,
  EmailTemplateUpdate,
  InvoiceClient,
  InvoiceEmailLog,
  InvoiceEmailSendRequest,
  InvoiceFormData,
  InvoiceItem,
  InvoiceLine,
  InvoiceStub,
  IssuedInvoiceMeta,
} from '@/types/invoicing.types'

/** Row returned by ``GET /invoicing/invoices/{id}/editable`` for the edit form. */
export interface EditableInvoiceLine {
  id: string
  item_id: string | null
  position: number
  description: string
  quantity: number
  unit: string
  unit_price: number
  vat_rate: number
  line_total: number
}

export interface EditableInvoiceResponse {
  editable: boolean
  meta: IssuedInvoiceMeta
  lines: EditableInvoiceLine[]
}

export interface NextNumberResponse {
  next_number: number
}

export interface SyncSettings {
  sync_mode: 'manual' | 'immediate' | 'delayed'
  delay_minutes: number
}

export interface CompanySettings {
  id: string
  company_id: string
  profile_id: string
  iban: string | null
  bank_name: string | null
  bic: string | null
  default_vat_rate: number | string
  created_at?: string
  updated_at?: string
}

export interface CompanySettingsUpdate {
  iban?: string | null
  bank_name?: string | null
  bic?: string | null
  default_vat_rate?: number
}

/** Map frontend InvoiceFormData field names to backend InvoiceCreateSchema names */
function toBackendPayload(data: InvoiceFormData) {
  const invNumParsed = data.invoice_number ? parseInt(data.invoice_number, 10) : NaN
  // Combine BG + EN notes using the delimiter v1 uses; backend stores a single string.
  const combinedNotes = data.notes_en
    ? `${data.notes ?? ''}\n\n---EN---\n${data.notes_en}`
    : data.notes
  // Dominant VAT rate: if no_vat -> 0, else first line rate, else 20.
  const dominantVat = data.no_vat
    ? 0
    : data.lines.length > 0
      ? data.lines[0].vat_rate
      : 20
  return {
    document_type: data.doc_type,
    client_id: data.client_id,
    stub_id: data.stub_id || null,
    invoice_number: Number.isFinite(invNumParsed) ? invNumParsed : null,
    issue_date: data.date || null,
    due_date: data.due_date || null,
    tax_event_date: data.delivery_date || null,
    vat_rate: dominantVat,
    no_vat: data.no_vat,
    no_vat_reason: data.no_vat_reason || null,
    discount: data.discount_value,
    discount_type: data.discount_type,
    payment_method: data.payment_method || null,
    notes: combinedNotes || null,
    internal_notes: data.internal_notes || null,
    currency: data.currency,
    composed_by: data.composed_by || null,
    template_id: data.template_id || null,
    lines: data.lines.map((l: InvoiceLine, i: number) => ({
      item_id: l.item_id ?? null,
      position: i,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unit_price: l.price,
      vat_rate: l.vat_rate,
    })),
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

  getClientEmails: (clientId: string) =>
    apiFetch<{ emails: string[] }>(`/invoicing/client-emails/${clientId}`),

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
      body: JSON.stringify({ ...toBackendPayload(data), company_id: companyId, profile_id: profileId, status: 'issued' }),
    }),

  createDraftInvoice: (companyId: string, profileId: string, data: InvoiceFormData) =>
    apiFetch<IssuedInvoiceMeta>('/invoicing/invoices', {
      method: 'POST',
      body: JSON.stringify({ ...toBackendPayload(data), company_id: companyId, profile_id: profileId, status: 'draft' }),
    }),

  getInvoice: (invoiceId: string) =>
    apiFetch<{ meta: IssuedInvoiceMeta; lines: unknown[] }>(`/invoicing/invoices/${invoiceId}`),

  /** Fetch an invoice shaped for the edit form (Stage 1.1 backend). */
  getEditableInvoice: (invoiceId: string) =>
    apiFetch<EditableInvoiceResponse>(`/invoicing/invoices/${invoiceId}/editable`),

  updateInvoice: (
    invoiceId: string,
    companyId: string,
    profileId: string,
    data: InvoiceFormData,
    status: 'issued' | 'draft' = 'issued',
  ) =>
    apiFetch<IssuedInvoiceMeta>(`/invoicing/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...toBackendPayload(data), company_id: companyId, profile_id: profileId, status }),
    }),

  removeInvoice: (invoiceId: string) =>
    apiFetch<void>(`/invoicing/invoices/${invoiceId}`, { method: 'DELETE' }),

  /** Preview the next invoice number for the selected document type. */
  getNextNumber: (companyId: string, profileId: string, documentType: string) =>
    apiFetch<NextNumberResponse>(
      `/invoicing/next-number?company_id=${companyId}&profile_id=${profileId}&document_type=${documentType}`,
    ),

  /** Bulgarian Trade Registry lookup by EIK. */
  lookupEik: (eik: string) =>
    apiFetch<{ eik: string; name?: string; address?: string; mol?: string; vat_number?: string; is_vat_registered?: boolean }>(
      `/invoicing/registry/lookup/${encodeURIComponent(eik)}`,
    ),

  /** Check whether an EIK corresponds to an existing MegaBanx company. */
  checkCounterparty: (eik: string) =>
    apiFetch<{ exists: boolean; companies: { id: string; name: string; profile_id: string }[] }>(
      `/invoicing/check-counterparty/${encodeURIComponent(eik)}`,
    ),

  /** Stage 2: list incoming cross-copy invoices awaiting my approval. When
   *  `companyId` is passed, the list is restricted to invoices addressed to
   *  that specific recipient company (by EIK match). */
  getIncomingCrossCopies: (profileId: string, companyId?: string) => {
    const params = new URLSearchParams({ profile_id: profileId })
    if (companyId) params.set('company_id', companyId)
    return apiFetch<import('@/types/invoicing.types').IncomingCrossCopy[]>(
      `/invoicing/incoming?${params.toString()}`,
    )
  },

  approveIncomingCrossCopy: (invoiceId: string) =>
    apiFetch<{ message: string }>(`/invoicing/incoming/${invoiceId}/approve`, { method: 'POST' }),

  rejectIncomingCrossCopy: (invoiceId: string) =>
    apiFetch<{ message: string }>(`/invoicing/incoming/${invoiceId}/reject`, { method: 'POST' }),

  getCompanySettings: (companyId: string, profileId: string) =>
    apiFetch<CompanySettings>(
      `/invoicing/company-settings?company_id=${companyId}&profile_id=${profileId}`,
    ),

  updateCompanySettings: (
    companyId: string,
    profileId: string,
    data: CompanySettingsUpdate,
  ) =>
    apiFetch<CompanySettings>(
      `/invoicing/company-settings?company_id=${companyId}&profile_id=${profileId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    ),

  getSyncSettings: (companyId: string, profileId: string) =>
    apiFetch<SyncSettings>(`/invoicing/sync-settings?company_id=${companyId}&profile_id=${profileId}`),

  updateSyncSettings: (companyId: string, profileId: string, data: SyncSettings) =>
    apiFetch<SyncSettings>(`/invoicing/sync-settings?company_id=${companyId}&profile_id=${profileId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, company_id: companyId, profile_id: profileId }),
    }),

  listEmailTemplates: (companyId: string, profileId: string) =>
    apiFetch<EmailTemplate[]>(
      `/invoicing/companies/${companyId}/email-templates?profile_id=${profileId}`,
    ),

  createEmailTemplate: (data: EmailTemplateCreate) =>
    apiFetch<EmailTemplate>('/invoicing/email-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEmailTemplate: (templateId: string, data: EmailTemplateUpdate) =>
    apiFetch<EmailTemplate>(`/invoicing/email-templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteEmailTemplate: (templateId: string) =>
    apiFetch<void>(`/invoicing/email-templates/${templateId}`, { method: 'DELETE' }),

  listInvoiceEmailLog: (invoiceId: string) =>
    apiFetch<InvoiceEmailLog[]>(`/invoicing/invoices/${invoiceId}/email-log`),

  sendInvoiceEmail: (invoiceId: string, data: InvoiceEmailSendRequest) =>
    apiFetch<InvoiceEmailLog>(`/invoicing/invoices/${invoiceId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
