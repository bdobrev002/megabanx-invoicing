import { create } from 'zustand'
import type { AuthUser } from '@/types/auth.types'
import { authApi } from '@/api/auth.api'

interface AuthState {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  error: string | null
  success: string | null

  // Form state shared across auth screens
  authEmail: string
  authName: string
  authCode: string
  authTosAccepted: boolean
  authNeedsTos: boolean

  setUser: (user: AuthUser | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
  setAuthEmail: (email: string) => void
  setAuthName: (name: string) => void
  setAuthCode: (code: string) => void
  setAuthTosAccepted: (accepted: boolean) => void
  setAuthNeedsTos: (needs: boolean) => void
  fetchUser: () => Promise<void>
  resetAuthForm: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
  success: null,

  authEmail: '',
  authName: '',
  authCode: '',
  authTosAccepted: false,
  authNeedsTos: false,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
    set({ token })
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSuccess: (success) => set({ success }),
  setAuthEmail: (authEmail) => set({ authEmail }),
  setAuthName: (authName) => set({ authName }),
  setAuthCode: (authCode) => set({ authCode }),
  setAuthTosAccepted: (authTosAccepted) => set({ authTosAccepted }),
  setAuthNeedsTos: (authNeedsTos) => set({ authNeedsTos }),
  resetAuthForm: () =>
    set({
      authEmail: '',
      authName: '',
      authCode: '',
      authTosAccepted: false,
      authNeedsTos: false,
      error: null,
      success: null,
    }),
  fetchUser: async () => {
    set({ isLoading: true })
    try {
      const user = await authApi.me()
      set({ user, isLoading: false })
    } catch {
      // Token expired or invalid — clear auth state
      localStorage.removeItem('token')
      set({ user: null, token: null, isLoading: false })
    }
  },
  logout: () => {
    // Invalidate token server-side (fire-and-forget)
    authApi.logout()
    localStorage.removeItem('token')
    set({
      user: null,
      token: null,
      authEmail: '',
      authName: '',
      authCode: '',
      authTosAccepted: false,
      authNeedsTos: false,
      error: null,
      success: null,
    })
  },
}))
