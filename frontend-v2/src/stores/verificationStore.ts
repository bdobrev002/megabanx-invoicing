import { create } from 'zustand'
import type { PendingVerification, VerificationMethod } from '@/types/verification.types'

interface VerificationState {
  pending: PendingVerification[]
  activeMethod: VerificationMethod | null

  setPending: (pending: PendingVerification[]) => void
  setActiveMethod: (method: VerificationMethod | null) => void
}

export const useVerificationStore = create<VerificationState>((set) => ({
  pending: [],
  activeMethod: null,

  setPending: (pending) => set({ pending }),
  setActiveMethod: (activeMethod) => set({ activeMethod }),
}))
