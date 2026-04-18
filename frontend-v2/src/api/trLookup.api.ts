import { apiFetch } from './client'

export interface TrLookupResult {
  name: string
  eik: string
  address: string
  mol: string
  managers: string[]
  partners: string[]
  status: string
}

export const trLookupApi = {
  searchByEik: (eik: string) =>
    apiFetch<TrLookupResult>(`/tr-lookup/eik/${eik}`),

  searchByName: (name: string) =>
    apiFetch<TrLookupResult[]>(`/tr-lookup/name/${encodeURIComponent(name)}`),
}
