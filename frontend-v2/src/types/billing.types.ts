export interface BillingPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: string | null
  features: string[]
  savings?: string
  popular?: boolean
  contact_us?: boolean
  promo?: string
  trial_days?: number
}

export interface StripePayment {
  id: string
  number: string
  amount_paid: number
  subtotal: number
  tax: number
  total: number
  currency: string
  status: string
  created: number
  period_start: number
  period_end: number
  invoice_pdf: string
  hosted_invoice_url: string
}
