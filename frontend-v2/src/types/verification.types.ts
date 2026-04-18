export interface PendingVerification {
  id: string
  status: string
  created_at: string
  verification_code: string
  eik: string
  company_name: string
  vat_number: string
  address: string
  mol: string
  profile_id: string
}

export type VerificationMethod = 'bank_transfer' | 'qr_code' | 'id_card'
