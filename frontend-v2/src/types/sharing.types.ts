export interface ShareInvite {
  email: string
  company_id: string
  can_upload: boolean
}

export interface ShareResponse {
  success: boolean
  message: string
  share_id?: string
}
