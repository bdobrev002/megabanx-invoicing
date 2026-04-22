import { useState, useCallback, useEffect } from 'react'
import { filesApi } from '@/api/files.api'
import { billingApi, type BillingUsage } from '@/api/billing.api'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import type { InvoiceRecord } from '@/types/file.types'
import DropZone from './DropZone'
import ProcessingProgress from './ProcessingProgress'
import ProcessResults from './ProcessResults'
import InboxFileList from './InboxFileList'

type Stage = 'idle' | 'uploading' | 'results'

interface UploadResult {
  invoice: InvoiceRecord
  analysis: Record<string, string | null> | null
  duplicate?: boolean
}

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
  const [results, setResults] = useState<InvoiceRecord[]>([])
  const [duplicateCount, setDuplicateCount] = useState(0)
  const [billing, setBilling] = useState<BillingUsage | null>(null)

  useEffect(() => {
    billingApi.getCurrent().then(setBilling).catch(() => setBilling(null))
  }, [stage])

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!profileId || files.length === 0) return
      setStage('uploading')
      setTotal(files.length)
      setProgress(0)
      setDuplicateCount(0)
      const uploaded: InvoiceRecord[] = []
      let duplicates = 0

      for (let i = 0; i < files.length; i++) {
        try {
          const res = await filesApi.upload(profileId, files[i])
          const data: UploadResult | null = await res.json()
          if (data?.invoice) {
            uploaded.push(data.invoice)
            if (data.duplicate) duplicates += 1
          }
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : `Грешка при качване на ${files[i].name}`)
        }
        setProgress(i + 1)
      }

      setResults(uploaded)
      setDuplicateCount(duplicates)
      setStage('results')
    },
    [profileId, setError],
  )

  const handleReset = () => {
    setStage('idle')
    setResults([])
    setProgress(0)
    setTotal(0)
    setDuplicateCount(0)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">
        Качване и обработка на фактури
      </h2>

      <QuotaBanner billing={billing} />

      {stage === 'idle' && <DropZone onFiles={handleFiles} />}

      {stage === 'uploading' && (
        <ProcessingProgress current={progress} total={total} />
      )}

      {stage === 'results' && (
        <>
          {duplicateCount > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              {duplicateCount} от файловете са дубликати на вече качени фактури — пропуснати са.
            </div>
          )}
          <ProcessResults results={results} onReset={handleReset} />
        </>
      )}

      {/* AI info banner (v1 parity) */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <span className="text-xl" aria-hidden>🤖</span>
        <p>
          Качете фактури покупки и продажби свързани с вашите фирми.
          Нашият AI автоматично ще разпредели и сортира фактурите по съответните фирми и папки.
        </p>
      </div>

      <InboxFileList />
    </div>
  )
}
