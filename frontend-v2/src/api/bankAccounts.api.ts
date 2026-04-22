import { apiFetch } from './client'
import type { BankAccount } from '@/types/bankAccount.types'

export interface BankAccountPayload {
  iban: string
  bank_name?: string
  bic?: string
  currency?: string
  is_default?: boolean
}

function qs(companyId: string, profileId: string) {
  const p = new URLSearchParams({ company_id: companyId, profile_id: profileId })
  return `?${p.toString()}`
}

export const bankAccountsApi = {
  list: (profileId: string, companyId: string) =>
    apiFetch<BankAccount[]>(`/invoicing/bank-accounts${qs(companyId, profileId)}`),

  create: (profileId: string, companyId: string, data: BankAccountPayload) =>
    apiFetch<BankAccount>(`/invoicing/bank-accounts${qs(companyId, profileId)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    profileId: string,
    companyId: string,
    accountId: string,
    data: Partial<BankAccountPayload>,
  ) =>
    apiFetch<BankAccount>(
      `/invoicing/bank-accounts/${accountId}${qs(companyId, profileId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    ),

  remove: (profileId: string, companyId: string, accountId: string) =>
    apiFetch<void>(`/invoicing/bank-accounts/${accountId}${qs(companyId, profileId)}`, {
      method: 'DELETE',
    }),
}
