/**
 * DeliveryBolts — Lightning-bolt delivery status indicator for system-issued invoices.
 *
 * Same 4 states as DeliveryTicks but uses ⚡ instead of ✓:
 *   ⚡  (grey)  — no_subscriber / none: counterparty is not a MegaBanx client
 *   ⚡⚡ (grey)  — pending: client hasn't confirmed the invoice yet
 *   ⚡⚡ (blue)  — approved: client confirmed the invoice
 *   ⚡  (red)   — deleted_by_recipient: counterparty deleted the invoice
 */
import { Zap } from 'lucide-react'

interface DeliveryBoltsProps {
  status?: string
  crossCopiedFrom?: string
}

export default function DeliveryBolts({ status, crossCopiedFrom }: DeliveryBoltsProps) {
  if (crossCopiedFrom) {
    // Received from counterparty — double red bolts
    return (
      <span
        className="inline-flex items-center gap-px text-red-500"
        title={`Получена от ${crossCopiedFrom}`}
      >
        <Zap size={14} fill="currentColor" />
        <Zap size={14} fill="currentColor" className="-ml-1" />
      </span>
    )
  }

  if (status === 'deleted_by_recipient') {
    // Counterparty deleted — single red bolt
    return (
      <span
        className="inline-flex items-center text-red-500"
        title="Контрагентът изтри фактурата"
      >
        <Zap size={14} fill="currentColor" />
      </span>
    )
  }

  if (status === 'approved') {
    // Confirmed by counterparty — double blue bolts
    return (
      <span
        className="inline-flex items-center gap-px text-blue-500"
        title="Одобрена от контрагента"
      >
        <Zap size={14} fill="currentColor" />
        <Zap size={14} fill="currentColor" className="-ml-1" />
      </span>
    )
  }

  if (status === 'pending') {
    // Sent, waiting for confirmation — double grey bolts
    return (
      <span
        className="inline-flex items-center gap-px text-gray-400"
        title="Изпратена, чака одобрение"
      >
        <Zap size={14} fill="currentColor" />
        <Zap size={14} fill="currentColor" className="-ml-1" />
      </span>
    )
  }

  if (status === 'no_subscriber' || status === 'none') {
    // Counterparty not on MegaBanx — single grey bolt
    return (
      <span
        className="inline-flex items-center text-gray-400"
        title="Контрагентът не е клиент на MegaBanx"
      >
        <Zap size={14} fill="currentColor" />
      </span>
    )
  }

  return null
}
