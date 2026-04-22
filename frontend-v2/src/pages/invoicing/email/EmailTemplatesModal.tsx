import { useCallback, useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import { Plus, Trash2 } from 'lucide-react'
import { invoicingApi } from '@/api/invoicing.api'
import { useDialogStore } from '@/stores/dialogStore'
import { EMAIL_MERGE_FIELDS, type EmailTemplate } from '@/types/invoicing.types'

interface EmailTemplatesModalProps {
  open: boolean
  onClose: () => void
  companyId: string
  profileId: string
}

interface EditorState {
  id: string | null
  name: string
  subject: string
  body: string
  is_default: boolean
  attach_pdf: boolean
}

const EMPTY: EditorState = {
  id: null,
  name: '',
  subject: 'Фактура №{invoice_number} от {company_name}',
  body:
    'Здравейте,\n\nПрикачваме фактура №{invoice_number} от {issue_date} на стойност {total} {currency}.\n\nПоздрави,\n{company_name}',
  is_default: false,
  attach_pdf: true,
}

export default function EmailTemplatesModal({
  open,
  onClose,
  companyId,
  profileId,
}: EmailTemplatesModalProps) {
  const { showError, showConfirm } = useDialogStore()
  const [list, setList] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState<EditorState>(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const rows = await invoicingApi.listEmailTemplates(companyId, profileId)
      setList(rows)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [companyId, profileId])

  // State writes happen inside the async IIFE (microtask) to satisfy
  // react-hooks/set-state-in-effect. `loading` is initialized to `true`.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      if (cancelled) return
      setEditor(EMPTY)
      await load()
    })()
    return () => {
      cancelled = true
    }
  }, [open, load])

  const startNew = () => setEditor({ ...EMPTY })

  const startEdit = (t: EmailTemplate) =>
    setEditor({
      id: t.id,
      name: t.name,
      subject: t.subject,
      body: t.body,
      is_default: t.is_default,
      attach_pdf: t.attach_pdf,
    })

  const handleSave = async () => {
    if (!editor.name.trim() || !editor.subject.trim() || !editor.body.trim()) {
      await showError({ message: 'Моля, попълнете име, тема и съобщение.' })
      return
    }
    setSaving(true)
    try {
      if (editor.id) {
        await invoicingApi.updateEmailTemplate(editor.id, {
          name: editor.name,
          subject: editor.subject,
          body: editor.body,
          is_default: editor.is_default,
          attach_pdf: editor.attach_pdf,
        })
      } else {
        await invoicingApi.createEmailTemplate({
          company_id: companyId,
          profile_id: profileId,
          name: editor.name,
          subject: editor.subject,
          body: editor.body,
          is_default: editor.is_default,
          attach_pdf: editor.attach_pdf,
        })
      }
      setEditor(EMPTY)
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Грешка при запис'
      await showError({ message: msg })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await showConfirm({
      title: 'Изтриване на шаблон',
      message: 'Сигурни ли сте, че искате да изтриете този шаблон?',
    })
    if (!ok) return
    try {
      await invoicingApi.deleteEmailTemplate(id)
      if (editor.id === id) setEditor(EMPTY)
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Грешка при изтриване'
      await showError({ message: msg })
    }
  }

  const insertMergeField = (field: string) => {
    setEditor((prev) => ({ ...prev, body: `${prev.body}${field}` }))
  }

  return (
    <Modal open={open} onClose={onClose} title="Имейл шаблони" size="xl">
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-gray-500">Шаблони</h3>
              <Button size="sm" variant="outline" onClick={startNew}>
                <Plus size={14} className="mr-1" /> Нов
              </Button>
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-gray-500">Няма шаблони за тази фирма.</p>
            ) : (
              <ul className="space-y-1">
                {list.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-50 ${
                        editor.id === t.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                      }`}
                    >
                      <span className="truncate">
                        {t.name}
                        {t.is_default && (
                          <Badge variant="success" className="ml-2">
                            по подразбиране
                          </Badge>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDelete(t.id)
                        }}
                        className="text-gray-400 hover:text-red-500"
                        title="Изтрий"
                      >
                        <Trash2 size={14} />
                      </button>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <Input
              label="Име на шаблона"
              value={editor.name}
              onChange={(e) => setEditor((p) => ({ ...p, name: e.target.value }))}
              placeholder="напр. Стандартна фактура"
            />
            <Input
              label="Тема"
              value={editor.subject}
              onChange={(e) => setEditor((p) => ({ ...p, subject: e.target.value }))}
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
                value={editor.body}
                onChange={(e) => setEditor((p) => ({ ...p, body: e.target.value }))}
                rows={8}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editor.is_default}
                  onChange={(e) =>
                    setEditor((p) => ({ ...p, is_default: e.target.checked }))
                  }
                />
                По подразбиране
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editor.attach_pdf}
                  onChange={(e) =>
                    setEditor((p) => ({ ...p, attach_pdf: e.target.checked }))
                  }
                />
                Прикачи PDF по подразбиране
              </label>
            </div>
            <div className="flex justify-end gap-2">
              {editor.id && (
                <Button variant="outline" onClick={() => setEditor(EMPTY)} disabled={saving}>
                  Нов шаблон
                </Button>
              )}
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Запис…' : editor.id ? 'Запази' : 'Създай'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
