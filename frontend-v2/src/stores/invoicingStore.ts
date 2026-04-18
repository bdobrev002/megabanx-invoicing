import { create } from 'zustand'
import type { InvoiceClient, InvoiceItem, InvoiceStub, DocType } from '@/types/invoicing.types'

interface InvoicingState {
  selectedCompanyId: string | null
  clients: InvoiceClient[]
  items: InvoiceItem[]
  stubs: InvoiceStub[]
  activeDocType: DocType
  showClientList: boolean
  showItemList: boolean
  showSettings: boolean

  setSelectedCompany: (id: string | null) => void
  setClients: (clients: InvoiceClient[]) => void
  setItems: (items: InvoiceItem[]) => void
  setStubs: (stubs: InvoiceStub[]) => void
  setActiveDocType: (docType: DocType) => void
  setShowClientList: (show: boolean) => void
  setShowItemList: (show: boolean) => void
  setShowSettings: (show: boolean) => void
}

export const useInvoicingStore = create<InvoicingState>((set) => ({
  selectedCompanyId: null,
  clients: [],
  items: [],
  stubs: [],
  activeDocType: 'invoice',
  showClientList: false,
  showItemList: false,
  showSettings: false,

  setSelectedCompany: (selectedCompanyId) => set({ selectedCompanyId }),
  setClients: (clients) => set({ clients }),
  setItems: (items) => set({ items }),
  setStubs: (stubs) => set({ stubs }),
  setActiveDocType: (activeDocType) => set({ activeDocType }),
  setShowClientList: (showClientList) => set({ showClientList }),
  setShowItemList: (showItemList) => set({ showItemList }),
  setShowSettings: (showSettings) => set({ showSettings }),
}))
