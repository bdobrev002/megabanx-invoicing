import { useState } from 'react'
import { PAYMENT_METHODS } from '@/types/invoicing.types'

interface NotesSectionProps {
  notes: string
  notesEn: string
  internalNotes: string
  paymentMethod: string
  onChange: (patch: {
    notes?: string
    notes_en?: string
    internal_notes?: string
    payment_method?: string
  }) => void
  disabled?: boolean
}

/** SEC 8 (customer-visible notes with BG/EN tabs) + SEC 9 (payment method) + SEC 10 (internal notes). */
export default function NotesSection({
  notes,
  notesEn,
  internalNotes,
  paymentMethod,
  onChange,
  disabled,
}: NotesSectionProps) {
  const [tab, setTab] = useState<'bg' | 'en'>('bg')

  return (
    <div className="flex flex-col gap-3">
      {/* SEC 8: notes with BG/EN tabs */}
      <div>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm font-semibold text-gray-700">Забележки:</span>
          <button
            type="button"
            onClick={() => setTab('bg')}
            className={`rounded-t-md border border-b-0 px-3 py-1 text-xs ${
              tab === 'bg'
                ? 'border-gray-300 bg-white font-semibold text-gray-900'
                : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Български
          </button>
          <button
            type="button"
            onClick={() => setTab('en')}
            className={`rounded-t-md border border-b-0 px-3 py-1 text-xs ${
              tab === 'en'
                ? 'border-gray-300 bg-white font-semibold text-gray-900'
                : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            English
          </button>
        </div>
        <textarea
          value={tab === 'bg' ? notes : notesEn}
          onChange={(e) =>
            onChange(tab === 'bg' ? { notes: e.target.value } : { notes_en: e.target.value })
          }
          disabled={disabled}
          rows={3}
          placeholder={
            tab === 'bg' ? 'Забележки, видими за клиента...' : 'Notes visible to the client...'
          }
          className="w-full rounded-md rounded-tl-none border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>

      {/* SEC 9: payment method */}
      <div className="flex items-center gap-2">
        <label className="w-[140px] shrink-0 text-sm font-medium text-gray-700">
          Начин на плащане:
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => onChange({ payment_method: e.target.value })}
          disabled={disabled}
          className="h-8 flex-1 rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        >
          {PAYMENT_METHODS.map((pm) => (
            <option key={pm.value} value={pm.value}>
              {pm.label}
            </option>
          ))}
        </select>
      </div>

      {/* SEC 10: internal comments */}
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <label className="mb-1 block text-xs font-semibold text-amber-800">
          Вътрешни коментари (не се виждат от клиента)
        </label>
        <textarea
          value={internalNotes}
          onChange={(e) => onChange({ internal_notes: e.target.value })}
          disabled={disabled}
          rows={2}
          placeholder="Бележки за вътрешна употреба..."
          className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-100"
        />
      </div>
    </div>
  )
}
