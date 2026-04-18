import { create } from 'zustand'
import type { AuthUser, AuthScreen } from '@/types/auth.types'

interface AuthState {
  user: AuthUser | null
  token: string | null
  authScreen: AuthScreen
  isLoading: boolean

  setUser: (user: AuthUser | null) => void
  setToken: (token: string | null) => void
  setAuthScreen: (screen: AuthScreen) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  authScreen: 'login',
  isLoading: false,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
    set({ token })
  },
  setAuthScreen: (authScreen) => set({ authScreen }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, authScreen: 'login' })
  },
}))
