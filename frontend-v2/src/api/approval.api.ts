import { apiFetch } from './client'
import type { ApprovalResult } from '@/types/approval.types'

export const approvalApi = {
  approve: (fileId: string) =>
    apiFetch<ApprovalResult>(`/approval/${fileId}/approve`, { method: 'POST' }),

  reject: (fileId: string, reason?: string) =>
    apiFetch<ApprovalResult>(`/approval/${fileId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  batchApprove: (fileIds: string[]) =>
    apiFetch<ApprovalResult[]>('/approval/batch-approve', {
      method: 'POST',
      body: JSON.stringify({ file_ids: fileIds }),
    }),
}
