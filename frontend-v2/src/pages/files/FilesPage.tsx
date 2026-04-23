import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Spinner from '@/components/ui/Spinner'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Search, FolderOpen, Building2, Clock, ArrowUp, Download, Trash2, X } from 'lucide-react'
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
  // Lifted selection state so the toolbar (N избрани · Свали · Изтрий · Отмени)
  // can act on files picked across multiple companies at once.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0)
  const [bulkBusy, setBulkBusy] = useState(false)

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

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
        <h2 className="mb-3 text-base font-semibold text-gray-900">Структура на файловете</h2>
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
        <div className="space-y-2">
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
              onToggleSelected={toggleSelected}
              refreshKey={refreshKey}
            />
          ))}
        </div>
      )}

      <a ref={downloadAnchorRef} className="hidden" aria-hidden="true" />

      {selectedIds.size > 0 && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-lg">
            <span className="text-xs font-medium text-gray-700">
              {selectedIds.size} избрани
            </span>
            <span className="text-gray-300">·</span>
            <button
              type="button"
              onClick={handleBulkDownload}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              title="Свали като ZIP"
            >
              <Download size={12} />
              Свали
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
              title="Изтрий избраните"
            >
              <Trash2 size={12} />
              Изтрий
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              title="Отмени избора"
            >
              <X size={12} />
              Отмени
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
