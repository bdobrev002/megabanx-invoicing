import { ChevronDown, Plus, X, GripVertical, List } from 'lucide-react'
import type { InvoiceItem, InvoiceLine } from '@/types/invoicing.types'
import { UNITS } from '@/types/invoicing.types'

interface LineItemsTableProps {
  lines: InvoiceLine[]
  items: InvoiceItem[]
  priceWithVat: boolean
  noVat: boolean
  onLinesChange: (next: InvoiceLine[]) => void
  onPriceModeToggle: () => void
  onPickItem: (lineIdx: number) => void
  disabled?: boolean
}

/** SEC 3-4 — editable line items table with price mode toggle + add/remove rows. */
export default function LineItemsTable({
  lines,
  priceWithVat,
  noVat,
  onLinesChange,
  onPriceModeToggle,
  onPickItem,
  disabled,
}: LineItemsTableProps) {
  const updateLine = (idx: number, patch: Partial<InvoiceLine>) => {
    const next = lines.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    onLinesChange(next)
  }

  const removeLine = (idx: number) => {
    if (lines.length === 1) {
      // keep at least one empty row
      onLinesChange([emptyLine(noVat)])
      return
    }
    onLinesChange(lines.filter((_, i) => i !== idx))
  }

  const insertAfter = (idx: number) => {
    const next = [...lines]
    next.splice(idx + 1, 0, emptyLine(noVat))
    onLinesChange(next)
  }

  const addLine = () => onLinesChange([...lines, emptyLine(noVat)])

  const subtotalRaw = lines.reduce(
    (acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.price) || 0),
    0,
  )

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-gray-300">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50 text-xs font-semibold text-gray-700">
              <th className="w-[100px] border-r border-gray-200 px-1 py-2" />
              <th className="min-w-[220px] border-r border-gray-200 px-2 py-2 text-center">
                Артикул
              </th>
              <th className="w-[130px] border-r border-gray-200 px-2 py-2 text-center">
                Количество
              </th>
              <th className="w-[150px] border-r border-gray-200 px-2 py-2 text-center">
                <button
                  type="button"
                  onClick={onPriceModeToggle}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 font-semibold text-gray-700 hover:text-blue-600 disabled:opacity-50"
                  title="Превключи режима на цената"
                >
                  {priceWithVat ? 'Цена с ДДС' : 'Цена без ДДС'}
                  <ChevronDown size={12} />
                </button>
              </th>
              <th className="w-[100px] px-2 py-2 text-center">Стойност</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => {
              const qty = Number(line.quantity) || 0
              const priceNoVat = Number(line.price) || 0
              const displayPrice = priceWithVat
                ? priceNoVat * (1 + (Number(line.vat_rate) || 0) / 100)
                : priceNoVat
              const lineTotal = qty * priceNoVat
              return (
                <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="border-r border-gray-100 px-1 py-1">
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="cursor-grab p-1 text-gray-300" title="Премести">
                        <GripVertical size={12} />
                      </span>
                      <button
                        type="button"
                        onClick={() => insertAfter(i)}
                        disabled={disabled}
                        className="p-1 text-blue-500 hover:text-blue-700 disabled:opacity-50"
                        title="Добави ред"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={disabled}
                        className="p-1 text-red-400 hover:text-red-600 disabled:opacity-50"
                        title="Премахни ред"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="border-r border-gray-100 px-1 py-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                        disabled={disabled}
                        className="h-7 flex-1 rounded border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => onPickItem(i)}
                        disabled={disabled}
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 bg-white text-blue-600 hover:bg-gray-50 disabled:opacity-50"
                        title="Избери от каталога"
                      >
                        <List size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="border-r border-gray-100 px-1 py-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(i, { quantity: parseFloat(e.target.value) || 0 })
                        }
                        disabled={disabled}
                        className="h-7 w-[70px] rounded border border-gray-300 px-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                      <select
                        value={line.unit}
                        onChange={(e) => updateLine(i, { unit: e.target.value })}
                        disabled={disabled}
                        className="h-7 rounded border border-gray-300 bg-white px-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="border-r border-gray-100 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={displayPrice.toFixed(2)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0
                        const rate = Number(line.vat_rate) || 0
                        const newPriceNoVat = priceWithVat ? v / (1 + rate / 100) : v
                        updateLine(i, { price: parseFloat(newPriceNoVat.toFixed(4)) })
                      }}
                      disabled={disabled}
                      className="h-7 w-full rounded border border-gray-300 px-2 text-right text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </td>
                  <td className="px-2 py-1 text-right text-sm text-gray-800">
                    {lineTotal.toFixed(2)} EUR
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add line + subtotal row */}
      <div className="mt-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={addLine}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-blue-400 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          <Plus size={14} />
          Добави ред
        </button>
        <div className="text-sm text-gray-600">
          Сума (без отстъпка):{' '}
          <span className="font-semibold text-gray-900">{subtotalRaw.toFixed(2)} EUR</span>
        </div>
      </div>
    </div>
  )
}

function emptyLine(noVat: boolean): InvoiceLine {
  return {
    description: '',
    quantity: 1,
    unit: 'бр.',
    price: 0,
    vat_rate: noVat ? 0 : 20,
  }
}
