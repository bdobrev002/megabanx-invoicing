export interface PairingRule {
  id: string
  company_id: string
  field: string
  operator: string
  value: string
}

export interface PairingResult {
  matched: boolean
  invoice_id: string
  paired_with?: string
}
