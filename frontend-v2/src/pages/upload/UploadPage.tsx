import { useState, useCallback, useEffect } from 'react'
import { filesApi, type InboxFile, type ProcessInboxResponse } from '@/api/files.api'
import { billingApi, type BillingUsage } from '@/api/billing.api'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Sparkles, Trash2, FileText, RotateCcw } from 'lucide-react'
import DropZone from './DropZone'
import ProcessingProgress from './ProcessingProgress'
import InboxFileList from './InboxFileList'

type Stage = 'idle' | 'uploading' | 'processing' | 'results'

type QuotaTone = 'indigo' | 'yellow' | 'red'

function quotaToneFor(b: BillingUsage | null): QuotaTone {
  if (!b || b.invoices_limit >= 999999) return 'indigo'
  const pct = b.invoices_limit > 0 ? b.current_usage / b.invoices_limit : 0
  if (b.remaining <= 0 || pct >= 1) return 'red'
  if (pct >= 0.9) return 'red'
  if (pct >= 0.8) return 'yellow'
  return 'indigo'
}

const quotaStyles: Record<QuotaTone, { box: string; head: string; line: string }> = {
  indigo: {
    box: 'bg-indigo-50 border-indigo-200',
    head: 'text-indigo-800',
    line: 'text-indigo-700',
  },
  yellow: {
    box: 'bg-yellow-50 border-yellow-200',
    head: 'text-yellow-800',
    line: 'text-yellow-700',
  },
  red: {
    box: 'bg-red-50 border-red-200',
    head: 'text-red-800',
    line: 'text-red-700',
  },
}

function QuotaBanner({ billing }: { billing: BillingUsage | null }) {
  const tone = quotaToneFor(billing)
  const styles = quotaStyles[tone]
  const limit = billing?.invoices_limit ?? 0
  const processed = billing?.current_usage ?? 0
  const remaining = billing?.remaining ?? 0
  const unlimited = limit >= 999999
  const pct = limit > 0 ? processed / limit : 0
  const atLimit = !unlimited && (remaining <= 0 || pct >= 1)
  const at90 = !unlimited && !atLimit && pct >= 0.9
  const at80 = !unlimited && !atLimit && !at90 && pct >= 0.8

  return (
    <div className={`mb-4 rounded-lg border p-4 ${styles.box}`}>
      <div className="space-y-1 text-sm">
        <div className={`font-medium ${styles.head}`}>
          <span className="mr-1.5" aria-hidden>📄</span>
          Абонамент {unlimited ? 'Неограничен' : limit} фактури
        </div>
        <div className={styles.line}>
          <span className="mr-1.5" aria-hidden>📊</span>
          Обработени за месеца {processed} фактури
        </div>
        <div className={styles.line}>
          <span className="mr-1.5" aria-hidden>📈</span>
          Остатък за месеца {unlimited ? 'Неограничен' : remaining} фактури
        </div>
      </div>
      {at80 && (
        <div className="mt-2 rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
          ⚠ Близо сте до лимита си за този месец
        </div>
      )}
      {at90 && (
        <div className="mt-2 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
          ⚠ Достигнахте 90% от лимита си за този месец
        </div>
      )}
      {atLimit && (
        <div className="mt-2 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
          ⚠ Достигнахте лимита си. Моля, обновете абонамента за да продължите.
        </div>
      )}
    </div>
  )
}

export default function UploadPage() {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const setError = useUiStore((s) => s.setError)

  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [inboxFiles, setInboxFiles] = useState<InboxFile[]>([])
  const [billing, setBilling] = useState<BillingUsage | null>(null)
  const [summary, setSummary] = useState<ProcessInboxResponse | null>(null)
  const [inboxKey, setInboxKey] = useState(0)

  useEffect(() => {
    billingApi.getCurrent().then(setBilling).catch(() => setBilling(null))
  }, [stage])

  const refreshInbox = useCallback(() => {
    if (!profileId) return Promise.resolve()
    return filesApi
      .getInboxFiles(profileId)
      .then((res) => setInboxFiles(res.files))
      .catch(() => setInboxFiles([]))
  }, [profileId])

  useEffect(() => {
    void refreshInbox()
  }, [refreshInbox])

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!profileId || files.length === 0) return
      setStage('uploading')
      setTotal(files.length)
      setProgress(0)

      for (let i = 0; i < files.length; i++) {
        try {
          await filesApi.upload(profileId, files[i])
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : `Грешка при качване на ${files[i].name}`)
        }
        setProgress(i + 1)
      }

      await refreshInbox()
      setStage('idle')
    },
    [profileId, setError, refreshInbox],
  )

  const handleProcess = useCallback(async () => {
    if (!profileId || inboxFiles.length === 0) return
    setStage('processing')
    setTotal(inboxFiles.length)
    setProgress(0)
    try {
      const res = await filesApi.processInbox(profileId)
      setSummary(res)
      setStage('results')
      setInboxKey((k) => k + 1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при обработката')
      setStage('idle')
    }
    await refreshInbox()
  }, [profileId, inboxFiles.length, setError, refreshInbox])

  const handleClear = useCallback(async () => {
    if (!profileId) return
    if (!window.confirm('Да изчистим ли всички файлове от Входяща кутия?')) return
    try {
      await filesApi.clearInbox(profileId)
      setInboxFiles([])
      setSummary(null)
      setInboxKey((k) => k + 1)
      setStage('idle')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при изчистване')
    }
  }, [profileId, setError])

  const handleReset = () => {
    setStage('idle')
    setProgress(0)
    setTotal(0)
    setSummary(null)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">
        Качване и обработка на фактури
      </h2>

      <QuotaBanner billing={billing} />

      {stage === 'idle' && <DropZone onFiles={handleFiles} />}

      {stage === 'uploading' && (
        <Card>
          <div className="py-8 text-center">
            <p className="text-lg font-medium text-gray-900">
              Качване на файлове... {progress}/{total}
            </p>
            <div className="mx-auto mt-4 h-3 w-64 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${total > 0 ? Math.round((progress / total) * 100) : 0}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {stage === 'processing' && (
        <ProcessingProgress current={0} total={total} />
      )}

      {stage === 'results' && summary && (
        <Card>
          <div className="flex flex-col gap-3 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Резултат от обработката</h3>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded bg-green-50 px-3 py-2 text-green-800">
                Обработени: <strong>{summary.processed}</strong>
              </div>
              <div className="rounded bg-yellow-50 px-3 py-2 text-yellow-800">
                Без съвпадение: <strong>{summary.unmatched}</strong>
              </div>
              <div className="rounded bg-gray-50 px-3 py-2 text-gray-800">
                Дубликати: <strong>{summary.duplicate}</strong>
              </div>
              {summary.over_limit > 0 && (
                <div className="rounded bg-red-50 px-3 py-2 text-red-800">
                  Над лимита: <strong>{summary.over_limit}</strong>
                </div>
              )}
              {summary.errors > 0 && (
                <div className="rounded bg-red-50 px-3 py-2 text-red-800">
                  Грешки: <strong>{summary.errors}</strong>
                </div>
              )}
            </div>
            <div>
              <Button size="sm" variant="outline" onClick={handleReset}>
                <RotateCcw size={14} className="mr-1" /> Качи още файлове
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Inbox staging area + action buttons (v1 parity) */}
      {inboxFiles.length > 0 && stage !== 'processing' && stage !== 'uploading' && (
        <Card>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <FileText size={18} className="text-indigo-600" />
                Чакат обработка ({inboxFiles.length})
              </h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleProcess}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Sparkles size={14} className="mr-1" /> Обработи с AI
                </Button>
                <Button size="sm" variant="outline" onClick={handleClear}>
                  <Trash2 size={14} className="mr-1" /> Изчисти
                </Button>
              </div>
            </div>
            <ul className="divide-y divide-gray-100 text-sm">
              {inboxFiles.map((f) => (
                <li key={f.inbox_filename} className="flex items-center justify-between py-1.5">
                  <span className="truncate text-gray-800">{f.original_filename}</span>
                  <span className="shrink-0 text-xs text-gray-500">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* AI info banner (v1 parity) */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <span className="text-xl" aria-hidden>🤖</span>
        <p>
          Качете фактури покупки и продажби свързани с вашите фирми.
          След качването натиснете <strong>Обработи с AI</strong> и системата автоматично ще разпредели и сортира файловете по съответните фирми и папки.
        </p>
      </div>

      <InboxFileList key={inboxKey} />
    </div>
  )
}
