import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { History } from 'lucide-react'
import { filesApi } from '@/api/files.api'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { onWsMessage } from '@/api/websocket'
import type { InvoiceRecord } from '@/types/file.types'
import HistoryFilters from './HistoryFilters'
import HistoryTable from './HistoryTable'

export default function HistoryPage() {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const setError = useUiStore((s) => s.setError)

  const [records, setRecords] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const setSuccess = useUiStore((s) => s.setSuccess)

  const fetchRecords = useCallback(async () => {
    if (!profileId) return
    try {
      const list = await filesApi.list(profileId)
      setRecords(list)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при зареждане')
    } finally {
      setLoading(false)
    }
  }, [profileId, setError])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await fetchRecords()
      if (cancelled) return
    }
    load()
    return () => { cancelled = true }
  }, [fetchRecords])

  // Refresh on WebSocket events
  useEffect(() => {
    return onWsMessage((data) => {
      if (typeof data === 'object' && data !== null && 'type' in data) {
        const evt = data as { type: string }
        if (evt.type === 'refresh') {
          fetchRecords()
        }
      }
    })
  }, [fetchRecords])

  const handleResync = async (invoiceId: string) => {
    if (!profileId) return
    try {
      await filesApi.resync(profileId, invoiceId)
      setSuccess('Фактурата е маркирана за повторна синхронизация')
      fetchRecords()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при ресинхронизация')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  const filtered = records.filter((r) => {
    if (search) {
      const q = search.toLowerCase()
      const match =
        r.original_filename.toLowerCase().includes(q) ||
        r.company_name?.toLowerCase().includes(q) ||
        r.invoice_number?.toLowerCase().includes(q)
      if (!match) return false
    }
    if (typeFilter && r.invoice_type !== typeFilter) return false
    return true
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">История</h1>

      <HistoryFilters
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
      />

      {filtered.length === 0 ? (
        <Card className="mt-4">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <History size={48} className="text-gray-300" />
            <p className="mt-4 text-gray-500">Няма записи в историята</p>
          </div>
        </Card>
      ) : (
        <HistoryTable records={filtered} onResync={handleResync} />
      )}
    </div>
  )
}
