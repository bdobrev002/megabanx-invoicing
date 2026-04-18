import { create } from 'zustand'
import type { AdminUser, AdminStats, SystemLog } from '@/types/admin.types'

interface AdminState {
  stats: AdminStats | null
  users: AdminUser[]
  logs: SystemLog[]

  setStats: (stats: AdminStats | null) => void
  setUsers: (users: AdminUser[]) => void
  setLogs: (logs: SystemLog[]) => void
}

export const useAdminStore = create<AdminState>((set) => ({
  stats: null,
  users: [],
  logs: [],

  setStats: (stats) => set({ stats }),
  setUsers: (users) => set({ users }),
  setLogs: (logs) => set({ logs }),
}))
