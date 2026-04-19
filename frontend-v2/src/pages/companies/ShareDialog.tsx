import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { sharingApi } from '@/api/sharing.api'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import type { CompanyShare } from '@/types/company.types'
import SharePermissions from './SharePermissions'

interface Props {
  companyId: string
  companyName: string
  onClose: () => void
}

export default function ShareDialog({ companyId, companyName, onClose }: Props) {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const setError = useUiStore((s) => s.setError)

  const [shares, setShares] = useState<CompanyShare[]>([])
  const [email, setEmail] = useState('')
  const [canUpload, setCanUpload] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    sharingApi
      .getShares(profileId, companyId)
      .then(setShares)
      .catch(() => setShares([]))
      .finally(() => setLoading(false))
  }, [profileId, companyId])

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    try {
      const share = await sharingApi.share(profileId, companyId, email, canUpload)
      setShares((prev) => [...prev, share])
      setEmail('')
      setCanUpload(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка при споделяне')
    } finally {
      setSending(false)
    }
  }

  const handleRemove = async (shareId: string) => {
    try {
      await sharingApi.removeShare(profileId, companyId, shareId)
      setShares((prev) => prev.filter((s) => s.id !== shareId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка при премахване')
    }
  }

  const handleToggleUpload = async (shareId: string, current: boolean) => {
    try {
      await sharingApi.updatePermission(profileId, companyId, shareId, !current)
      setShares((prev) =>
        prev.map((s) => (s.id === shareId ? { ...s, can_upload: !current } : s)),
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка при промяна')
    }
  }

  return (
    <Modal open onClose={onClose} title={`Споделяне — ${companyName}`} size="lg">
      <form onSubmit={handleShare} className="mb-4 flex gap-2">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="имейл на потребител"
          type="email"
          required
        />
        <label className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap">
          <input
            type="checkbox"
            checked={canUpload}
            onChange={(e) => setCanUpload(e.target.checked)}
          />
          Качване
        </label>
        <Button type="submit" size="sm" loading={sending}>
          Сподели
        </Button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">Зареждане...</p>
      ) : (
        <SharePermissions
          shares={shares}
          onRemove={handleRemove}
          onToggleUpload={handleToggleUpload}
        />
      )}
    </Modal>
  )
}
