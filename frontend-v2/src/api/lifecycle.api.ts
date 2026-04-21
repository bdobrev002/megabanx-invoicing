import { apiFetch } from './client'
import type { LifecycleRule } from '@/types/lifecycle.types'

export const lifecycleApi = {
  getRules: (companyId: string) =>
    apiFetch<LifecycleRule[]>(`/lifecycle/${companyId}/rules`),

  createRule: (companyId: string, data: Partial<LifecycleRule>) =>
    apiFetch<LifecycleRule>(`/lifecycle/${companyId}/rules`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRule: (companyId: string, ruleId: string, data: Partial<LifecycleRule>) =>
    apiFetch<LifecycleRule>(`/lifecycle/${companyId}/rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  removeRule: (companyId: string, ruleId: string) =>
    apiFetch<void>(`/lifecycle/${companyId}/rules/${ruleId}`, { method: 'DELETE' }),
}
