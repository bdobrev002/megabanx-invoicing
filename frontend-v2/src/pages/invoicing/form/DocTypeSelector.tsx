import type { DocType } from '@/types/invoicing.types'

interface DocTypeSelectorProps {
  value: DocType
  onChange: (next: DocType) => void
  disabled?: boolean
}

const OPTIONS: { value: DocType; label: string; bold?: boolean }[] = [
  { value: 'proforma', label: 'Проформа' },
  { value: 'invoice', label: 'Фактура', bold: true },
  { value: 'debit_note', label: 'Дебитно известие' },
  { value: 'credit_note', label: 'Кредитно известие' },
]

/** SEC 1 — Document type radios (Проформа/Фактура/ДИ/КИ). */
export default function DocTypeSelector({ value, onChange, disabled }: DocTypeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 pb-3">
      <span className="text-sm font-semibold text-gray-700">Тип:</span>
      {OPTIONS.map((opt) => (
        <label
          key={opt.value}
          className={`inline-flex cursor-pointer items-center gap-1.5 text-sm ${
            disabled ? 'cursor-not-allowed opacity-50' : ''
          } ${opt.bold && value === opt.value ? 'font-semibold' : ''}`}
        >
          <input
            type="radio"
            name="inv_doctype"
            value={opt.value}
            checked={value === opt.value}
            disabled={disabled}
            onChange={() => onChange(opt.value)}
            className="h-3.5 w-3.5 accent-blue-600"
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  )
}
