import type { DiscountType, InvoiceLine } from '@/types/invoicing.types'

export const EUR_TO_BGN = 1.95583

/** Compute derived totals: subtotal, tax base, VAT amount, grand total — all in EUR. */
export function computeTotals(
  lines: InvoiceLine[],
  discountValue: number,
  discountType: DiscountType,
  noVat: boolean,
) {
  const subtotal = lines.reduce(
    (acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.price) || 0),
    0,
  )
  const discountAmt = discountType === '%' ? subtotal * (discountValue / 100) : discountValue
  const taxBase = subtotal - discountAmt
  let vatAmount = 0
  if (!noVat && taxBase > 0) {
    for (const l of lines) {
      const lineTotal = (Number(l.quantity) || 0) * (Number(l.price) || 0)
      if (lineTotal <= 0 || subtotal <= 0) continue
      const shareRatio = lineTotal / subtotal
      const lineTaxBase = taxBase * shareRatio
      vatAmount += lineTaxBase * ((Number(l.vat_rate) || 0) / 100)
    }
  }
  const total = taxBase + vatAmount
  return { subtotal, discountAmt, taxBase, vatAmount, total }
}
