import { apiFetch } from './client'

export interface PeriodicInvoice {
  id: string
  company_id: string
  client_id: string
  template_data: Record<string, unknown>
  frequency: 'monthly' | 'quarterly' | 'yearly'
  next_date: string
  active: boolean
  created_at: string
}

export const periodicApi = {
  list: (companyId: string) =>
    apiFetch<PeriodicInvoice[]>(`/periodic/${companyId}`),

  create: (companyId: string, data: Partial<PeriodicInvoice>) =>
    apiFetch<PeriodicInvoice>(`/periodic/${companyId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (companyId: string, periodicId: string, data: Partial<PeriodicInvoice>) =>
    apiFetch<PeriodicInvoice>(`/periodic/${companyId}/${periodicId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (companyId: string, periodicId: string) =>
    apiFetch<void>(`/periodic/${companyId}/${periodicId}`, { method: 'DELETE' }),

  toggle: (companyId: string, periodicId: string, active: boolean) =>
    apiFetch<void>(`/periodic/${companyId}/${periodicId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ active }),
    }),
}
