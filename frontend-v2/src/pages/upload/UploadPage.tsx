import { useState, useCallback, useEffect, type ReactElement } from 'react'
import {
  filesApi,
  processInboxStream,
  type InboxFile,
  type ProcessInboxResponse,
} from '@/api/files.api'
import { billingApi, type BillingUsage } from '@/api/billing.api'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import {
  Sparkles,
  Trash2,
  FileText,
  RotateCcw,
  Loader2,
  Check,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import DropZone from './DropZone'
import InboxFileList from './InboxFileList'

type FileStatus = 'pending' | 'processing' | 'processed' | 'unmatched' | 'duplicate' | 'over_limit' | 'error'

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

// v1-style processing animation: gradient "brain" logo that breathes
// (processingGlow keyframe, 3s ease-in-out) with a slow-spinning ring and a
// per-file status list. Keyframes are injected once via a <style> tag so we
// don't need a global stylesheet edit.
const PROCESSING_ANIMATION_CSS = `
@keyframes megabanxProcessingGlow {
  0%, 100% { filter: drop-shadow(0 0 0.5rem rgba(99,102,241,0.35)); transform: scale(1); }
  50%      { filter: drop-shadow(0 0 1.25rem rgba(99,102,241,0.7));  transform: scale(1.05); }
}
@keyframes megabanxSpinSlow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes megabanxFileProgressBar {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.megabanx-processing-glow { animation: megabanxProcessingGlow 3s ease-in-out infinite; }
.megabanx-spin-slow       { animation: megabanxSpinSlow 4s linear infinite; }
.megabanx-file-progress   { animation: megabanxFileProgressBar 2.5s linear infinite; background-size: 200% 100%; }
`

const fileStatusStyles: Record<
  FileStatus,
  { box: string; label: string; labelText: string; icon: ReactElement }
> = {
  pending: {
    box: 'bg-gray-50 border-gray-200',
    label: 'bg-gray-100 text-gray-600',
    labelText: 'Изчаква',
    icon: <Clock size={14} className="text-gray-400" />,
  },
  processing: {
    box: 'bg-indigo-50 border-indigo-200',
    label: 'bg-indigo-100 text-indigo-700',
    labelText: 'Обработва се...',
    icon: <Loader2 size={14} className="animate-spin text-indigo-600" />,
  },
  processed: {
    box: 'bg-green-50 border-green-200',
    label: 'bg-green-100 text-green-700',
    labelText: 'Готово',
    icon: <Check size={14} className="text-green-600" />,
  },
  unmatched: {
    box: 'bg-yellow-50 border-yellow-200',
    label: 'bg-yellow-100 text-yellow-700',
    labelText: 'Без съвпадение',
    icon: <AlertTriangle size={14} className="text-yellow-600" />,
  },
  duplicate: {
    box: 'bg-gray-50 border-gray-200',
    label: 'bg-gray-100 text-gray-700',
    labelText: 'Дубликат',
    icon: <AlertTriangle size={14} className="text-gray-500" />,
  },
  over_limit: {
    box: 'bg-red-50 border-red-200',
    label: 'bg-red-100 text-red-700',
    labelText: 'Над лимита',
    icon: <AlertTriangle size={14} className="text-red-600" />,
  },
  error: {
    box: 'bg-red-50 border-red-200',
    label: 'bg-red-100 text-red-700',
    labelText: 'Грешка',
    icon: <AlertTriangle size={14} className="text-red-600" />,
  },
}

function ProcessingStream({
  current,
  total,
  parallel,
  files,
  statuses,
}: {
  current: number
  total: number
  parallel: number
  files: InboxFile[]
  statuses: Record<string, FileStatus>
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <Card>
      <style>{PROCESSING_ANIMATION_CSS}</style>
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <div
              className="megabanx-processing-glow flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg"
              aria-hidden
            >
              <Sparkles size={28} />
            </div>
            <Loader2
              size={72}
              className="megabanx-spin-slow absolute -left-1 -top-1 text-indigo-300/60"
              strokeWidth={1}
            />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              Обработка с AI...
            </p>
            <p className="text-sm text-gray-600">
              {current}/{total} файла
              {parallel > 0 && (
                <span className="ml-2 text-gray-500">
                  (до {parallel} едновременно)
                </span>
              )}
            </p>
          </div>
          <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <ul className="space-y-1 text-sm">
          {files.map((f) => {
            const status: FileStatus = statuses[f.inbox_filename] ?? 'pending'
            const s = fileStatusStyles[status]
            return (
              <li
                key={f.inbox_filename}
                className={`relative overflow-hidden rounded border ${s.box}`}
              >
                {status === 'processing' && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div
                      className="megabanx-file-progress h-full w-full bg-gradient-to-r from-blue-200 via-indigo-400 to-blue-200 opacity-50"
                    />
                  </div>
                )}
                {status === 'processed' && (
                  <div className="pointer-events-none absolute inset-0 bg-green-200 opacity-20" />
                )}
                <div className="relative flex items-center justify-between gap-3 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0">{s.icon}</span>
                    <span
                      className={`truncate ${
                        status === 'processing'
                          ? 'font-medium text-indigo-700'
                          : status === 'processed'
                            ? 'text-green-700'
                            : status === 'error' || status === 'over_limit'
                              ? 'text-red-700'
                              : status === 'unmatched'
                                ? 'text-yellow-700'
                                : 'text-gray-800'
                      }`}
                    >
                      {f.original_filename}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${s.label}`}
                  >
                    {s.labelText}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  )
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
  const [parallel, setParallel] = useState(0)
  const [inboxFiles, setInboxFiles] = useState<InboxFile[]>([])
  const [billing, setBilling] = useState<BillingUsage | null>(null)
  const [summary, setSummary] = useState<ProcessInboxResponse | null>(null)
  const [inboxKey, setInboxKey] = useState(0)
  const [fileStatus, setFileStatus] = useState<Record<string, FileStatus>>({})

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
    setParallel(0)
    setFileStatus(
      Object.fromEntries(inboxFiles.map((f) => [f.inbox_filename, 'pending' as FileStatus])),
    )

    try {
      for await (const event of processInboxStream(profileId)) {
        switch (event.type) {
          case 'start':
            setTotal(event.total)
            setParallel(event.parallel)
            break
          case 'file_processing':
            setFileStatus((prev) => ({ ...prev, [event.filename]: 'processing' }))
            break
          case 'progress':
            setFileStatus((prev) => ({ ...prev, [event.filename]: event.status }))
            setProgress(event.current)
            break
          case 'complete': {
            const summaryPayload: ProcessInboxResponse = {
              ...event.counts,
              results: event.results,
            }
            setSummary(summaryPayload)
            setStage('results')
            setInboxKey((k) => k + 1)
            break
          }
          case 'error':
            setError(event.message || 'Грешка при обработката')
            setStage('idle')
            break
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Грешка при обработката')
      setStage('idle')
    }
    await refreshInbox()
  }, [profileId, inboxFiles, setError, refreshInbox])

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
        <ProcessingStream
          current={progress}
          total={total}
          parallel={parallel}
          files={inboxFiles}
          statuses={fileStatus}
        />
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
