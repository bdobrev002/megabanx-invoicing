import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Inbox, CheckCircle } from 'lucide-react'
import { filesApi } from '@/api/files.api'
import { companiesApi } from '@/api/companies.api'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import type { InvoiceRecord } from '@/types/file.types'
import type { Company } from '@/types/company.types'

export default function InboxFileList() {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const setError = useUiStore((s) => s.setError)
  const [items, setItems] = useState<InvoiceRecord[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string>('')
  const [selection, setSelection] = useState<Record<string, { companyId: string; type: 'purchase' | 'sale' }>>({})

  const refresh = useCallback(() => {
    if (!profileId) return
    Promise.all([filesApi.getInbox(profileId), companiesApi.list(profileId)])
      .then(([inbox, comps]) => {
        setItems(inbox)
        setCompanies(comps)
      })
      .catch(() => {
        setItems([])
        setCompanies([])
      })
      .finally(() => setLoading(false))
  }, [profileId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleReclassify = async (invoiceId: string) => {
    const sel = selection[invoiceId]
    if (!sel?.companyId) {
      setError('Изберете фирма')
      return
    }
    setSaving(invoiceId)
    try {
      await filesApi.reclassify(profileId, invoiceId, sel.companyId, sel.type)
      setItems((prev) => prev.filter((inv) => inv.id !== invoiceId))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при прекласифициране')
    } finally {
      setSaving('')
    }
  }

  if (loading || items.length === 0) return null

  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Inbox size={18} className="text-orange-500" />
        Входяща кутия ({items.length})
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const sel = selection[item.id] ?? { companyId: '', type: 'purchase' as const }
          return (
            <Card key={item.id} className="flex flex-col gap-2">
              <p className="truncate text-sm font-medium text-gray-900">
                {item.original_filename}
              </p>
              <p className="text-xs text-gray-500">
                {item.issuer_name || '—'} → {item.recipient_name || '—'}
              </p>
              {item.error_message && (
                <p className="text-xs text-gray-500">{item.error_message}</p>
              )}
              <Badge variant="warning" className="self-start">Без съвпадение</Badge>
              <div className="mt-2 flex flex-col gap-2">
                <select
                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  value={sel.companyId}
                  onChange={(e) =>
                    setSelection((prev) => ({
                      ...prev,
                      [item.id]: { ...sel, companyId: e.target.value },
                    }))
                  }
                >
                  <option value="">Изберете фирма</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={sel.type === 'purchase' ? 'primary' : 'outline'}
                    className="flex-1"
                    onClick={() =>
                      setSelection((prev) => ({
                        ...prev,
                        [item.id]: { ...sel, type: 'purchase' },
                      }))
                    }
                  >
                    Покупка
                  </Button>
                  <Button
                    size="sm"
                    variant={sel.type === 'sale' ? 'primary' : 'outline'}
                    className="flex-1"
                    onClick={() =>
                      setSelection((prev) => ({
                        ...prev,
                        [item.id]: { ...sel, type: 'sale' },
                      }))
                    }
                  >
                    Продажба
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  loading={saving === item.id}
                  disabled={!sel.companyId}
                  onClick={() => handleReclassify(item.id)}
                >
                  <CheckCircle size={14} className="mr-1" /> Потвърди
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
