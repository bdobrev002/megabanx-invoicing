import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { Table, Thead, Th, Td, TrBody } from '@/components/ui/Table'
import DeliveryBolts from '@/components/ui/DeliveryBolts'
import { FileText, Trash2, Pencil, RefreshCw, Plus, Inbox, Check, X, Mail, Settings } from 'lucide-react'
import { invoicingApi } from '@/api/invoicing.api'
import { companiesApi } from '@/api/companies.api'
import { useAuthStore } from '@/stores/authStore'
import { useInvoicingStore } from '@/stores/invoicingStore'
import { useDialogStore } from '@/stores/dialogStore'
import { useWsRefresh } from '@/hooks/useWsRefresh'
import { formatDate } from '@/utils/formatters'
import type { IssuedInvoiceMeta, IncomingCrossCopy } from '@/types/invoicing.types'
import InvoiceForm from './form/InvoiceForm'
import SendEmailModal from './email/SendEmailModal'
import EmailLogDrawer from './email/EmailLogDrawer'
import EmailTemplatesModal from './email/EmailTemplatesModal'

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
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | undefined>(undefined)
  const [tab, setTab] = useState<'issued' | 'incoming'>('issued')
  const [incoming, setIncoming] = useState<IncomingCrossCopy[]>([])
  const [incomingLoading, setIncomingLoading] = useState(false)
  const [emailModal, setEmailModal] = useState<{ invoiceId: string; defaultTo: string } | null>(null)
  const [logDrawerInvoiceId, setLogDrawerInvoiceId] = useState<string | null>(null)
  const [templatesOpen, setTemplatesOpen] = useState(false)

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

  const fetchIncoming = useCallback(async () => {
    if (!profileId) {
      setIncoming([])
      return
    }
    setIncomingLoading(true)
    try {
      const list = await invoicingApi.getIncomingCrossCopies(profileId)
      setIncoming(list)
    } catch {
      setIncoming([])
    } finally {
      setIncomingLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    if (tab !== 'incoming') return
    let cancelled = false
    const load = async () => {
      await fetchIncoming()
      if (cancelled) return
    }
    load()
    return () => { cancelled = true }
  }, [tab, fetchIncoming])

  // WebSocket auto-refresh — debounced so rapid `refresh` bursts collapse into
  // a single fetch (see Devin Review on PR #8).
  useWsRefresh(useCallback(() => {
    void fetchInvoices()
    if (tab === 'incoming') void fetchIncoming()
  }, [fetchInvoices, fetchIncoming, tab]))

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

  const handleApproveIncoming = async (invoiceId: string) => {
    const confirmed = await showConfirm({
      title: 'Одобряване на фактура',
      message:
        'След одобряване контрагентът вече няма да може да редактира или изтрива тази фактура. Продължи?',
    })
    if (!confirmed) return
    try {
      await invoicingApi.approveIncomingCrossCopy(invoiceId)
      setIncoming((prev) => prev.filter((row) => row.meta.invoice_id !== invoiceId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Грешка при одобряване'
      await showError({ message: msg })
    }
  }

  const handleRejectIncoming = async (invoiceId: string) => {
    const confirmed = await showConfirm({
      title: 'Отхвърляне на фактура',
      message: 'Контрагентът ще бъде уведомен, че фактурата е отхвърлена. Продължи?',
    })
    if (!confirmed) return
    try {
      await invoicingApi.rejectIncomingCrossCopy(invoiceId)
      setIncoming((prev) => prev.filter((row) => row.meta.invoice_id !== invoiceId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Грешка при отхвърляне'
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
          {tab === 'issued' && companies.length > 0 && (
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => (tab === 'issued' ? fetchInvoices() : fetchIncoming())}
            title="Опресни"
          >
            <RefreshCw size={16} />
          </Button>
          {tab === 'issued' && companyId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTemplatesOpen(true)}
              title="Имейл шаблони"
            >
              <Settings size={14} className="mr-1" /> Имейл шаблони
            </Button>
          )}
          {tab === 'issued' && (
            <Button
              size="sm"
              variant="primary"
              disabled={!companyId}
              onClick={() => {
                setEditingInvoiceId(undefined)
                setFormMode('create')
              }}
            >
              <Plus size={14} className="mr-1" />
              Нова фактура
            </Button>
          )}
        </div>
      </div>

      {/* Stage 2: tab switcher — Издадени / Входящи */}
      <div className="mt-4 flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('issued')}
          className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
            tab === 'issued'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={14} /> Издадени
        </button>
        <button
          type="button"
          onClick={() => setTab('incoming')}
          className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
            tab === 'incoming'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Inbox size={14} /> Входящи
          {incoming.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white">
              {incoming.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'incoming' ? (
        incomingLoading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : incoming.length === 0 ? (
          <Card className="mt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox size={48} className="text-gray-300" />
              <p className="mt-4 text-gray-500">Няма входящи фактури за одобрение</p>
            </div>
          </Card>
        ) : (
          <div className="mt-4">
            <Table>
              <Thead>
                <tr>
                  <Th>№</Th>
                  <Th>Тип</Th>
                  <Th>Издадена от</Th>
                  <Th>До (Ваша фирма)</Th>
                  <Th>Дата</Th>
                  <Th>Сума</Th>
                  <Th>Действия</Th>
                </tr>
              </Thead>
              <tbody>
                {incoming.map((row) => (
                  <TrBody key={row.meta.invoice_id}>
                    <Td>{row.meta.invoice_number ?? '—'}</Td>
                    <Td>{DOC_TYPE_LABELS[row.meta.document_type] ?? row.meta.document_type}</Td>
                    <Td className="font-medium">{row.issuer.name || '—'}</Td>
                    <Td>{row.recipient.name || '—'}</Td>
                    <Td>{row.meta.issue_date ? formatDate(row.meta.issue_date) : '—'}</Td>
                    <Td className="font-medium">
                      {Number(row.meta.total).toFixed(2)} {row.meta.currency}
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveIncoming(row.meta.invoice_id)}
                          title="Одобри"
                        >
                          <Check size={14} className="text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRejectIncoming(row.meta.invoice_id)}
                          title="Отхвърли"
                        >
                          <X size={14} className="text-red-500" />
                        </Button>
                      </span>
                    </Td>
                  </TrBody>
                ))}
              </tbody>
            </Table>
          </div>
        )
      ) : loading ? (
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
                <Th>Изпратено</Th>
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
                      <button
                        type="button"
                        onClick={() => setLogDrawerInvoiceId(inv.invoice_id)}
                        className="text-xs text-indigo-600 hover:underline"
                        title="Преглед на дневника на изпратените имейли"
                      >
                        дневник
                      </button>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setEmailModal({ invoiceId: inv.invoice_id, defaultTo: '' })
                          }
                          title="Изпрати по имейл"
                        >
                          <Mail size={14} className="text-indigo-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!editable}
                          onClick={() => {
                            if (!editable) return
                            setEditingInvoiceId(inv.invoice_id)
                            setFormMode('edit')
                          }}
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

      {formMode && companyId && (
        <InvoiceForm
          open
          mode={formMode}
          companyId={companyId}
          profileId={profileId}
          invoiceId={editingInvoiceId}
          onClose={() => setFormMode(null)}
          onSaved={() => {
            setFormMode(null)
            void fetchInvoices()
          }}
        />
      )}

      {emailModal && companyId && (
        <SendEmailModal
          open
          invoiceId={emailModal.invoiceId}
          companyId={companyId}
          profileId={profileId}
          defaultTo={emailModal.defaultTo}
          onClose={() => setEmailModal(null)}
          onSent={() => {
            setEmailModal(null)
            void fetchInvoices()
          }}
        />
      )}

      <EmailLogDrawer
        open={logDrawerInvoiceId !== null}
        invoiceId={logDrawerInvoiceId}
        onClose={() => setLogDrawerInvoiceId(null)}
      />

      {templatesOpen && companyId && (
        <EmailTemplatesModal
          open
          companyId={companyId}
          profileId={profileId}
          onClose={() => setTemplatesOpen(false)}
        />
      )}
    </div>
  )
}
