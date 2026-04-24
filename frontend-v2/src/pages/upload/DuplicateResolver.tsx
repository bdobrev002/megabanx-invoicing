import { useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import {
  AlertTriangle,
  Copy,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import type { DuplicateResolveAction } from '@/api/files.api'
import type { InvoiceRecord } from '@/types/file.types'

export interface DuplicatePendingItem {
  /** The ``duplicate_pending`` invoice row ID (quarantined new file). */
  pending: InvoiceRecord
  /** The existing invoice this new file collides with. */
  existing?: InvoiceRecord | null
  /** Original filename shown in the list. */
  original_filename: string
}

interface Props {
  items: DuplicatePendingItem[]
  /** Called after user picks "Приложи избора" — parent runs the API calls
   * and then closes the modal via ``onClose``. */
  onApply: (choices: Record<string, DuplicateResolveAction>) => Promise<void> | void
  onClose: () => void
}

/** v1 parity 3-button duplicate resolution dialog. Mirrors
 * ``/opt/bginvoices/source/frontend/App.tsx:3932-4020``. */
export default function DuplicateResolver({ items, onApply, onClose }: Props) {
  const initial = useMemo(
    () =>
      Object.fromEntries(
        items.map((i) => [i.pending.id, 'keep_existing' as DuplicateResolveAction]),
      ),
    [items],
  )
  const [choices, setChoices] = useState<Record<string, DuplicateResolveAction>>(initial)
  const [busy, setBusy] = useState(false)

  if (items.length === 0) return null

  const setChoice = (id: string, action: DuplicateResolveAction) => {
    setChoices((prev) => ({ ...prev, [id]: action }))
  }

  const handleApply = async () => {
    setBusy(true)
    try {
      await onApply(choices)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start gap-3 border-b border-gray-200 px-6 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">
              Открити дублиращи се фактури
            </h3>
            <p className="text-sm text-gray-600">
              {items.length === 1
                ? 'Открита е 1 дублираща се фактура. Моля, изберете какво да направим.'
                : `Открити са ${items.length} дублиращи се фактури. Моля, изберете какво да направим за всяка.`}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ul className="space-y-3">
            {items.map((item) => {
              const active = choices[item.pending.id] ?? 'keep_existing'
              const invNum = item.pending.invoice_number || '—'
              const companyName =
                item.existing?.company_name ||
                item.pending.company_name ||
                item.pending.issuer_name ||
                item.original_filename
              return (
                <li
                  key={item.pending.id}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                >
                  <div className="mb-3 flex items-start gap-2">
                    <Copy size={16} className="mt-0.5 shrink-0 text-amber-600" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        Фактура #{invNum} — {companyName}
                      </p>
                      {item.pending.error_message ? (
                        <p className="mt-0.5 text-xs text-amber-800">
                          {item.pending.error_message}
                        </p>
                      ) : null}
                      <p className="mt-0.5 truncate text-xs text-gray-600">
                        Нов файл: {item.original_filename}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <ChoiceButton
                      color="red"
                      icon={<Trash2 size={14} />}
                      label="Запази текущата"
                      active={active === 'keep_existing'}
                      onClick={() => setChoice(item.pending.id, 'keep_existing')}
                    />
                    <ChoiceButton
                      color="blue"
                      icon={<RefreshCw size={14} />}
                      label="Замени с новата"
                      active={active === 'replace'}
                      onClick={() => setChoice(item.pending.id, 'replace')}
                    />
                    <ChoiceButton
                      color="green"
                      icon={<Copy size={14} />}
                      label="Запази и двете"
                      active={active === 'keep_both'}
                      onClick={() => setChoice(item.pending.id, 'keep_both')}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-3">
          <Button size="sm" variant="outline" onClick={onClose} disabled={busy}>
            Отказ
          </Button>
          <Button size="sm" onClick={handleApply} disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={14} className="mr-1 animate-spin" />
                Прилагам...
              </>
            ) : (
              'Приложи избора'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

type ChoiceColor = 'red' | 'blue' | 'green'

const COLOR_CLASSES: Record<ChoiceColor, { active: string; idle: string }> = {
  red: {
    active: 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200',
    idle: 'border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50',
  },
  blue: {
    active: 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200',
    idle: 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50',
  },
  green: {
    active: 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200',
    idle: 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50',
  },
}

function ChoiceButton({
  color,
  icon,
  label,
  active,
  onClick,
}: {
  color: ChoiceColor
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  const cls = COLOR_CLASSES[color]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
        active ? cls.active : cls.idle
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
