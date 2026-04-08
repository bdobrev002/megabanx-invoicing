export interface Company {
  id: string;
  name: string;
  eik: string;
  vat_number: string | null;
  is_vat_registered: boolean;
  mol: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  iban: string | null;
  bank_name: string | null;
  bic: string | null;
  logo_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  eik: string | null;
  egn: string | null;
  vat_number: string | null;
  is_vat_registered: boolean;
  is_individual: boolean;
  mol: string | null;
  city: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  company_id: string;
  name: string;
  unit: string;
  default_price: number;
  vat_rate: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLine {
  id?: string;
  invoice_id?: string;
  item_id: string | null;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  line_total: number;
}

export interface Invoice {
  id: string;
  company_id: string;
  client_id: string;
  document_type: "invoice" | "proforma" | "debit_note" | "credit_note";
  invoice_number: number;
  issue_date: string;
  tax_event_date: string;
  due_date: string | null;
  status: "draft" | "issued" | "paid" | "overdue" | "cancelled";
  subtotal: number;
  discount: number;
  vat_amount: number;
  total: number;
  vat_rate: number;
  no_vat: boolean;
  no_vat_reason: string | null;
  payment_method: string | null;
  notes: string | null;
  internal_notes: string | null;
  currency: string;
  pdf_path: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  lines: InvoiceLine[];
  client_name: string | null;
  company_name: string | null;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  total_invoices: number;
  monthly_total: number;
  unpaid_count: number;
  unpaid_total: number;
}

export type DocumentType = "invoice" | "proforma" | "debit_note" | "credit_note";
export type InvoiceStatus = "draft" | "issued" | "paid" | "overdue" | "cancelled";
