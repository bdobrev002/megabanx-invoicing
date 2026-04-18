import { apiFetch } from './client'
import type { BankAccount } from '@/types/bankAccount.types'

export const bankAccountsApi = {
  list: (companyId: string) =>
    apiFetch<BankAccount[]>(`/bank-accounts/${companyId}`),

  create: (companyId: string, data: Partial<BankAccount>) =>
    apiFetch<BankAccount>(`/bank-accounts/${companyId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (companyId: string, accountId: string, data: Partial<BankAccount>) =>
    apiFetch<BankAccount>(`/bank-accounts/${companyId}/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (companyId: string, accountId: string) =>
    apiFetch<void>(`/bank-accounts/${companyId}/${accountId}`, { method: 'DELETE' }),
}
