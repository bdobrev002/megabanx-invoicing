import { create } from 'zustand'
import type { Profile } from '@/types/profile.types'

interface ProfileState {
  profiles: Profile[]
  activeProfileId: string | null

  setProfiles: (profiles: Profile[]) => void
  setActiveProfile: (id: string | null) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  profiles: [],
  activeProfileId: null,

  setProfiles: (profiles) => set({ profiles }),
  setActiveProfile: (activeProfileId) => set({ activeProfileId }),
}))
