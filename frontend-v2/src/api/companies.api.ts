import { apiFetch } from './client'
import type { Company } from '@/types/company.types'

export const companiesApi = {
  list: () => apiFetch<Company[]>('/companies'),

  create: (data: Partial<Company>) =>
    apiFetch<Company>('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Company>) =>
    apiFetch<Company>(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    apiFetch<void>(`/companies/${id}`, { method: 'DELETE' }),

  lookupEik: (eik: string) =>
    apiFetch<{ name: string; address: string; mol: string; managers: string[]; partners: string[] }>(
      `/companies/eik-lookup/${eik}`,
    ),

  getCounterparties: () =>
    apiFetch<Company[]>('/companies/counterparties'),

  createCounterparty: (data: Partial<Company>) =>
    apiFetch<Company>('/companies/counterparties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCounterparty: (id: string, data: Partial<Company>) =>
    apiFetch<Company>(`/companies/counterparties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeCounterparty: (id: string) =>
    apiFetch<void>(`/companies/counterparties/${id}`, { method: 'DELETE' }),
}
