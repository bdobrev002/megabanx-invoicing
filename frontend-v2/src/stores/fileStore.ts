import { create } from 'zustand'
import type { FolderItem } from '@/types/file.types'

interface FileState {
  folderStructure: FolderItem[]
  selectedFiles: Set<string>
  inbox: string[]

  setFolderStructure: (folders: FolderItem[]) => void
  setSelectedFiles: (files: Set<string>) => void
  toggleFileSelection: (fileId: string) => void
  clearSelection: () => void
  setInbox: (inbox: string[]) => void
}

export const useFileStore = create<FileState>((set) => ({
  folderStructure: [],
  selectedFiles: new Set(),
  inbox: [],

  setFolderStructure: (folderStructure) => set({ folderStructure }),
  setSelectedFiles: (selectedFiles) => set({ selectedFiles }),
  toggleFileSelection: (fileId) =>
    set((state) => {
      const next = new Set(state.selectedFiles)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return { selectedFiles: next }
    }),
  clearSelection: () => set({ selectedFiles: new Set() }),
  setInbox: (inbox) => set({ inbox }),
}))
