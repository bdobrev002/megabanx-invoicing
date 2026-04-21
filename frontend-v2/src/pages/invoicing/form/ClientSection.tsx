import { useRef, useState } from 'react'
import { Search, Users, Download } from 'lucide-react'
import { invoicingApi } from '@/api/invoicing.api'
import { useDialogStore } from '@/stores/dialogStore'
import type { InvoiceClient } from '@/types/invoicing.types'

interface ClientFields {
  name: string
  eik: string
  egn: string
  vat_number: string
  is_vat_registered: boolean
  is_individual: boolean
  mol: string
  city: string
  address: string
}

interface ClientSectionProps {
  clients: InvoiceClient[]
  selectedClientId: string
  values: ClientFields
  onSelectClient: (client: InvoiceClient) => void
  onChange: (patch: Partial<ClientFields>) => void
  disabled?: boolean
}

/** SEC 2 (left column) — client search/picker + identity fields + Trade Registry lookup. */
export default function ClientSection({
  clients,
  selectedClientId,
  values,
  onSelectClient,
  onChange,
  disabled,
}: ClientSectionProps) {
  const [searchInput, setSearchInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [eikLoading, setEikLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const { showError } = useDialogStore()

  // Display value follows props when a client is selected; otherwise local typing state
  const search = selectedClientId && values.name ? values.name : searchInput
  const setSearch = setSearchInput

  const filtered = search
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.eik ?? '').includes(search),
      )
    : []

  const handleEikLookup = async () => {
    const eik = values.eik.trim()
    if (!eik) {
      await showError({ message: 'Въведете ЕИК/Булстат' })
      return
    }
    setEikLoading(true)
    try {
      const res = await invoicingApi.lookupEik(eik)
      onChange({
        name: res.name ?? values.name,
        mol: res.mol ?? values.mol,
        address: res.address ?? values.address,
        vat_number: res.vat_number ?? values.vat_number,
        is_vat_registered: res.is_vat_registered ?? values.is_vat_registered,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Грешка при справка'
      await showError({ message: `Търговски регистър: ${msg}` })
    } finally {
      setEikLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Client search + picker */}
      <div className="flex items-center gap-2">
        <label className="w-[90px] shrink-0 text-sm font-medium text-gray-700">Клиент:</label>
        <div className="relative flex-1">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            disabled={disabled}
            placeholder="Търсене на клиент..."
            className="h-8 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />
          {showDropdown && filtered.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-md">
              {filtered.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className="block w-full cursor-pointer border-b border-gray-100 px-3 py-1.5 text-left text-xs last:border-0 hover:bg-gray-50"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onSelectClient(c)
                    setSearch(c.name)
                    setShowDropdown(false)
                  }}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-[11px] text-gray-500">
                    {c.eik ? `ЕИК: ${c.eik}` : ''}
                    {c.city ? ` • ${c.city}` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowPicker(true)}
          title="Избор от списък"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <Users size={14} />
        </button>
      </div>

      {/* EIK row + TR lookup */}
      <div className="flex items-center gap-2">
        <label className="w-[90px] shrink-0 text-sm font-medium text-gray-700">
          {values.is_individual ? 'ЕГН:' : 'ЕИК/Булстат:'}
        </label>
        <input
          type="text"
          value={values.is_individual ? values.egn : values.eik}
          onChange={(e) =>
            onChange(values.is_individual ? { egn: e.target.value } : { eik: e.target.value })
          }
          disabled={disabled}
          className="h-8 flex-1 rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        />
        {!values.is_individual && (
          <button
            type="button"
            disabled={disabled || eikLoading}
            onClick={handleEikLookup}
            title="Попълни от Търговски регистър"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            <Search size={12} />
            {eikLoading ? '...' : 'ТР'}
          </button>
        )}
      </div>

      {/* Individual + VAT reg checkboxes */}
      <div className="flex flex-wrap items-center gap-4 pl-[90px] pt-1">
        <label className="inline-flex items-center gap-1.5 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={values.is_individual}
            onChange={(e) => onChange({ is_individual: e.target.checked })}
            disabled={disabled}
            className="h-3.5 w-3.5 accent-blue-600"
          />
          Физическо лице
        </label>
        {!values.is_individual && (
          <label className="inline-flex items-center gap-1.5 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={values.is_vat_registered}
              onChange={(e) => onChange({ is_vat_registered: e.target.checked })}
              disabled={disabled}
              className="h-3.5 w-3.5 accent-blue-600"
            />
            Регистрация по ЗДДС
          </label>
        )}
      </div>

      {/* VAT number (only when VAT-registered) */}
      {!values.is_individual && values.is_vat_registered && (
        <div className="flex items-center gap-2">
          <label className="w-[90px] shrink-0 text-sm font-medium text-gray-700">ДДС №:</label>
          <input
            type="text"
            value={values.vat_number}
            onChange={(e) => onChange({ vat_number: e.target.value })}
            disabled={disabled}
            className="h-8 flex-1 rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      )}

      {/* Name */}
      <div className="flex items-center gap-2">
        <label className="w-[90px] shrink-0 text-sm font-medium text-gray-700">Име:</label>
        <input
          type="text"
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          disabled={disabled}
          className="h-8 flex-1 rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>

      {/* MOL */}
      <div className="flex items-center gap-2">
        <label className="w-[90px] shrink-0 text-sm font-medium text-gray-700">МОЛ:</label>
        <input
          type="text"
          value={values.mol}
          onChange={(e) => onChange({ mol: e.target.value })}
          disabled={disabled}
          className="h-8 flex-1 rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>

      {/* City */}
      <div className="flex items-center gap-2">
        <label className="w-[90px] shrink-0 text-sm font-medium text-gray-700">Град:</label>
        <input
          type="text"
          value={values.city}
          onChange={(e) => onChange({ city: e.target.value })}
          disabled={disabled}
          className="h-8 flex-1 rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>

      {/* Address */}
      <div className="flex items-center gap-2">
        <label className="w-[90px] shrink-0 text-sm font-medium text-gray-700">Адрес:</label>
        <input
          type="text"
          value={values.address}
          onChange={(e) => onChange({ address: e.target.value })}
          disabled={disabled}
          className="h-8 flex-1 rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>

      {/* Picker modal */}
      {showPicker && (
        <ClientPicker
          clients={clients}
          onPick={(c) => {
            onSelectClient(c)
            setSearch(c.name)
            setShowPicker(false)
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

function ClientPicker({
  clients,
  onPick,
  onClose,
}: {
  clients: InvoiceClient[]
  onPick: (c: InvoiceClient) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const list = q
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) || (c.eik ?? '').includes(q),
      )
    : clients
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-[600px] flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-base font-semibold">Избор на клиент</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            ×
          </button>
        </div>
        <div className="border-b border-gray-200 p-3">
          <div className="flex items-center gap-2 rounded-md border border-gray-300 px-2">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Търсене..."
              autoFocus
              className="h-8 flex-1 text-sm focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              <Download size={28} className="mx-auto mb-2 text-gray-300" />
              Няма намерени клиенти
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Име</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">ЕИК</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Град</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">МОЛ</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onPick(c)}
                    className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-gray-600">{c.eik ?? ''}</td>
                    <td className="px-3 py-2 text-gray-600">{c.city ?? ''}</td>
                    <td className="px-3 py-2 text-gray-600">{c.mol ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
