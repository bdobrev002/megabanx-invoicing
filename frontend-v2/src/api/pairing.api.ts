import { apiFetch } from './client'
import type { PairingRule, PairingResult } from '@/types/pairing.types'

export const pairingApi = {
  getRules: (companyId: string) =>
    apiFetch<PairingRule[]>(`/pairing/${companyId}/rules`),

  createRule: (companyId: string, data: Partial<PairingRule>) =>
    apiFetch<PairingRule>(`/pairing/${companyId}/rules`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeRule: (companyId: string, ruleId: string) =>
    apiFetch<void>(`/pairing/${companyId}/rules/${ruleId}`, { method: 'DELETE' }),

  runPairing: (companyId: string) =>
    apiFetch<PairingResult[]>(`/pairing/${companyId}/run`, { method: 'POST' }),
}
