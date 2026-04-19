import { useState, useCallback } from 'react'
import { filesApi } from '@/api/files.api'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import type { InvoiceRecord } from '@/types/file.types'
import DropZone from './DropZone'
import ProcessingProgress from './ProcessingProgress'
import ProcessResults from './ProcessResults'
import InboxFileList from './InboxFileList'

type Stage = 'idle' | 'uploading' | 'results'

export default function UploadPage() {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const setError = useUiStore((s) => s.setError)

  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [results, setResults] = useState<InvoiceRecord[]>([])

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!profileId || files.length === 0) return
      setStage('uploading')
      setTotal(files.length)
      setProgress(0)
      const uploaded: InvoiceRecord[] = []

      for (let i = 0; i < files.length; i++) {
        try {
          const res = await filesApi.upload(profileId, files[i])
          const data = await res.json()
          if (data) uploaded.push(data as InvoiceRecord)
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : `Грешка при качване на ${files[i].name}`)
        }
        setProgress(i + 1)
      }

      setResults(uploaded)
      setStage('results')
    },
    [profileId, setError],
  )

  const handleReset = () => {
    setStage('idle')
    setResults([])
    setProgress(0)
    setTotal(0)
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Качване на файлове</h1>

      {stage === 'idle' && <DropZone onFiles={handleFiles} />}

      {stage === 'uploading' && (
        <ProcessingProgress current={progress} total={total} />
      )}

      {stage === 'results' && (
        <ProcessResults results={results} onReset={handleReset} />
      )}

      <InboxFileList />
    </div>
  )
}
