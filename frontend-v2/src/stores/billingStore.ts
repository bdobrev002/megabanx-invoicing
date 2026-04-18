import { create } from 'zustand'
import type { BillingPlan, StripePayment } from '@/types/billing.types'
import type { SubscriptionInfo } from '@/types/auth.types'

interface BillingState {
  plans: BillingPlan[]
  subscription: SubscriptionInfo | null
  payments: StripePayment[]

  setPlans: (plans: BillingPlan[]) => void
  setSubscription: (sub: SubscriptionInfo | null) => void
  setPayments: (payments: StripePayment[]) => void
}

export const useBillingStore = create<BillingState>((set) => ({
  plans: [],
  subscription: null,
  payments: [],

  setPlans: (plans) => set({ plans }),
  setSubscription: (subscription) => set({ subscription }),
  setPayments: (payments) => set({ payments }),
}))
