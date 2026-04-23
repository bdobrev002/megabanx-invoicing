import { apiFetch, uploadFetch } from './client'
import { API_BASE_URL } from '@/utils/constants'
import type { InvoiceRecord } from '@/types/file.types'

export type ProcessStreamEvent =
  | { type: 'init'; message?: string }
  | { type: 'start'; total: number; parallel: number }
  | { type: 'file_processing'; filename: string }
  | {
      type: 'progress'
      filename: string
      status: 'processed' | 'unmatched' | 'duplicate' | 'over_limit' | 'error'
      current: number
      total: number
    }
  | { type: 'complete'; counts: ProcessInboxResponse; results: ProcessInboxResult[] }
  | { type: 'error'; message: string }

/**
 * Stream v1-style parallel Gemini processing via SSE. Yields parsed events
 * as they arrive; caller decides how to update UI state.
 */
export async function* processInboxStream(profileId: string): AsyncGenerator<ProcessStreamEvent> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_BASE_URL}/profiles/${profileId}/process-stream`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Грешка при обработката (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const line = raw.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      const json = line.slice(6).trim()
      if (!json) continue
      try {
        yield JSON.parse(json) as ProcessStreamEvent
      } catch {
        // ignore malformed chunks
      }
    }
  }
}

/** Invoice file endpoints — all scoped to profile_id. */
export const filesApi = {
  getFolderStructure: (profileId: string) =>
    apiFetch<{
      folders: {
        name: string
        company_id: string | null
        eik: string
        subfolders: { name: string; display_name?: string; file_count: number }[]
      }[]
    }>(`/profiles/${profileId}/folder-structure`),

  upload: (profileId: string, file: File, companyId?: string, invoiceType?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    const params = new URLSearchParams()
    if (companyId) params.set('company_id', companyId)
    if (invoiceType) params.set('invoice_type', invoiceType)
    const qs = params.toString()
    return uploadFetch(`/profiles/${profileId}/upload${qs ? `?${qs}` : ''}`, fd)
  },

  reclassify: (profileId: string, invoiceId: string, companyId: string, invoiceType: 'purchase' | 'sale') => {
    const params = new URLSearchParams({ company_id: companyId, invoice_type: invoiceType })
    return apiFetch<{ message: string; invoice: InvoiceRecord }>(
      `/profiles/${profileId}/invoices/${invoiceId}/reclassify?${params.toString()}`,
      { method: 'POST' },
    )
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

  getInboxFiles: (profileId: string) =>
    apiFetch<{ files: InboxFile[] }>(`/profiles/${profileId}/inbox-files`),

  processInbox: (profileId: string) =>
    apiFetch<ProcessInboxResponse>(
      `/profiles/${profileId}/process`,
      { method: 'POST' },
    ),

  clearInbox: (profileId: string) =>
    apiFetch<{ cleared_files: number; cleared_invoices: number }>(
      `/profiles/${profileId}/inbox-files`,
      { method: 'DELETE' },
    ),

  resync: (profileId: string, invoiceId: string) =>
    apiFetch<{ message: string; invoice: InvoiceRecord }>(
      `/profiles/${profileId}/invoices/${invoiceId}/resync`,
      { method: 'POST' },
    ),
}

export interface InboxFile {
  inbox_filename: string
  original_filename: string
  size: number
}

export interface ProcessInboxResult {
  status: 'processed' | 'unmatched' | 'duplicate' | 'over_limit' | 'error'
  original_filename: string
  reason?: string | null
  invoice?: InvoiceRecord | null
}

export interface ProcessInboxResponse {
  processed: number
  unmatched: number
  duplicate: number
  over_limit: number
  errors: number
  results: ProcessInboxResult[]
}
