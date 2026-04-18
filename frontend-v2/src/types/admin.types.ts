export interface AdminUser {
  id: string
  name: string
  email: string
  created_at: string
  subscription_status: string
  plan: string
  companies_count: number
  invoices_count: number
}

export interface AdminStats {
  total_users: number
  total_companies: number
  total_invoices: number
  monthly_revenue: number
  active_subscriptions: number
  pending_verifications: number
}

export interface SystemLog {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  user_id?: string
  action: string
}
