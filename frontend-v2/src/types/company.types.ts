export interface Company {
  id: string
  name: string
  eik: string
  vat_number: string
  address: string
  mol: string
  city?: string
  country?: string
  phone?: string
  email?: string
  logo_path?: string
  managers?: string[]
  partners?: string[]
}

export interface CompanyShare {
  id: string
  company_id: string
  company_eik: string
  company_name: string
  owner_profile_id: string
  owner_user_id: string
  shared_with_email: string
  shared_with_user_id: string
  can_upload: boolean
  created_at: string
}

export interface SharedCompanyInfo {
  share_id: string
  company: Company
  owner_profile_id: string
  owner_name: string
  owner_email: string
  can_upload: boolean
  shared_at: string
}
