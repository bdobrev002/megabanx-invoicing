import type { InvoiceStub } from '@/types/invoicing.types'

interface InvoiceDetailsProps {
  stubs: InvoiceStub[]
  stubId: string
  invoiceNumber: string
  issueDate: string
  taxEventDate: string
  dueDate: string
  showDueDate: boolean
  onChange: (patch: {
    stub_id?: string
    invoice_number?: string
    date?: string
    delivery_date?: string
    due_date?: string
    show_due_date?: boolean
  }) => void
  disabled?: boolean
}

/** SEC 2 (right column) — stub + invoice number + dates. */
export default function InvoiceDetails({
  stubs,
  stubId,
  invoiceNumber,
  issueDate,
  taxEventDate,
  dueDate,
  showDueDate,
  onChange,
  disabled,
}: InvoiceDetailsProps) {
  const labelClass = 'w-[140px] shrink-0 text-sm font-medium text-gray-700'
  const inputClass =
    'h-8 flex-1 rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100'

  return (
    <div className="flex flex-col gap-2">
      {/* Stub */}
      <div className="flex items-center gap-2">
        <label className={labelClass}>Кочан:</label>
        <select
          value={stubId}
          onChange={(e) => onChange({ stub_id: e.target.value })}
          disabled={disabled}
          className={`${inputClass} bg-white`}
        >
          <option value="">— без кочан —</option>
          {stubs
            .filter((s) => s.is_active !== false)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.next_number}–{s.end_number})
              </option>
            ))}
        </select>
      </div>

      {/* Invoice number */}
      <div className="flex items-center gap-2">
        <label className={labelClass}>Номер:</label>
        <input
          type="text"
          value={invoiceNumber}
          onChange={(e) => onChange({ invoice_number: e.target.value })}
          disabled={disabled}
          className={inputClass}
        />
      </div>

      {/* Issue date */}
      <div className="flex items-center gap-2">
        <label className={labelClass}>Дата на издаване:</label>
        <input
          type="date"
          value={issueDate}
          onChange={(e) => onChange({ date: e.target.value })}
          disabled={disabled}
          className={inputClass}
        />
      </div>

      {/* Tax event date */}
      <div className="flex items-center gap-2">
        <label className={labelClass}>Дата на данъчно събитие:</label>
        <input
          type="date"
          value={taxEventDate}
          onChange={(e) => onChange({ delivery_date: e.target.value })}
          disabled={disabled}
          className={inputClass}
        />
      </div>

      {/* Due date toggle + field */}
      <div className="flex items-center gap-2">
        <label className={labelClass}>
          <input
            type="checkbox"
            checked={showDueDate}
            onChange={(e) => onChange({ show_due_date: e.target.checked })}
            disabled={disabled}
            className="mr-1 h-3.5 w-3.5 accent-blue-600"
          />
          Дата на падеж:
        </label>
        {showDueDate && (
          <input
            type="date"
            value={dueDate}
            onChange={(e) => onChange({ due_date: e.target.value })}
            disabled={disabled}
            className={inputClass}
          />
        )}
      </div>
    </div>
  )
}
