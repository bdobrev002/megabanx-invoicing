export interface InvoiceHistoryItem {
  id: string
  filename: string
  invoice_type: string
  company_name: string
  date: string
  issuer_name: string
  recipient_name: string
  invoice_number: string
  status: string
  drive_url?: string
  created_at: string
}

export interface InvoiceFilter {
  company_id?: string
  type?: string
  date_from?: string
  date_to?: string
  search?: string
}
