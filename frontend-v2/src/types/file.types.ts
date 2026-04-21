export interface FileInfo {
  name: string
  drive_id: string
  drive_url: string
  cross_copy_status?: string
  cross_copied_from?: string
  is_credit_note?: boolean
  uploaded_at?: string
}

export interface FolderItem {
  company: import('./company.types').Company
  purchases: { count: number; files: string[]; files_info: FileInfo[] }
  sales: { count: number; files: string[]; files_info: FileInfo[] }
  proformas?: { count: number; files: string[]; files_info: FileInfo[] }
  pending?: {
    count: number
    files: string[]
    files_info: PendingFileInfo[]
  }
}

export interface PendingFileInfo {
  name: string
  id: string
  invoice_type: string
  cross_copied_from: string
  date: string
  issuer_name: string
  recipient_name: string
  invoice_number: string
  over_limit?: boolean
}

export interface InvoiceRecord {
  id: string
  original_filename: string
  new_filename: string
  invoice_type: string
  company_name: string
  date: string
  issuer_name: string
  recipient_name: string
  invoice_number: string
  status: string
  error_message?: string
  cross_copied_from?: string
  cross_copy_status?: string
  source_invoice_id?: string
  is_credit_note?: boolean
}

export type FileProcessingStatus = 'pending' | 'processing' | 'done' | 'error'

export interface ProcessProgress {
  current: number
  total: number
  parallel?: boolean
  currentFile: string
}
