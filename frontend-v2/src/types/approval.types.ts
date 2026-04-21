export interface ApprovalAction {
  file_id: string
  action: 'approve' | 'reject'
  reason?: string
}

export interface ApprovalResult {
  success: boolean
  message: string
  file_id: string
}
