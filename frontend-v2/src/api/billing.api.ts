import { apiFetch } from './client'
import type { BillingPlan, StripePayment } from '@/types/billing.types'

export interface BillingUsage {
  plan: string
  invoices_limit: number
  current_usage: number
  remaining: number
  started_at?: string | null
}

export const billingApi = {
  getCurrent: () => apiFetch<BillingUsage>('/billing'),

  getPlans: () => apiFetch<BillingPlan[]>('/billing/plans'),

  subscribe: (planId: string, interval: string) =>
    apiFetch<{ checkout_url: string }>('/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, interval }),
    }),

  cancelSubscription: () =>
    apiFetch<void>('/billing/cancel', { method: 'POST' }),

  resumeSubscription: () =>
    apiFetch<void>('/billing/resume', { method: 'POST' }),

  getPaymentHistory: () =>
    apiFetch<StripePayment[]>('/billing/payments'),

  activateTrial: (planId = 'pro') =>
    apiFetch<{ message: string; plan: string; trial_ends_at: string | null }>(
      '/billing/trial',
      { method: 'POST', body: JSON.stringify({ plan_id: planId }) },
    ),

  openPortal: () => apiFetch<{ url: string }>('/billing/portal'),
}
