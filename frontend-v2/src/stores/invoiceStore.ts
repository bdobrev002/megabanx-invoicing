import { create } from 'zustand'
import type { InvoiceHistoryItem, InvoiceFilter } from '@/types/invoice.types'

interface InvoiceState {
  invoices: InvoiceHistoryItem[]
  filters: InvoiceFilter

  setInvoices: (invoices: InvoiceHistoryItem[]) => void
  setFilters: (filters: InvoiceFilter) => void
  resetFilters: () => void
}

export const useInvoiceStore = create<InvoiceState>((set) => ({
  invoices: [],
  filters: {},

  setInvoices: (invoices) => set({ invoices }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: {} }),
}))
