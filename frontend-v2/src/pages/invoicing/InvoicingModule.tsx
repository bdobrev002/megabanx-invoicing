import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { Table, Thead, Th, Td, TrBody } from '@/components/ui/Table'
import DeliveryBolts from '@/components/ui/DeliveryBolts'
import { FileText, Trash2, Pencil, RefreshCw } from 'lucide-react'
import { invoicingApi } from '@/api/invoicing.api'
import { companiesApi } from '@/api/companies.api'
import { useAuthStore } from '@/stores/authStore'
import { useInvoicingStore } from '@/stores/invoicingStore'
import { useDialogStore } from '@/stores/dialogStore'
import { onWsMessage } from '@/api/websocket'
import { formatDate } from '@/utils/formatters'
import type { IssuedInvoiceMeta } from '@/types/invoicing.types'

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: 'Фактура',
  proforma: 'Проформа',
  credit_note: 'Кредитно известие',
  debit_note: 'Дебитно известие',
}

/** Whether the issuer can edit/delete the invoice based on cross_copy_status */
function canEditOrDelete(inv: IssuedInvoiceMeta): boolean {
  return inv.cross_copy_status !== 'approved'
}

export default function InvoicingModule() {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const { selectedCompanyId } = useInvoicingStore()

  const [invoices, setInvoices] = useState<IssuedInvoiceMeta[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState(selectedCompanyId ?? '')

  // Load companies on mount
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!profileId) return
      try {
        const list = await companiesApi.list(profileId)
        if (cancelled) return
        setCompanies(list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
        if (!companyId && list.length > 0) {
          setCompanyId(list[0].id)
        }
      } catch {
        // ignore
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  // Load invoices when company changes
  const fetchInvoices = useCallback(async () => {
    if (!profileId || !companyId) {
      setInvoices([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await invoicingApi.getInvoices(companyId, profileId)
      setInvoices(list)
    } catch {
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [profileId, companyId])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await fetchInvoices()
      if (cancelled) return
    }
    load()
    return () => { cancelled = true }
  }, [fetchInvoices])

  // WebSocket auto-refresh (only on 'refresh' events, consistent with FilesPage/HistoryPage)
  useEffect(() => {
    const unsub = onWsMessage((data) => {
      if (typeof data === 'object' && data !== null && 'type' in data) {
        const evt = data as { type: string }
        if (evt.type === 'refresh') {
          fetchInvoices()
        }
      }
    })
    return unsub
  }, [fetchInvoices])

  const { showConfirm, showError } = useDialogStore()

  const handleDelete = async (invoiceId: string) => {
    const confirmed = await showConfirm({
      title: 'Изтриване на фактура',
      message: 'Сигурни ли сте, че искате да изтриете тази фактура?',
    })
    if (!confirmed) return
    try {
      await invoicingApi.removeInvoice(invoiceId)
      setInvoices((prev) => prev.filter((inv) => inv.invoice_id !== invoiceId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Грешка при изтриване'
      await showError({ message: msg })
    }
  }

  // No profile
  if (!profileId) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Фактуриране</h1>
        <Card className="mt-6">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-gray-300" />
            <p className="mt-4 text-gray-500">Моля, влезте в профила си</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Фактуриране</h1>
        <div className="flex items-center gap-3">
          {companies.length > 0 && (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <Button size="sm" variant="outline" onClick={fetchInvoices} title="Опресни">
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : invoices.length === 0 ? (
        <Card className="mt-6">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={48} className="text-gray-300" />
            <p className="mt-4 text-gray-500">
              {companyId ? 'Няма издадени фактури за тази фирма' : 'Изберете фирма, за да видите фактурите'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="mt-4">
          <Table>
            <Thead>
              <tr>
                <Th>№</Th>
                <Th>Тип</Th>
                <Th>Дата</Th>
                <Th>Сума</Th>
                <Th>Статус</Th>
                <Th>Доставка</Th>
                <Th>Действия</Th>
              </tr>
            </Thead>
            <tbody>
              {invoices.map((inv) => {
                const editable = canEditOrDelete(inv)
                return (
                  <TrBody key={inv.id}>
                    <Td>{inv.invoice_number ?? '—'}</Td>
                    <Td>{DOC_TYPE_LABELS[inv.document_type] ?? inv.document_type}</Td>
                    <Td>{inv.issue_date ? formatDate(inv.issue_date) : '—'}</Td>
                    <Td className="font-medium">
                      {Number(inv.total).toFixed(2)} {inv.currency}
                    </Td>
                    <Td>
                      <Badge variant={inv.status === 'issued' ? 'success' : 'warning'}>
                        {inv.status === 'issued' ? 'Издадена' : 'Чернова'}
                      </Badge>
                    </Td>
                    <Td>
                      <DeliveryBolts status={inv.cross_copy_status} />
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!editable}
                          title={editable ? 'Редактирай' : 'Одобрена от контрагента — не може да се редактира'}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!editable}
                          onClick={() => editable && handleDelete(inv.invoice_id)}
                          title={editable ? 'Изтрий' : 'Одобрена от контрагента — не може да се изтрие'}
                        >
                          <Trash2 size={14} className={editable ? 'text-red-500' : ''} />
                        </Button>
                      </span>
                    </Td>
                  </TrBody>
                )
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  )
}
