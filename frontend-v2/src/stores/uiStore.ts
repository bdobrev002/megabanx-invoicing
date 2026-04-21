import { create } from 'zustand'

interface UiState {
  error: string | null
  success: string | null
  isLoading: boolean
  sidebarOpen: boolean

  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
  setLoading: (loading: boolean) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  error: null,
  success: null,
  isLoading: false,
  sidebarOpen: false,

  setError: (error) => set({ error }),
  setSuccess: (success) => set({ success }),
  setLoading: (isLoading) => set({ isLoading }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}))
