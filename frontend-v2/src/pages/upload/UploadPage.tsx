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

interface StatProps {
  icon: string
  label: string
  value: number
  unit: string
  tone: 'blue' | 'green' | 'orange'
}

const toneStyles: Record<StatProps['tone'], { text: string; bg: string }> = {
  blue: { text: 'text-blue-700', bg: 'bg-blue-50' },
  green: { text: 'text-green-700', bg: 'bg-green-50' },
  orange: { text: 'text-orange-700', bg: 'bg-orange-50' },
}

function StatCard({ icon, label, value, unit, tone }: StatProps) {
  const { text, bg } = toneStyles[tone]
  return (
    <div className={`flex items-center gap-3 rounded-lg ${bg} px-4 py-3`}>
      <span className="text-2xl" aria-hidden>{icon}</span>
      <div>
        <p className="text-xs text-gray-600">{label}</p>
        <p className={`text-lg font-semibold ${text}`}>
          {value.toLocaleString('bg-BG')} <span className="text-xs font-normal text-gray-500">{unit}</span>
        </p>
      </div>
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

      {/* Billing usage cards (v1 parity) */}
      <div className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-3">
        <StatCard
          icon="📄"
          label="Абонамент"
          value={billing?.invoices_limit ?? 0}
          unit="фактури"
          tone="blue"
        />
        <StatCard
          icon="📊"
          label="Обработени за месеца"
          value={billing?.current_usage ?? 0}
          unit="фактури"
          tone="green"
        />
        <StatCard
          icon="📈"
          label="Остатък за месеца"
          value={billing?.remaining ?? 0}
          unit="фактури"
          tone="orange"
        />
      </div>

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
