import type { InvoiceLine, DiscountType } from '@/types/invoicing.types'
import { VAT_REASONS } from '@/types/invoicing.types'
import { computeTotals, EUR_TO_BGN } from './totals.utils'

interface TotalsSectionProps {
  lines: InvoiceLine[]
  discountValue: number
  discountType: DiscountType
  noVat: boolean
  noVatReason: string
  customNoVatReason: string
  composedBy: string
  vatRateDisplay: number
  onChange: (patch: {
    discount_value?: number
    discount_type?: DiscountType
    no_vat?: boolean
    no_vat_reason?: string
    custom_no_vat_reason?: string
    composed_by?: string
    vat_rate_display?: number
  }) => void
  disabled?: boolean
}

/** SEC 5 (discount + tax base + VAT) + SEC 6 (VAT settings) + SEC 7 (composer + grand total). */
export default function TotalsSection({
  lines,
  discountValue,
  discountType,
  noVat,
  noVatReason,
  customNoVatReason,
  composedBy,
  vatRateDisplay,
  onChange,
  disabled,
}: TotalsSectionProps) {
  const { taxBase, vatAmount, total } = computeTotals(lines, discountValue, discountType, noVat)
  const vatReasonIsCustom = noVatReason === 'other'

  return (
    <div className="flex flex-col gap-3">
      {/* Discount + tax base + VAT row */}
      <div className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Отстъпка</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.01"
              min="0"
              value={discountValue}
              onChange={(e) => onChange({ discount_value: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="h-8 flex-1 rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <select
              value={discountType}
              onChange={(e) => onChange({ discount_type: e.target.value as DiscountType })}
              disabled={disabled}
              className="h-8 rounded-md border border-gray-300 bg-white px-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="EUR">EUR</option>
              <option value="%">%</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Данъчна основа</label>
          <div className="h-8 rounded-md border border-transparent px-2 text-right text-sm font-medium">
            {taxBase.toFixed(2)} EUR
            <div className="text-[11px] font-normal text-gray-500">
              {(taxBase * EUR_TO_BGN).toFixed(2)} лв.
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">ДДС</label>
          <div className="flex items-center gap-1">
            <select
              value={String(vatRateDisplay)}
              onChange={(e) => onChange({ vat_rate_display: parseFloat(e.target.value) })}
              disabled={disabled || noVat}
              className="h-8 rounded-md border border-gray-300 bg-white px-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="0">0%</option>
              <option value="9">9%</option>
              <option value="20">20%</option>
            </select>
            <span className="text-sm">%</span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">ДДС сума</label>
          <div className="h-8 rounded-md border border-transparent px-2 text-right text-sm font-medium">
            {vatAmount.toFixed(2)} EUR
            <div className="text-[11px] font-normal text-gray-500">
              {(vatAmount * EUR_TO_BGN).toFixed(2)} лв.
            </div>
          </div>
        </div>
      </div>

      {/* SEC 6 — VAT settings */}
      <div className="flex flex-wrap items-center gap-4 border-y border-gray-200 py-2">
        <span className="text-sm font-semibold text-gray-700">ДДС настройки:</span>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={noVat}
            onChange={(e) => onChange({ no_vat: e.target.checked })}
            disabled={disabled}
            className="h-3.5 w-3.5 accent-blue-600"
          />
          Не начислявай ДДС по тази фактура
        </label>
      </div>

      {noVat && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">
            Основание за неначисляване на ДДС:
          </label>
          <select
            value={noVatReason}
            onChange={(e) => onChange({ no_vat_reason: e.target.value })}
            disabled={disabled}
            className="h-8 max-w-[500px] rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">— Изберете основание —</option>
            {VAT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {vatReasonIsCustom && (
            <input
              type="text"
              value={customNoVatReason}
              onChange={(e) => onChange({ custom_no_vat_reason: e.target.value })}
              disabled={disabled}
              placeholder="Въведете основание..."
              className="mt-1 h-8 max-w-[500px] rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
          )}
        </div>
      )}

      {/* SEC 7 — composer + grand total */}
      <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Съставил:</label>
          <input
            type="text"
            value={composedBy}
            onChange={(e) => onChange({ composed_by: e.target.value })}
            disabled={disabled}
            className="h-8 w-[220px] rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-gray-500">Сума за плащане</div>
          <div className="text-xl font-bold text-gray-900">{total.toFixed(2)} EUR</div>
          <div className="text-sm text-gray-500">{(total * EUR_TO_BGN).toFixed(2)} лв.</div>
        </div>
      </div>
    </div>
  )
}
