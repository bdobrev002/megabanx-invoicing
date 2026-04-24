export interface AuthUser {
  id: string
  name: string
  email: string
  profile_id: string
  is_admin?: boolean
  subscription?: SubscriptionInfo
}

export interface SubscriptionInfo {
  status: string
  plan: string
  expires: string
  max_companies: number
  max_invoices: number
  trial_days: number
  prices: { monthly: number; yearly: number; currency: string }
  usage?: { companies: number; invoices: number }
  cancel_at_period_end?: boolean
  stripe_subscription_id?: string
  stripe_customer_id?: string
  trial_used?: boolean
}

export type AuthScreen = 'login' | 'register' | 'verify' | 'landing'
