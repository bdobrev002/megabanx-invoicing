/**
 * DeliveryTicks — Viber-style delivery status indicator for cross-copied invoices.
 *
 * States:
 *   ✓  (grey)  — no_subscriber / none: counterparty is not a MegaBanx client
 *   ✓✓ (grey)  — pending: client hasn't confirmed the invoice yet
 *   ✓✓ (blue)  — approved: client confirmed the invoice
 *   ✓  (red)   — deleted_by_recipient: counterparty deleted the invoice
 */

interface DeliveryTicksProps {
  status?: string
  crossCopiedFrom?: string
}

export default function DeliveryTicks({ status, crossCopiedFrom }: DeliveryTicksProps) {
  if (crossCopiedFrom) {
    // Received from counterparty — double red ticks
    return (
      <span
        className="inline-flex items-center text-red-500 text-xs font-bold"
        style={{ letterSpacing: '-3px' }}
        title={`Получена от ${crossCopiedFrom}`}
      >
        ✓✓
      </span>
    )
  }

  if (status === 'deleted_by_recipient') {
    // Counterparty deleted — single red tick
    return (
      <span
        className="inline-flex items-center text-red-500 text-xs font-bold"
        title="Контрагентът изтри фактурата"
      >
        ✓
      </span>
    )
  }

  if (status === 'approved') {
    // Confirmed by counterparty — double blue ticks
    return (
      <span
        className="inline-flex items-center text-blue-500 text-xs font-bold"
        style={{ letterSpacing: '-3px' }}
        title="Одобрена от контрагента"
      >
        ✓✓
      </span>
    )
  }

  if (status === 'pending') {
    // Sent, waiting for confirmation — double grey ticks
    return (
      <span
        className="inline-flex items-center text-gray-400 text-xs font-bold"
        style={{ letterSpacing: '-3px' }}
        title="Изпратена, чака одобрение"
      >
        ✓✓
      </span>
    )
  }

  if (status === 'no_subscriber' || status === 'none') {
    // Counterparty not on MegaBanx — single grey tick
    return (
      <span
        className="inline-flex items-center text-gray-400 text-xs font-bold"
        title="Контрагентът не е клиент на MegaBanx"
      >
        ✓
      </span>
    )
  }

  return null
}
