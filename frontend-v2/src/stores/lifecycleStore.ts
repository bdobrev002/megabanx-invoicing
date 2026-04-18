import { create } from 'zustand'
import type { LifecycleRule } from '@/types/lifecycle.types'

interface LifecycleState {
  rules: LifecycleRule[]

  setRules: (rules: LifecycleRule[]) => void
}

export const useLifecycleStore = create<LifecycleState>((set) => ({
  rules: [],

  setRules: (rules) => set({ rules }),
}))
