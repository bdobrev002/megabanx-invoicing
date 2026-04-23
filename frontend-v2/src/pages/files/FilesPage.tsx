import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Spinner from '@/components/ui/Spinner'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Search, FolderOpen, Building2, Clock, ArrowUp, Download, Trash2 } from 'lucide-react'
import { filesApi } from '@/api/files.api'
import { sharingApi } from '@/api/sharing.api'
import { useAuthStore } from '@/stores/authStore'
import { useCompanyStore } from '@/stores/companyStore'
import { useUiStore } from '@/stores/uiStore'
import { useWsRefresh } from '@/hooks/useWsRefresh'
import CompanyFolder, { type FolderData } from './CompanyFolder'

const TIMEFRAMES = [
  { value: '', label: 'Времева рамка...' },
  { value: 'today', label: 'Днес' },
  { value: 'week', label: 'Тази седмица' },
  { value: 'month', label: 'Този месец' },
  { value: 'year', label: 'Тази година' },
]

/**
 * v1-parity "Структура на файловете" page: toolbar with file search,
 * company filter, timeframe/date-range, and sort toggles, followed by a
 * flat list of company folders (each expandable into purchase / sales /
 * proforma sections).
 */
export default function FilesPage() {
  const ownProfileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const { sharedCompanies, setSharedCompanies } = useCompanyStore()
  const setError = useUiStore((s) => s.setError)

  const [selectedOwnerProfileId, setSelectedOwnerProfileId] = useState<string | null>(null)
  const activeProfileId = selectedOwnerProfileId ?? ownProfileId
  const [folders, setFolders] = useState<FolderData[]>([])
  const [loading, setLoading] = useState(true)
  const [fileSearch, setFileSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name')
  // Lifted selection state — the toolbar in the "Структура на файловете" header
  // (N избрани · Свали · Изтрий · Отмени) acts on files picked across any
  // number of expanded companies.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0)
  const [bulkBusy, setBulkBusy] = useState(false)
  // v1-style anchor: tracks the last-clicked row id so Shift+click and
  // Shift+Arrow can extend from it.
  const lastClickedIdRef = useRef<string | null>(null)

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    lastClickedIdRef.current = null
  }, [])

  /**
   * Read the currently-visible invoice IDs in DOM order across every expanded
   * company. Each InvoiceRow renders `data-file-id={inv.id}`; this matches v1's
   * approach of iterating `[data-file-key]` nodes for range / arrow selection.
   * Scoped to the list container ref so we satisfy the "no document.* queries"
   * lint rule (RULES.md §1.2).
   */
  const listContainerRef = useRef<HTMLDivElement>(null)
  const getVisibleIds = useCallback((): string[] => {
    const container = listContainerRef.current
    if (!container) return []
    return Array.from(
      container.querySelectorAll<HTMLElement>('[data-file-id]'),
    ).map((el) => el.getAttribute('data-file-id') ?? '')
  }, [])

  const handleRowClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Toggle this id in the selection (Ctrl/Cmd+click — Windows/Mac style).
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
        lastClickedIdRef.current = id
        return
      }
      if (e.shiftKey && lastClickedIdRef.current) {
        // Range-add from the last-clicked row (across all expanded companies).
        const all = getVisibleIds()
        const lastIdx = all.indexOf(lastClickedIdRef.current)
        const curIdx = all.indexOf(id)
        if (lastIdx >= 0 && curIdx >= 0) {
          const [lo, hi] = [
            Math.min(lastIdx, curIdx),
            Math.max(lastIdx, curIdx),
          ]
          setSelectedIds((prev) => {
            const next = new Set(prev)
            for (let i = lo; i <= hi; i += 1) next.add(all[i])
            return next
          })
          return
        }
      }
      // Plain click — replace selection with this single id.
      setSelectedIds(new Set([id]))
      lastClickedIdRef.current = id
    },
    [getVisibleIds],
  )

  // Hidden anchor used to trigger ZIP download (eslint forbids document.createElement).
  const downloadAnchorRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (sharedCompanies.length > 0) return
    sharingApi
      .getSharedWithMe()
      .then(setSharedCompanies)
      .catch(() => {
        /* ok — user may have no shares */
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchFolders = useCallback(async () => {
    if (!activeProfileId) return
    try {
      const data = await filesApi.getFolderStructure(activeProfileId)
      setFolders(data.folders ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при зареждане')
    } finally {
      setLoading(false)
    }
  }, [activeProfileId, setError])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await fetchFolders()
      if (cancelled) return
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fetchFolders])

  useWsRefresh(fetchFolders)

  const handleBulkDownload = useCallback(async () => {
    if (selectedIds.size === 0 || bulkBusy) return
    setBulkBusy(true)
    try {
      const ids = Array.from(selectedIds)
      const blob = await filesApi.batchDownload(activeProfileId, ids)
      const url = URL.createObjectURL(blob)
      const now = new Date()
      const pad = (n: number) => n.toString().padStart(2, '0')
      const filename = `megabanx-invoices-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.zip`
      const anchor = downloadAnchorRef.current
      if (anchor) {
        anchor.href = url
        anchor.download = filename
        anchor.click()
      }
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при сваляне')
    } finally {
      setBulkBusy(false)
    }
  }, [activeProfileId, bulkBusy, selectedIds, setError])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0 || bulkBusy) return
    if (!window.confirm(`Изтриване на ${selectedIds.size} файла?`)) return
    setBulkBusy(true)
    try {
      const ids = Array.from(selectedIds)
      const res = await filesApi.batchDelete(activeProfileId, ids)
      setSelectedIds(new Set())
      setRefreshKey((k) => k + 1)
      await fetchFolders()
      if (res.failed && res.failed.length > 0) {
        setError(`${res.deleted.length} изтрити, ${res.failed.length} неуспешни.`)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при изтриване')
    } finally {
      setBulkBusy(false)
    }
  }, [activeProfileId, bulkBusy, fetchFolders, selectedIds, setError])

  /**
   * Windows-style keyboard selection:
   *   - Shift + ArrowUp / ArrowDown  \u2014 extend / shrink selection one row
   *   - Ctrl/Cmd + A                 \u2014 select all currently-visible rows
   *   - Escape                       \u2014 clear selection
   * Ignored when typing inside an <input> / <textarea>.
   */
  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      (t instanceof HTMLElement && t.isContentEditable)

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return

      // Ctrl/Cmd + A \u2014 select all visible
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'a') {
        const all = getVisibleIds()
        if (all.length === 0) return
        e.preventDefault()
        setSelectedIds(new Set(all))
        lastClickedIdRef.current = all[all.length - 1]
        return
      }

      // Escape \u2014 clear
      if (e.key === 'Escape') {
        if (selectedIds.size === 0) return
        e.preventDefault()
        clearSelection()
        return
      }

      // Shift + ArrowUp / ArrowDown \u2014 extend
      if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        const all = getVisibleIds()
        if (all.length === 0) return
        e.preventDefault()
        const anchor = lastClickedIdRef.current
        if (!anchor) {
          const first = e.key === 'ArrowDown' ? all[0] : all[all.length - 1]
          setSelectedIds(new Set([first]))
          lastClickedIdRef.current = first
          return
        }
        const idx = all.indexOf(anchor)
        if (idx < 0) return
        const nextIdx =
          e.key === 'ArrowDown'
            ? Math.min(idx + 1, all.length - 1)
            : Math.max(idx - 1, 0)
        if (nextIdx === idx) return
        const nextId = all[nextIdx]
        setSelectedIds((prev) => {
          const next = new Set(prev)
          // If the next row is already selected we're shrinking the range:
          // drop the current anchor.
          if (next.has(nextId)) next.delete(anchor)
          else next.add(nextId)
          return next
        })
        lastClickedIdRef.current = nextId
        // Scroll the newly-anchored row into view (v1 parity).
        setTimeout(() => {
          const container = listContainerRef.current
          if (!container) return
          const el = container.querySelector<HTMLElement>(
            `[data-file-id="${CSS.escape(nextId)}"]`,
          )
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }, 0)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearSelection, getVisibleIds, selectedIds])

  const filtered = useMemo(() => {
    const cfl = companyFilter.trim().toLowerCase()
    const out = folders.filter((f) =>
      cfl ? f.name.toLowerCase().includes(cfl) : true,
    )
    out.sort((a, b) => a.name.localeCompare(b.name, 'bg'))
    return out
  }, [folders, companyFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  const sortBtn = (key: 'name' | 'date', label: string, Icon?: typeof Clock) => (
    <button
      type="button"
      onClick={() => setSortBy(key)}
      className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium transition ${
        sortBy === key
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {Icon && <Icon size={12} />}
      {label}
      {sortBy === key && <ArrowUp size={11} />}
    </button>
  )

  return (
    <div className="space-y-4">
      {sharedCompanies.length > 0 && (
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Профил
          </label>
          <Select
            value={activeProfileId}
            onChange={(e) => {
              const v = e.target.value
              setSelectedOwnerProfileId(v === ownProfileId ? null : v)
              setLoading(true)
              clearSelection()
            }}
            options={[
              { value: ownProfileId, label: 'Моите файлове' },
              ...Array.from(
                new Map(
                  sharedCompanies.map((sc) => [
                    sc.owner_profile_id,
                    {
                      value: sc.owner_profile_id,
                      label: `Споделени от ${sc.owner_name || sc.owner_email || 'друг потребител'}`,
                    },
                  ]),
                ).values(),
              ),
            ]}
          />
        </div>
      )}

      {/* v1-parity card: title + inline toolbar in one container. Widths are
          fixed so the row doesn't wrap at typical desktop sizes; sort buttons
          sit flush-right via ml-auto. */}
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Структура на файловете</h2>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {selectedIds.size} избрани
              </span>
              <button
                type="button"
                onClick={handleBulkDownload}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                title="Свали като ZIP"
              >
                <Download size={12} />
                Свали
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                title="Изтрий избраните"
              >
                <Trash2 size={12} />
                Изтрий
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={bulkBusy}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Отмени
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-48">
            <Search size={14} className="absolute left-2.5 top-1.5 text-gray-400" />
            <Input
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Търсене по файл..."
              className="pl-8 !py-1"
            />
          </div>
          <div className="relative w-48">
            <Building2 size={14} className="absolute left-2.5 top-1.5 text-gray-400" />
            <Input
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              placeholder="Филтър по фирма..."
              className="pl-8 !py-1"
            />
          </div>
          <div className="w-36">
            <Select
              options={TIMEFRAMES}
              value={timeframe}
              onChange={(e) => {
                setTimeframe(e.target.value)
                if (e.target.value) {
                  setDateFrom('')
                  setDateTo('')
                }
              }}
              className="!py-1"
            />
          </div>
          <div className="w-36">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                if (e.target.value) setTimeframe('')
              }}
              placeholder="От дата"
              className="!py-1"
            />
          </div>
          <div className="w-36">
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                if (e.target.value) setTimeframe('')
              }}
              placeholder="До дата"
              className="!py-1"
            />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs text-gray-500">Сортирай:</span>
            {sortBtn('name', 'Име')}
            {sortBtn('date', 'Дата', Clock)}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg bg-white py-16 text-center shadow-sm">
          <FolderOpen size={40} className="text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {companyFilter ? 'Няма намерени фирми по този филтър.' : 'Няма добавени фирми.'}
          </p>
        </div>
      ) : (
        <div ref={listContainerRef} className="space-y-2">
          {filtered.map((f) => (
            <CompanyFolder
              key={f.company_id ?? `dir:${f.name}`}
              folder={f}
              fileSearch={fileSearch}
              timeframe={timeframe}
              dateFrom={dateFrom}
              dateTo={dateTo}
              sortBy={sortBy}
              profileId={activeProfileId}
              selectedIds={selectedIds}
              onRowClick={handleRowClick}
              refreshKey={refreshKey}
            />
          ))}
        </div>
      )}

      <a ref={downloadAnchorRef} className="hidden" aria-hidden="true" />
    </div>
  )
}
