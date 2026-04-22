import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import { invoicingApi } from '@/api/invoicing.api'
import { formatDate } from '@/utils/formatters'
import type { InvoiceEmailLog } from '@/types/invoicing.types'

interface EmailLogDrawerProps {
  open: boolean
  onClose: () => void
  invoiceId: string | null
}

function statusVariant(status: InvoiceEmailLog['delivery_status']): 'success' | 'warning' | 'danger' {
  if (status === 'sent') return 'success'
  if (status === 'failed') return 'danger'
  return 'warning'
}

function statusLabel(status: InvoiceEmailLog['delivery_status']): string {
  if (status === 'sent') return 'Изпратен'
  if (status === 'failed') return 'Неуспешен'
  return 'В опашка'
}

export default function EmailLogDrawer({ open, onClose, invoiceId }: EmailLogDrawerProps) {
  const [log, setLog] = useState<InvoiceEmailLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !invoiceId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const list = await invoicingApi.listInvoiceEmailLog(invoiceId)
        if (!cancelled) setLog(list)
      } catch {
        if (!cancelled) setLog([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, invoiceId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Дневник на изпратени имейли</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner />
            </div>
          ) : log.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              Все още няма изпратени имейли за тази фактура.
            </p>
          ) : (
            <ul className="space-y-3">
              {log.map((row) => (
                <li key={row.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{row.to_email}</span>
                    <Badge variant={statusVariant(row.delivery_status)}>
                      {statusLabel(row.delivery_status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{row.subject}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                    <div>
                      <span className="text-gray-400">Изпратен: </span>
                      {row.sent_at ? formatDate(row.sent_at) : '—'}
                    </div>
                    <div>
                      <span className="text-gray-400">Отворен: </span>
                      {row.opened_at ? `${formatDate(row.opened_at)} (${row.open_count}×)` : '—'}
                    </div>
                    {row.cc_emails && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Cc: </span>
                        {row.cc_emails}
                      </div>
                    )}
                    {row.attached_pdf && (
                      <div className="col-span-2 text-gray-500">📎 С прикачен PDF</div>
                    )}
                    {row.delivery_error && (
                      <div className="col-span-2 text-red-600">{row.delivery_error}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
