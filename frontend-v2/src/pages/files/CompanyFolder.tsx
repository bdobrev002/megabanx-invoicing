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
  Download,
  Trash2,
} from 'lucide-react'
import { filesApi } from '@/api/files.api'
import { invoicingApi } from '@/api/invoicing.api'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
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
  proforma_count?: number
  subfolders: SubFolder[]
}

interface Props {
  folder: FolderData
  fileSearch: string
  timeframe: string
  dateFrom: string
  dateTo: string
  sortBy: 'name' | 'date'
  profileId?: string
  /** Lifted selection state so the page-level toolbar can batch-delete/download. */
  selectedIds: Set<string>
  onToggleSelected: (id: string) => void
  /** Bumped by parent after a batch delete / refresh so we reload rows. */
  refreshKey?: number
}

const SUBTYPE_LABEL: Record<string, string> = {
  purchases: 'Фактури покупки',
  sales: 'Фактури продажби',
}

const SUBTYPE_API: Record<string, string> = {
  purchases: 'purchase',
  sales: 'sale',
}

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
  profileId: profileIdProp,
  selectedIds,
  onToggleSelected,
  refreshKey = 0,
}: Props) {
  const ownProfileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const profileId = profileIdProp ?? ownProfileId
  const setError = useUiStore((s) => s.setError)
  const [expanded, setExpanded] = useState(false)
  const [invoices, setInvoices] = useState<Record<string, InvoiceRecord[]>>({})
  const [loading, setLoading] = useState(false)
  const [pendingOpen, setPendingOpen] = useState(false)

  const purchases = countOf(folder, 'purchases')
  const sales = countOf(folder, 'sales')
  const pending = countOf(folder, 'pending')

  const [pendingRows, setPendingRows] = useState<IncomingCrossCopy[] | null>(
    null,
  )

  const loadPurchasesAndSales = useCallback(
    async (force = false) => {
      if (!folder.company_id) return
      setLoading(true)
      try {
        const needs = (['purchases', 'sales'] as const).filter(
          (s) => force || !invoices[s],
        )
        const results = await Promise.all(
          needs.map((s) =>
            filesApi.list(profileId, folder.company_id!, SUBTYPE_API[s]),
          ),
        )
        setInvoices((prev) => {
          const next = { ...prev }
          needs.forEach((s, i) => {
            next[s] = results[i]
          })
          return next
        })
      } catch {
        // Keep previously loaded rows if refresh fails.
      } finally {
        setLoading(false)
      }
    },
    [folder.company_id, invoices, profileId],
  )

  const loadPending = useCallback(
    async (force = false) => {
      if (!folder.company_id) return
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
    },
    [folder.company_id, pendingRows, profileId],
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
      setPendingRows((prev) =>
        (prev ?? []).filter((row) => row.meta.invoice_id !== invoiceId),
      )
    } catch {
      /* WS refresh will resync */
    }
  }

  // Re-fetch on external changes (file counts or forced refresh from parent).
  const countsKey = `${purchases}|${sales}|${pending}|${refreshKey}`
  const prevCountsKey = useRef(countsKey)
  const loadPandSRef = useRef(loadPurchasesAndSales)
  const loadPendingRef = useRef(loadPending)
  useEffect(() => {
    loadPandSRef.current = loadPurchasesAndSales
  }, [loadPurchasesAndSales])
  useEffect(() => {
    loadPendingRef.current = loadPending
  }, [loadPending])
  useEffect(() => {
    if (prevCountsKey.current !== countsKey) {
      prevCountsKey.current = countsKey
      setInvoices({})
      setPendingRows(null)
      if (expanded) {
        void loadPandSRef.current(true)
        if (pendingOpen) void loadPendingRef.current(true)
      }
    }
  }, [countsKey, expanded, pendingOpen])

  const toggleExpanded = () => {
    const next = !expanded
    setExpanded(next)
    if (next) {
      void loadPurchasesAndSales()
    }
  }

  const togglePending = () => {
    const next = !pendingOpen
    setPendingOpen(next)
    if (next) void loadPending()
  }

  const handleDeleteOne = async (inv: InvoiceRecord) => {
    if (!window.confirm(`Изтриване на "${inv.new_filename || inv.original_filename}"?`)) return
    try {
      await filesApi.remove(profileId, inv.id)
      // Remove from local state; the WS refresh will also reload counts.
      setInvoices((prev) => {
        const next = { ...prev }
        for (const k of Object.keys(next)) {
          next[k] = (next[k] ?? []).filter((r) => r.id !== inv.id)
        }
        return next
      })
      if (selectedIds.has(inv.id)) onToggleSelected(inv.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при изтриване')
    }
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

  // Rendered when a company is expanded: both Фактури покупки AND Фактури продажби
  // are shown simultaneously (v1 parity — no inner accordion).
  const renderSection = (sub: 'purchases' | 'sales') => {
    const rows = filterAndSort(invoices[sub] ?? [])
    const count = countOf(folder, sub)
    return (
      <div key={sub} className="mt-3">
        <h4 className="mb-2 flex items-center gap-4 text-xs font-semibold uppercase text-gray-500">
          {SUBTYPE_LABEL[sub]} ({count})
          <span className="ml-auto flex items-center gap-3 text-[11px] normal-case text-gray-400">
            <span>Дата</span>
            <span>Статус</span>
          </span>
        </h4>
        {loading && !invoices[sub] ? (
          <p className="pl-4 text-xs text-gray-500">Зареждане…</p>
        ) : rows.length === 0 ? (
          <p className="pl-4 text-xs text-gray-400">Няма файлове</p>
        ) : (
          <div className="space-y-1">
            {rows.map((inv) => (
              <InvoiceRow
                key={inv.id}
                inv={inv}
                profileId={profileId}
                selected={selectedIds.has(inv.id)}
                onToggleSelected={() => onToggleSelected(inv.id)}
                onDelete={() => handleDeleteOne(inv)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

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
            {(folder.proforma_count ?? 0) > 0 && `, ${folder.proforma_count} проформи`}
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
              className={`${actionBtn} bg-amber-400 text-gray-900 hover:bg-amber-500`}
              title="Синхронизирай"
            >
              <RefreshCw size={12} />
              Синхронизирай
            </Link>
            <Link
              to={`${ROUTES.COMPANIES}/${folder.company_id}?tab=settings`}
              className={`${actionBtn} bg-gray-500 hover:bg-gray-600`}
              title="Настройки"
            >
              <Settings size={12} />
              Настройки
            </Link>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 pb-3 pt-1">
          {renderSection('purchases')}
          {renderSection('sales')}

          {pending > 0 && (
            <div className="mt-3 rounded border border-amber-200 bg-amber-50/40">
              <button
                type="button"
                onClick={togglePending}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-amber-50"
              >
                <span className="flex items-center gap-2 font-medium text-amber-800">
                  {pendingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Clock size={14} />
                  Чакащи одобрение ({pending})
                </span>
                <span className="text-xs text-amber-700">Очаква одобрение</span>
              </button>
              {pendingOpen && (
                <div className="divide-y divide-amber-100 border-t border-amber-100 bg-white">
                  {loading && !pendingRows && (
                    <p className="px-3 py-3 text-xs text-gray-500">Зареждане…</p>
                  )}
                  {pendingRows && pendingRows.length === 0 && (
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
          )}

          {purchases + sales + pending === 0 && (
            <p className="py-3 pl-4 text-xs text-gray-500">
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

function InvoiceRow({
  inv,
  profileId,
  selected,
  onToggleSelected,
  onDelete,
}: {
  inv: InvoiceRecord
  profileId: string
  selected: boolean
  onToggleSelected: () => void
  onDelete: () => void
}) {
  const name = inv.new_filename || inv.original_filename || inv.invoice_number || '—'
  const isCredit = inv.is_credit_note
  const rowBase = 'group flex items-center gap-2 rounded px-2 py-1.5 text-xs cursor-default'
  const rowState = selected ? 'bg-indigo-100' : 'hover:bg-gray-100'
  const openPreview = () => {
    window.open(filesApi.previewUrl(profileId, inv.id), '_blank', 'noopener,noreferrer')
  }
  return (
    <div
      className={`${rowBase} ${rowState}`}
      onDoubleClick={openPreview}
      title="Двоен клик за преглед"
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelected}
        onClick={(e) => e.stopPropagation()}
        className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-indigo-600"
        aria-label="Избери фактура"
      />
      <FileText
        size={14}
        className={isCredit ? 'text-red-500' : 'text-gray-400'}
      />
      <span className={`flex-1 truncate ${isCredit ? 'text-red-600 font-medium' : 'text-gray-800'}`}>
        {name}
      </span>
      <span className="w-28 shrink-0 text-right text-gray-500">
        {inv.date || '—'}
      </span>
      <span className="w-16 shrink-0 text-right">
        <span className="inline-flex items-center gap-1 text-gray-500">
          <SyncBadge inv={inv} />
          {inv.cross_copied_from ? (
            <span title={`Изпратена от ${inv.cross_copied_from}`} className="text-blue-500">
              <Mail size={12} />
            </span>
          ) : (
            <span className="inline-block w-3" />
          )}
        </span>
      </span>
      <a
        href={filesApi.downloadUrl(profileId, inv.id)}
        onClick={(e) => e.stopPropagation()}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600"
        title="Свали"
        download
      >
        <Download size={14} />
      </a>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
        title="Изтрий"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
