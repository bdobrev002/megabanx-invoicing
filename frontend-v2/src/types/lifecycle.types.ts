export interface LifecycleRule {
  id: string
  company_id: string
  event: string
  action: string
  condition?: string
  enabled: boolean
}
