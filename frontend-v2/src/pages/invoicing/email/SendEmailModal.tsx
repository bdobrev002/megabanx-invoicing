import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import { invoicingApi } from '@/api/invoicing.api'
import { useDialogStore } from '@/stores/dialogStore'
import { EMAIL_MERGE_FIELDS, type EmailTemplate } from '@/types/invoicing.types'

interface SendEmailModalProps {
  open: boolean
  onClose: () => void
  onSent?: () => void
  invoiceId: string
  companyId: string
  profileId: string
  defaultTo?: string
}

export default function SendEmailModal({
  open,
  onClose,
  onSent,
  invoiceId,
  companyId,
  profileId,
  defaultTo = '',
}: SendEmailModalProps) {
  const { showError, showSuccess } = useDialogStore()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templateId, setTemplateId] = useState<string>('')
  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachPdf, setAttachPdf] = useState(true)
  const [sending, setSending] = useState(false)

  // All state writes happen inside the async IIFE (microtask) to satisfy
  // react-hooks/set-state-in-effect. `templatesLoading` is initialized to
  // `true` so no synchronous flip is needed on open.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      if (cancelled) return
      setTo(defaultTo)
      setCc('')
      setBcc('')
      setSubject('')
      setBody('')
      setTemplateId('')
      setAttachPdf(true)
      setTemplatesLoading(true)
      try {
        const list = await invoicingApi.listEmailTemplates(companyId, profileId)
        if (cancelled) return
        setTemplates(list)
        const def = list.find((t) => t.is_default)
        if (def) {
          setTemplateId(def.id)
          setSubject(def.subject)
          setBody(def.body)
          setAttachPdf(def.attach_pdf)
        }
      } catch {
        if (!cancelled) setTemplates([])
      } finally {
        if (!cancelled) setTemplatesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, companyId, profileId, defaultTo])

  const applyTemplate = (tid: string) => {
    setTemplateId(tid)
    if (!tid) return
    const t = templates.find((x) => x.id === tid)
    if (!t) return
    setSubject(t.subject)
    setBody(t.body)
    setAttachPdf(t.attach_pdf)
  }

  const insertMergeField = (field: string) => {
    setBody((prev) => `${prev}${field}`)
  }

  const handleSend = async () => {
    if (!to.trim()) {
      await showError({ message: 'Моля, въведете имейл на получател.' })
      return
    }
    setSending(true)
    try {
      await invoicingApi.sendInvoiceEmail(invoiceId, {
        to_email: to.trim(),
        cc_emails: cc
          .split(/[\s,;]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        bcc_emails: bcc
          .split(/[\s,;]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        subject: subject || undefined,
        body: body || undefined,
        template_id: templateId || null,
        attach_pdf: attachPdf,
      })
      await showSuccess({ message: 'Имейлът беше изпратен.' })
      onSent?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Грешка при изпращане на имейла'
      await showError({ message: msg })
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Изпрати фактурата по имейл" size="xl">
      {templatesLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Шаблон</label>
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— По подразбиране —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.is_default ? ' (по подразбиране)' : ''}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="До"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="client@example.com"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cc (по желание)"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="copy@example.com"
            />
            <Input
              label="Bcc (по желание)"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="hidden@example.com"
            />
          </div>

          <Input
            label="Тема"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Фактура №{invoice_number} от {company_name}"
          />

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Съобщение</label>
              <div className="flex flex-wrap gap-1">
                {EMAIL_MERGE_FIELDS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => insertMergeField(f.value)}
                    className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-100"
                    title={f.label}
                  >
                    {f.value}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Здравейте, изпращаме Ви фактура №{invoice_number}..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={attachPdf}
              onChange={(e) => setAttachPdf(e.target.checked)}
            />
            Прикачи PDF на фактурата
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Отказ
            </Button>
            <Button variant="primary" onClick={handleSend} disabled={sending}>
              {sending ? 'Изпращане…' : 'Изпрати'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
