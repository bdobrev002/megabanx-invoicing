import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { invoicingApi, type EditableInvoiceResponse } from '@/api/invoicing.api'
import { useDialogStore } from '@/stores/dialogStore'
import type {
  DiscountType,
  DocType,
  InvoiceClient,
  InvoiceFormData,
  InvoiceItem,
  InvoiceLine,
  InvoiceStub,
  SyncMode,
} from '@/types/invoicing.types'
import DocTypeSelector from './DocTypeSelector'
import ClientSection from './ClientSection'
import InvoiceDetails from './InvoiceDetails'
import LineItemsTable from './LineItemsTable'
import TotalsSection from './TotalsSection'
import NotesSection from './NotesSection'
import FormActions from './FormActions'

export interface InvoiceFormProps {
  open: boolean
  mode: 'create' | 'edit'
  companyId: string
  profileId: string
  invoiceId?: string
  onClose: () => void
  onSaved: () => void
}

const DOC_TITLES: Record<DocType, string> = {
  invoice: 'Фактура',
  proforma: 'Проформа',
  debit_note: 'Дебитно известие',
  credit_note: 'Кредитно известие',
}

function defaultFormData(): InvoiceFormData {
  const today = new Date().toISOString().slice(0, 10)
  return {
    doc_type: 'invoice',
    client_id: '',
    stub_id: '',
    invoice_number: '',
    date: today,
    due_date: '',
    delivery_date: today,
    lines: [
      { description: '', quantity: 1, unit: 'бр.', price: 0, vat_rate: 20 },
    ],
    notes: '',
    notes_en: '',
    internal_notes: '',
    discount_type: 'EUR',
    discount_value: 0,
    no_vat: false,
    no_vat_reason: '',
    price_with_vat: false,
    payment_method: '',
    composed_by: '',
    sync_mode: 'manual',
    delay_minutes: 30,
  }
}

/** Full invoice create/edit form — SEC 1–11 composed from 7 child components. */
export default function InvoiceForm({
  open,
  mode,
  companyId,
  profileId,
  invoiceId,
  onClose,
  onSaved,
}: InvoiceFormProps) {
  const { showError, showAlert } = useDialogStore()
  const [data, setData] = useState<InvoiceFormData>(defaultFormData)
  const [clients, setClients] = useState<InvoiceClient[]>([])
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [stubs, setStubs] = useState<InvoiceStub[]>([])
  const [clientFields, setClientFields] = useState({
    name: '',
    eik: '',
    egn: '',
    vat_number: '',
    is_vat_registered: false,
    is_individual: false,
    mol: '',
    city: '',
    address: '',
  })
  const [showDueDate, setShowDueDate] = useState(false)
  const [customNoVatReason, setCustomNoVatReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [showItemPicker, setShowItemPicker] = useState<number | null>(null)
  /** Current persisted status of the invoice being edited ('issued' or 'draft'). */
  const [currentStatus, setCurrentStatus] = useState<'issued' | 'draft'>('issued')

  const hydrateFromEditable = useCallback(
    (resp: EditableInvoiceResponse, allClients: InvoiceClient[]) => {
      const m = resp.meta
      // Split combined notes back into BG/EN if delimiter present
      let notesBg = m.notes ?? ''
      let notesEn = ''
      const idx = notesBg.indexOf('\n\n---EN---\n')
      if (idx >= 0) {
        notesEn = notesBg.slice(idx + '\n\n---EN---\n'.length)
        notesBg = notesBg.slice(0, idx)
      }
      const lines: InvoiceLine[] = resp.lines.map((l) => ({
        id: l.id,
        item_id: l.item_id,
        position: l.position,
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.unit,
        price: Number(l.unit_price),
        vat_rate: Number(l.vat_rate),
      }))
      setData({
        doc_type: m.document_type as DocType,
        client_id: m.client_id ?? '',
        stub_id: '',
        invoice_number: m.invoice_number != null ? String(m.invoice_number) : '',
        date: m.issue_date ?? '',
        due_date: m.due_date ?? '',
        delivery_date: m.tax_event_date ?? '',
        lines: lines.length > 0 ? lines : defaultFormData().lines,
        notes: notesBg,
        notes_en: notesEn,
        internal_notes: m.internal_notes ?? '',
        discount_type: 'EUR',
        discount_value: Number(m.discount) || 0,
        no_vat: m.no_vat,
        no_vat_reason: m.no_vat_reason ?? '',
        price_with_vat: false,
        payment_method: m.payment_method ?? '',
        composed_by: m.composed_by ?? '',
        sync_mode: 'manual',
        delay_minutes: 30,
      })
      setShowDueDate(Boolean(m.due_date))
      setCurrentStatus(m.status === 'draft' ? 'draft' : 'issued')
      if (m.client_id) {
        const c = allClients.find((x) => x.id === m.client_id)
        if (c) {
          setClientFields({
            name: c.name,
            eik: c.eik ?? '',
            egn: c.egn ?? '',
            vat_number: c.vat_number ?? '',
            is_vat_registered: c.is_vat_registered ?? false,
            is_individual: c.is_individual ?? false,
            mol: c.mol ?? '',
            city: c.city ?? '',
            address: c.address ?? '',
          })
        }
      }
    },
    [],
  )

  // Load clients/items/stubs + optional editable invoice when opened.
  // We use an async IIFE so setLoading(false) runs in a microtask, not
  // synchronously in the effect body (which react-hooks/set-state-in-effect
  // forbids). `loading` is initialized to `true`, so we never need to flip
  // it on synchronously.
  useEffect(() => {
    if (!open || !companyId || !profileId) return
    let cancelled = false
    void (async () => {
      try {
        const [cl, it, st] = await Promise.all([
          invoicingApi.getClients(companyId, profileId),
          invoicingApi.getItems(companyId, profileId),
          invoicingApi.getStubs(companyId, profileId),
        ])
        if (cancelled) return
        setClients(cl)
        setItems(it)
        setStubs(st)
        if (mode === 'edit' && invoiceId) {
          const editable = await invoicingApi.getEditableInvoice(invoiceId)
          if (cancelled) return
          hydrateFromEditable(editable, cl)
          setReadOnly(!editable.editable)
        } else {
          setReadOnly(false)
          setData(defaultFormData())
          setClientFields({
            name: '',
            eik: '',
            egn: '',
            vat_number: '',
            is_vat_registered: false,
            is_individual: false,
            mol: '',
            city: '',
            address: '',
          })
          try {
            const res = await invoicingApi.getNextNumber(companyId, profileId, 'invoice')
            if (!cancelled) {
              setData((d) => ({ ...d, invoice_number: String(res.next_number) }))
            }
          } catch {
            // non-fatal — user can type number manually
          }
        }
        // Preload company-level sync settings so the controls reflect reality
        try {
          const sync = await invoicingApi.getSyncSettings(companyId, profileId)
          if (!cancelled) {
            setData((d) => ({
              ...d,
              sync_mode: sync.sync_mode,
              delay_minutes: sync.delay_minutes,
            }))
          }
        } catch {
          // non-fatal — controls will just show defaults
        }
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Грешка при зареждане'
        await showError({ message: msg })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, companyId, profileId, invoiceId, mode, hydrateFromEditable, showError])

  const preloadNextNumber = useCallback(
    async (docType: DocType) => {
      try {
        const res = await invoicingApi.getNextNumber(companyId, profileId, docType)
        setData((d) => ({ ...d, invoice_number: String(res.next_number) }))
      } catch {
        // non-fatal — user can type number manually
      }
    },
    [companyId, profileId],
  )

  // --- handlers ---------------------------------------------------------

  const handleDocTypeChange = (dt: DocType) => {
    setData((d) => ({ ...d, doc_type: dt }))
    if (mode === 'create') void preloadNextNumber(dt)
  }

  const handleSelectClient = (c: InvoiceClient) => {
    setData((d) => ({ ...d, client_id: c.id }))
    setClientFields({
      name: c.name,
      eik: c.eik ?? '',
      egn: c.egn ?? '',
      vat_number: c.vat_number ?? '',
      is_vat_registered: c.is_vat_registered ?? false,
      is_individual: c.is_individual ?? false,
      mol: c.mol ?? '',
      city: c.city ?? '',
      address: c.address ?? '',
    })
  }

  const handleClientFieldsChange = (patch: Partial<typeof clientFields>) => {
    setClientFields((f) => ({ ...f, ...patch }))
  }

  const handleDetailsChange = (patch: {
    stub_id?: string
    invoice_number?: string
    date?: string
    delivery_date?: string
    due_date?: string
    show_due_date?: boolean
  }) => {
    if (patch.show_due_date !== undefined) {
      setShowDueDate(patch.show_due_date)
      if (!patch.show_due_date) setData((d) => ({ ...d, due_date: '' }))
      return
    }
    setData((d) => ({ ...d, ...patch }))
  }

  const handleLinesChange = (lines: InvoiceLine[]) => setData((d) => ({ ...d, lines }))

  const handlePriceModeToggle = () =>
    setData((d) => ({ ...d, price_with_vat: !d.price_with_vat }))

  const handleTotalsChange = (patch: {
    discount_value?: number
    discount_type?: DiscountType
    no_vat?: boolean
    no_vat_reason?: string
    custom_no_vat_reason?: string
    composed_by?: string
    vat_rate_display?: number
  }) => {
    if (patch.custom_no_vat_reason !== undefined) {
      setCustomNoVatReason(patch.custom_no_vat_reason)
      return
    }
    if (patch.no_vat !== undefined) {
      setData((d) => ({
        ...d,
        no_vat: patch.no_vat as boolean,
        lines: d.lines.map((l) => ({ ...l, vat_rate: patch.no_vat ? 0 : 20 })),
      }))
      return
    }
    if (patch.vat_rate_display !== undefined) {
      const rate = patch.vat_rate_display
      setData((d) => ({ ...d, lines: d.lines.map((l) => ({ ...l, vat_rate: rate })) }))
      return
    }
    setData((d) => ({ ...d, ...patch }))
  }

  const handleNotesChange = (patch: {
    notes?: string
    notes_en?: string
    internal_notes?: string
    payment_method?: string
  }) => setData((d) => ({ ...d, ...patch }))

  const handleSyncChange = (patch: { sync_mode?: SyncMode; delay_minutes?: number }) => {
    // Compute the merged values from the current committed state BEFORE
    // dispatching setData. Do NOT call APIs inside a setState updater — React
    // StrictMode invokes updaters twice in dev, which would duplicate requests.
    const merged = {
      sync_mode: patch.sync_mode ?? data.sync_mode,
      delay_minutes: patch.delay_minutes ?? data.delay_minutes,
    }
    setData((d) => ({ ...d, ...patch }))
    // Persist to company-level sync settings. Fire-and-forget; non-fatal on error.
    void invoicingApi.updateSyncSettings(companyId, profileId, merged).catch(() => {
      // swallow — UI already reflects user's choice; retry on next change
    })
  }

  const pickItem = (item: InvoiceItem) => {
    if (showItemPicker == null) return
    const idx = showItemPicker
    setData((d) => ({
      ...d,
      lines: d.lines.map((l, i) =>
        i === idx
          ? {
              ...l,
              item_id: item.id,
              description: item.name,
              unit: item.unit || l.unit,
              price: Number(item.default_price ?? item.price ?? l.price) || 0,
              vat_rate: item.vat_rate != null ? Number(item.vat_rate) : l.vat_rate,
            }
          : l,
      ),
    }))
    setShowItemPicker(null)
  }

  const handleSubmit = async (status: 'issued' | 'draft') => {
    // Validation
    if (!data.client_id && !clientFields.name) {
      await showError({ message: 'Моля, изберете или въведете клиент.' })
      return
    }
    if (data.lines.length === 0 || data.lines.every((l) => !l.description && !l.price)) {
      await showError({ message: 'Добавете поне един ред с артикул.' })
      return
    }
    const resolvedNoVatReason =
      data.no_vat_reason === 'other' ? customNoVatReason : data.no_vat_reason
    if (data.no_vat && !resolvedNoVatReason) {
      await showError({
        message:
          data.no_vat_reason === 'other'
            ? 'Въведете основание за неначисляване на ДДС.'
            : 'Изберете основание за неначисляване на ДДС.',
      })
      return
    }

    // Ensure client exists (create ad-hoc if user typed manually without picking from list)
    let clientId = data.client_id
    if (!clientId && clientFields.name) {
      try {
        const newClient = await invoicingApi.createClient(companyId, profileId, {
          name: clientFields.name,
          eik: clientFields.eik || null,
          egn: clientFields.egn || null,
          vat_number: clientFields.vat_number || null,
          is_vat_registered: clientFields.is_vat_registered,
          is_individual: clientFields.is_individual,
          mol: clientFields.mol || null,
          city: clientFields.city || null,
          address: clientFields.address || null,
        })
        clientId = newClient.id
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Грешка при създаване на клиент'
        await showError({ message: msg })
        return
      }
    }

    const payload: InvoiceFormData = {
      ...data,
      client_id: clientId,
      no_vat_reason:
        data.no_vat_reason === 'other' ? customNoVatReason : data.no_vat_reason,
    }

    setSubmitting(true)
    try {
      if (mode === 'edit' && invoiceId) {
        // Allow demotion issued→draft if the user explicitly clicks "Чернова",
        // otherwise preserve the current persisted status (never silently
        // promote a draft to issued just because FormActions defaults to
        // 'issued' on its primary submit button).
        const targetStatus: 'issued' | 'draft' = status === 'draft' ? 'draft' : currentStatus
        await invoicingApi.updateInvoice(invoiceId, companyId, profileId, payload, targetStatus)
      } else if (status === 'draft') {
        await invoicingApi.createDraftInvoice(companyId, profileId, payload)
      } else {
        await invoicingApi.createInvoice(companyId, profileId, payload)
      }
      await showAlert({ title: 'Готово', message: 'Фактурата е запазена успешно.' })
      onSaved()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Грешка при запис'
      await showError({ message: msg })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const [currentVatRate] = Array.from(
    new Set(data.lines.map((l) => Number(l.vat_rate) || 0)),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[calc(100vh-3rem)] w-[min(1100px,95vw)] flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'edit' ? 'Редактиране на ' : 'Нова '}
            {DOC_TITLES[data.doc_type]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Затвори"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-gray-500">
              Зареждане...
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {readOnly && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Тази фактура е одобрена от контрагента и не може да се редактира.
                </div>
              )}

              <DocTypeSelector
                value={data.doc_type}
                onChange={handleDocTypeChange}
                disabled={readOnly}
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <ClientSection
                  clients={clients}
                  selectedClientId={data.client_id}
                  values={clientFields}
                  onSelectClient={handleSelectClient}
                  onChange={handleClientFieldsChange}
                  disabled={readOnly}
                />
                <InvoiceDetails
                  stubs={stubs}
                  stubId={data.stub_id}
                  invoiceNumber={data.invoice_number}
                  issueDate={data.date}
                  taxEventDate={data.delivery_date}
                  dueDate={data.due_date}
                  showDueDate={showDueDate}
                  onChange={handleDetailsChange}
                  disabled={readOnly}
                />
              </div>

              <LineItemsTable
                lines={data.lines}
                items={items}
                priceWithVat={data.price_with_vat}
                noVat={data.no_vat}
                onLinesChange={handleLinesChange}
                onPriceModeToggle={handlePriceModeToggle}
                onPickItem={(idx) => setShowItemPicker(idx)}
                disabled={readOnly}
              />

              <TotalsSection
                lines={data.lines}
                discountValue={data.discount_value}
                discountType={data.discount_type}
                noVat={data.no_vat}
                noVatReason={data.no_vat_reason}
                customNoVatReason={customNoVatReason}
                composedBy={data.composed_by}
                vatRateDisplay={currentVatRate ?? 20}
                onChange={handleTotalsChange}
                disabled={readOnly}
              />

              <NotesSection
                notes={data.notes}
                notesEn={data.notes_en}
                internalNotes={data.internal_notes}
                paymentMethod={data.payment_method}
                onChange={handleNotesChange}
                disabled={readOnly}
              />

              <FormActions
                mode={mode}
                syncMode={data.sync_mode}
                delayMinutes={data.delay_minutes}
                submitting={submitting}
                onCancel={onClose}
                onSubmit={handleSubmit}
                onSyncChange={handleSyncChange}
                disabled={readOnly}
              />
            </div>
          )}
        </div>

        {/* Item picker modal */}
        {showItemPicker !== null && (
          <ItemPicker
            items={items}
            onPick={pickItem}
            onClose={() => setShowItemPicker(null)}
          />
        )}
      </div>
    </div>
  )
}

function ItemPicker({
  items,
  onPick,
  onClose,
}: {
  items: InvoiceItem[]
  onPick: (item: InvoiceItem) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const list = q
    ? items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
    : items
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-[560px] flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-base font-semibold">Избор от каталога</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="border-b border-gray-200 p-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Търсене..."
            autoFocus
            className="h-8 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Няма артикули в каталога.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {list.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => onPick(it)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium text-gray-900">{it.name}</span>
                    <span className="text-xs text-gray-500">
                      {Number(it.default_price ?? it.price ?? 0).toFixed(2)} EUR
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
