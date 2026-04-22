import { useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  Users,
  Package,
  RefreshCw,
  Settings,
  FileText,
  Check,
  CheckCheck,
  Mail,
  Clock,
  X,
} from 'lucide-react'
import { filesApi } from '@/api/files.api'
import { invoicingApi } from '@/api/invoicing.api'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'
import type { InvoiceRecord } from '@/types/file.types'
import type { IncomingCrossCopy } from '@/types/invoicing.types'

interface SubFolder {
  name: string
  file_count: number
}

export interface FolderData {
  name: string
  company_id: string | null
  eik: string
  subfolders: SubFolder[]
}

interface Props {
  folder: FolderData
  fileSearch: string
  timeframe: string
  dateFrom: string
  dateTo: string
  sortBy: 'name' | 'date'
}

const SUBTYPE_LABEL: Record<string, string> = {
  purchases: 'Фактури покупки',
  sales: 'Фактури продажби',
  pending: 'Чакащи одобрение',
}

// purchases/sales hit /invoices?invoice_type=... against the scan-upload table.
// pending is sourced from inv_invoice_meta via the invoicing /incoming endpoint
// (cross_copy_status='pending') and has its own branch in loadSection.
const SUBTYPE_API: Record<string, string> = {
  purchases: 'purchase',
  sales: 'sale',
}

const SUBTYPE_ORDER = ['purchases', 'sales', 'pending']

function countOf(folder: FolderData, name: string): number {
  return folder.subfolders.find((sf) => sf.name === name)?.file_count ?? 0
}

function withinTimeframe(
  dateStr: string,
  tf: string,
  from: string,
  to: string,
): boolean {
  if (!tf && !from && !to) return true
  if (!dateStr) return !tf && !from && !to
  const d = new Date(dateStr)
  // With an active filter, records without a usable date are hidden (same as
  // the empty-string branch above) rather than silently bypassing the filter.
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  if (tf === 'today') return d.toDateString() === now.toDateString()
  if (tf === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - 7)
    return d >= start
  }
  if (tf === 'month') {
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    )
  }
  if (tf === 'year') return d.getFullYear() === now.getFullYear()
  if (from && d < new Date(from)) return false
  if (to) {
    const toD = new Date(to)
    toD.setHours(23, 59, 59, 999)
    if (d > toD) return false
  }
  return true
}

/** v1-parity invoice row icon column. */
function SyncBadge({ inv }: { inv: InvoiceRecord }) {
  const status = inv.cross_copy_status
  if (status === 'approved') {
    return (
      <span title="Синхронизирана" className="text-emerald-600">
        <CheckCheck size={14} />
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span title="Чакаща синхронизация" className="text-amber-500">
        <Check size={14} />
      </span>
    )
  }
  return <span className="inline-block w-[14px]" />
}

export default function CompanyFolder({
  folder,
  fileSearch,
  timeframe,
  dateFrom,
  dateTo,
  sortBy,
}: Props) {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const [expanded, setExpanded] = useState(false)
  const [invoices, setInvoices] = useState<Record<string, InvoiceRecord[]>>({})
  const [loading, setLoading] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>(null)

  const purchases = countOf(folder, 'purchases')
  const sales = countOf(folder, 'sales')
  const pending = countOf(folder, 'pending')

  const [pendingRows, setPendingRows] = useState<IncomingCrossCopy[] | null>(
    null,
  )

  const loadSection = useCallback(
    async (sub: string, force = false) => {
      if (!folder.company_id) return
      if (sub === 'pending') {
        if (!force && pendingRows) return
        setLoading(true)
        try {
          const list = await invoicingApi.getIncomingCrossCopies(
            profileId,
            folder.company_id,
          )
          setPendingRows(list)
        } catch {
          setPendingRows([])
        } finally {
          setLoading(false)
        }
        return
      }
      if (!force && invoices[sub]) return
      setLoading(true)
      try {
        const apiType = SUBTYPE_API[sub]
        const list = await filesApi.list(profileId, folder.company_id, apiType)
        setInvoices((prev) => ({ ...prev, [sub]: list }))
      } catch {
        setInvoices((prev) => ({ ...prev, [sub]: [] }))
      } finally {
        setLoading(false)
      }
    },
    [folder.company_id, invoices, pendingRows, profileId],
  )

  const actOnPending = async (
    invoiceId: string,
    action: 'approve' | 'reject',
  ) => {
    try {
      if (action === 'approve') {
        await invoicingApi.approveIncomingCrossCopy(invoiceId)
      } else {
        await invoicingApi.rejectIncomingCrossCopy(invoiceId)
      }
      // Drop the row locally; the WS refresh will re-fetch counts shortly.
      setPendingRows((prev) =>
        (prev ?? []).filter((row) => row.meta.invoice_id !== invoiceId),
      )
    } catch {
      // Swallow — WS refresh or a manual reopen will resync the list.
    }
  }

  // When file counts change (e.g. after a WebSocket refresh), invalidate the
  // cached invoice lists so the header counts and expanded rows stay in sync.
  // If a section is currently open, immediately refetch it so the user never
  // sees a blank rows area while the new data is fetched.
  const countsKey = `${purchases}|${sales}|${pending}`
  const prevCountsKey = useRef(countsKey)
  const loadSectionRef = useRef(loadSection)
  useEffect(() => {
    loadSectionRef.current = loadSection
  }, [loadSection])
  useEffect(() => {
    if (prevCountsKey.current !== countsKey) {
      prevCountsKey.current = countsKey
      setInvoices({})
      setPendingRows(null)
      if (openSection) {
        void loadSectionRef.current(openSection, true)
      }
    }
  }, [countsKey, openSection])

  const toggleExpanded = () => {
    const next = !expanded
    setExpanded(next)
    // When opening for the first time, auto-select the first non-empty section.
    if (next && !openSection) {
      const first = SUBTYPE_ORDER.find((s) => countOf(folder, s) > 0)
      if (first) {
        setOpenSection(first)
        loadSection(first)
      }
    }
  }

  const toggleSection = (sub: string) => {
    if (openSection === sub) {
      setOpenSection(null)
      return
    }
    setOpenSection(sub)
    loadSection(sub)
  }

  const filterAndSort = (rows: InvoiceRecord[]): InvoiceRecord[] => {
    const q = fileSearch.trim().toLowerCase()
    const out = rows.filter((inv) => {
      if (q) {
        const hay = [
          inv.original_filename,
          inv.new_filename,
          inv.invoice_number,
          inv.issuer_name,
          inv.recipient_name,
        ]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (!withinTimeframe(inv.date, timeframe, dateFrom, dateTo)) return false
      return true
    })
    if (sortBy === 'date') {
      out.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    } else {
      out.sort((a, b) =>
        (a.new_filename || a.original_filename || '').localeCompare(
          b.new_filename || b.original_filename || '',
        ),
      )
    }
    return out
  }

  const actionBtn =
    'inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-white shadow-sm transition'

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={toggleExpanded}
          className="flex flex-1 min-w-[220px] items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
          {expanded ? (
            <FolderOpen size={18} className="text-amber-500" />
          ) : (
            <Folder size={18} className="text-amber-500" />
          )}
          <span className="font-semibold text-gray-900">{folder.name}</span>
          <span className="text-xs text-gray-500">
            {purchases} покупки, {sales} продажби
            {pending > 0 && `, ${pending} чакащи одобрение`}
          </span>
        </button>

        {folder.company_id && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              to={`${ROUTES.INVOICING}?company_id=${folder.company_id}&new=1`}
              className={`${actionBtn} bg-emerald-600 hover:bg-emerald-700`}
              title="Нова фактура"
            >
              <Plus size={12} />
              Нова фактура
            </Link>
            <Link
              to={`${ROUTES.COMPANIES}/${folder.company_id}?tab=clients`}
              className={`${actionBtn} bg-blue-600 hover:bg-blue-700`}
              title="Клиенти"
            >
              <Users size={12} />
              Клиенти
            </Link>
            <Link
              to={`${ROUTES.COMPANIES}/${folder.company_id}?tab=items`}
              className={`${actionBtn} bg-purple-600 hover:bg-purple-700`}
              title="Артикули"
            >
              <Package size={12} />
              Артикули
            </Link>
            <Link
              to={`${ROUTES.COMPANIES}/${folder.company_id}?tab=sync`}
              className={`${actionBtn} bg-orange-500 hover:bg-orange-600`}
              title="Синхронизирай"
            >
              <RefreshCw size={12} />
              Синхронизирай
            </Link>
            <Link
              to={`${ROUTES.COMPANIES}/${folder.company_id}?tab=settings`}
              className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
              title="Настройки"
            >
              <Settings size={12} />
              Настройки
            </Link>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-2 pb-2">
          {SUBTYPE_ORDER.map((sub) => {
            const count = countOf(folder, sub)
            if (count === 0) return null
            const isOpen = openSection === sub
            const isPending = sub === 'pending'
            const rows = isPending ? [] : filterAndSort(invoices[sub] ?? [])
            const pendingLoaded = pendingRows !== null
            return (
              <div key={sub} className="mt-2 rounded border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => toggleSection(sub)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2 font-medium text-gray-800">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {isPending && <Clock size={14} className="text-amber-500" />}
                    {SUBTYPE_LABEL[sub]} ({count})
                  </span>
                  <span className="text-xs text-gray-500">
                    {isPending ? 'Очаква одобрение' : 'Дата · Статус'}
                  </span>
                </button>
                {isOpen && !isPending && (
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {loading && !invoices[sub] && (
                      <p className="px-3 py-3 text-xs text-gray-500">Зареждане…</p>
                    )}
                    {invoices[sub] && rows.length === 0 && (
                      <p className="px-3 py-3 text-xs text-gray-500">
                        Няма резултати за приложените филтри.
                      </p>
                    )}
                    {rows.map((inv) => (
                      <InvoiceRow key={inv.id} inv={inv} />
                    ))}
                  </div>
                )}
                {isOpen && isPending && (
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {loading && !pendingLoaded && (
                      <p className="px-3 py-3 text-xs text-gray-500">Зареждане…</p>
                    )}
                    {pendingLoaded && (pendingRows ?? []).length === 0 && (
                      <p className="px-3 py-3 text-xs text-gray-500">
                        Няма фактури, очакващи одобрение.
                      </p>
                    )}
                    {(pendingRows ?? []).map((row) => (
                      <PendingRow
                        key={row.meta.invoice_id}
                        row={row}
                        onApprove={() => actOnPending(row.meta.invoice_id, 'approve')}
                        onReject={() => actOnPending(row.meta.invoice_id, 'reject')}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {purchases + sales + pending === 0 && (
            <p className="py-3 pl-8 text-xs text-gray-500">
              Все още няма качени фактури за тази фирма.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function PendingRow({
  row,
  onApprove,
  onReject,
}: {
  row: IncomingCrossCopy
  onApprove: () => void
  onReject: () => void
}) {
  const number = row.meta.invoice_number != null ? `№ ${row.meta.invoice_number}` : '—'
  const issuer = row.issuer.name || 'Непознат издател'
  const date = row.meta.issue_date || row.meta.created_at?.slice(0, 10) || '—'
  const total = Number(row.meta.total ?? 0).toFixed(2)
  const currency = row.meta.currency || 'EUR'
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs">
      <FileText size={14} className="text-amber-500" />
      <span className="flex-1 min-w-[180px] truncate text-gray-800">
        {number} · <span className="text-gray-500">{issuer}</span>
      </span>
      <span className="w-24 shrink-0 text-right text-gray-500">{date}</span>
      <span className="w-28 shrink-0 text-right font-medium text-gray-800">
        {total} {currency}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onApprove}
          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white shadow-sm transition hover:bg-emerald-700"
          title="Одобри и премести в покупки"
        >
          <Check size={12} />
          Одобри
        </button>
        <button
          type="button"
          onClick={onReject}
          className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          title="Отхвърли"
        >
          <X size={12} />
          Отхвърли
        </button>
      </div>
    </div>
  )
}

function InvoiceRow({ inv }: { inv: InvoiceRecord }) {
  const name = inv.new_filename || inv.original_filename || inv.invoice_number || '—'
  const isCredit = inv.is_credit_note
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
      <FileText
        size={14}
        className={isCredit ? 'text-red-500' : 'text-gray-400'}
      />
      <span className={`flex-1 truncate ${isCredit ? 'text-red-600' : 'text-gray-800'}`}>
        {name}
      </span>
      <span className="w-28 shrink-0 text-right text-gray-500">
        {inv.date || '—'}
      </span>
      <span className="w-20 shrink-0 text-right">
        <span className="inline-flex items-center gap-1 text-gray-500">
          <SyncBadge inv={inv} />
          {inv.cross_copied_from && (
            <span title={`Изпратена от ${inv.cross_copied_from}`} className="text-blue-500">
              <Mail size={12} />
            </span>
          )}
        </span>
      </span>
    </div>
  )
}
