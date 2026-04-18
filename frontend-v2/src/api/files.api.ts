import { apiFetch, uploadFetch } from './client'
import type { FolderItem, InvoiceRecord } from '@/types/file.types'

export const filesApi = {
  getFolderStructure: () =>
    apiFetch<FolderItem[]>('/files/folder-structure'),

  upload: (files: File[]) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    return uploadFetch('/files/upload', fd)
  },

  process: (filenames: string[]) =>
    apiFetch<{ task_id: string }>('/files/process', {
      method: 'POST',
      body: JSON.stringify({ filenames }),
    }),

  getProcessStatus: (taskId: string) =>
    apiFetch<{ status: string; results: InvoiceRecord[] }>(
      `/files/process/${taskId}/status`,
    ),

  download: (driveId: string) =>
    apiFetch<Blob>(`/files/download/${driveId}`),

  remove: (driveId: string) =>
    apiFetch<void>(`/files/${driveId}`, { method: 'DELETE' }),

  batchDelete: (driveIds: string[]) =>
    apiFetch<void>('/files/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ drive_ids: driveIds }),
    }),

  getInbox: () => apiFetch<string[]>('/files/inbox'),

  removeFromInbox: (filename: string) =>
    apiFetch<void>(`/files/inbox/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    }),
}
