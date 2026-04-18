import { create } from 'zustand'
import type { Company, SharedCompanyInfo } from '@/types/company.types'

interface CompanyState {
  companies: Company[]
  counterparties: Company[]
  sharedCompanies: SharedCompanyInfo[]
  expandedCompanies: Set<string>

  setCompanies: (companies: Company[]) => void
  setCounterparties: (counterparties: Company[]) => void
  setSharedCompanies: (shared: SharedCompanyInfo[]) => void
  toggleExpanded: (companyId: string) => void
}

export const useCompanyStore = create<CompanyState>((set) => ({
  companies: [],
  counterparties: [],
  sharedCompanies: [],
  expandedCompanies: new Set(),

  setCompanies: (companies) => set({ companies }),
  setCounterparties: (counterparties) => set({ counterparties }),
  setSharedCompanies: (sharedCompanies) => set({ sharedCompanies }),
  toggleExpanded: (companyId) =>
    set((state) => {
      const next = new Set(state.expandedCompanies)
      if (next.has(companyId)) next.delete(companyId)
      else next.add(companyId)
      return { expandedCompanies: next }
    }),
}))
