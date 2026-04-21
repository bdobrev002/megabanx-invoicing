import { apiFetch } from './client'
import type { BillingPlan, StripePayment } from '@/types/billing.types'

export const billingApi = {
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

  activateTrial: () =>
    apiFetch<{ message: string }>('/billing/trial', { method: 'POST' }),
}
