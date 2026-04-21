export interface InvoiceClient {
  id: string
  name: string
  eik?: string | null
  egn?: string | null
  vat_number?: string | null
  is_vat_registered?: boolean
  is_individual?: boolean
  mol?: string | null
  city?: string | null
  address?: string | null
  email?: string | null
  phone?: string | null
}

export interface InvoiceItem {
  id: string
  name: string
  unit: string
  default_price?: number | string
  price?: number
  vat_rate: number | string
  description?: string | null
}

export interface InvoiceLine {
  id?: string
  item_id?: string | null
  position?: number
  description: string
  quantity: number
  unit: string
  /** Unit price WITHOUT VAT (canonical model; UI may display with VAT via PriceModeToggle) */
  price: number
  vat_rate: number
  /** Computed: quantity * price (without VAT) */
  value?: number
}

export interface InvoiceStub {
  id: string
  name: string
  start_number: number
  end_number: number
  next_number: number
  is_active: boolean
}

export type CrossCopyStatus = 'none' | 'pending' | 'approved' | 'no_subscriber' | 'deleted_by_recipient'

export interface IssuedInvoiceMeta {
  id: string
  invoice_id: string
  company_id: string
  profile_id: string
  client_id: string | null
  document_type: string
  invoice_number: number | null
  issue_date: string | null
  tax_event_date: string | null
  due_date: string | null
  subtotal: string
  discount: string
  vat_amount: string
  total: string
  vat_rate: string
  no_vat: boolean
  no_vat_reason: string | null
  payment_method: string | null
  notes: string | null
  internal_notes: string | null
  currency: string
  pdf_path: string | null
  sync_status: string
  status: string
  cross_copy_status: CrossCopyStatus
  source_invoice_id: string
  composed_by: string | null
  created_at: string
  updated_at: string
}

export type DocType = 'invoice' | 'proforma' | 'debit_note' | 'credit_note'

export type SyncMode = 'manual' | 'immediate' | 'delayed'

export type DiscountType = 'EUR' | '%'

export interface InvoiceFormData {
  doc_type: DocType
  client_id: string
  stub_id: string
  /** Invoice number as a string (to preserve leading zeros while editing) */
  invoice_number: string
  /** Issue date — mapped to backend ``issue_date`` */
  date: string
  due_date: string
  /** Tax event date — mapped to backend ``tax_event_date`` */
  delivery_date: string
  lines: InvoiceLine[]
  notes: string
  notes_en: string
  internal_notes: string
  discount_type: DiscountType
  discount_value: number
  no_vat: boolean
  no_vat_reason: string
  /** UI-only flag controlling the price-column display mode */
  price_with_vat: boolean
  payment_method: string
  composed_by: string
  sync_mode: SyncMode
  delay_minutes: number
}

export const PAYMENT_METHODS = [
  { value: '', label: 'В брой' },
  { value: 'bank_transfer', label: 'Банков път' },
  { value: 'cod', label: 'Наложен платеж' },
  { value: 'card', label: 'С карта' },
  { value: 'payment_order', label: 'Платежно нареждане' },
  { value: 'check', label: 'Чек/Ваучер' },
  { value: 'offset', label: 'С насрещно прихващане' },
  { value: 'money_transfer', label: 'Паричен превод' },
  { value: 'epay', label: 'E-Pay' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'easypay', label: 'EasyPay' },
  { value: 'postal_transfer', label: 'Пощенски паричен превод' },
  { value: 'other', label: 'Друг' },
] as const

export const UNITS = [
  'бр.', 'кг', 'м', 'л', 'м²', 'м³', 'час', 'ден', 'мес.', 'услуга',
] as const

export const VAT_REASONS = [
  { value: 'чл. 21, ал. 2 от ЗДДС', label: 'чл. 21, ал. 2 от ЗДДС — Място на изпълнение извън България' },
  { value: 'чл. 28 от ЗДДС', label: 'чл. 28 от ЗДДС — Доставка свързана с международен транспорт' },
  { value: 'чл. 41 от ЗДДС', label: 'чл. 41 от ЗДДС — Освободена доставка' },
  { value: 'чл. 42 от ЗДДС', label: 'чл. 42 от ЗДДС — Безвъзмездна доставка' },
  { value: 'чл. 50, ал. 1 от ЗДДС', label: 'чл. 50, ал. 1 от ЗДДС — Освободен внос' },
  { value: 'чл. 113, ал. 9 от ЗДДС', label: 'чл. 113, ал. 9 от ЗДДС — Нерегистрирано по ЗДДС лице' },
  { value: 'чл. 7 от ЗДДС', label: 'чл. 7 от ЗДДС — ВОД (Вътреобщностна доставка)' },
  { value: 'other', label: 'Друго (въведете ръчно)' },
] as const
