import { create } from 'zustand'
import type { PairingRule, PairingResult } from '@/types/pairing.types'

interface PairingState {
  rules: PairingRule[]
  results: PairingResult[]

  setRules: (rules: PairingRule[]) => void
  setResults: (results: PairingResult[]) => void
}

export const usePairingStore = create<PairingState>((set) => ({
  rules: [],
  results: [],

  setRules: (rules) => set({ rules }),
  setResults: (results) => set({ results }),
}))
