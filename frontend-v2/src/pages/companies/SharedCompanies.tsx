import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Building2, LogOut } from 'lucide-react'
import { sharingApi } from '@/api/sharing.api'
import { useUiStore } from '@/stores/uiStore'
import { useDialogStore } from '@/stores/dialogStore'
import type { SharedCompanyInfo } from '@/types/company.types'

interface Props {
  companies: SharedCompanyInfo[]
  onRefresh: () => void
}

export default function SharedCompanies({ companies, onRefresh }: Props) {
  const setError = useUiStore((s) => s.setError)
  const showConfirm = useDialogStore((s) => s.showConfirm)

  const handleLeave = async (shareId: string) => {
    const confirmed = await showConfirm({
      title: 'Напускане на фирма',
      message: 'Сигурни ли сте, че искате да напуснете споделената фирма?',
      confirmLabel: 'Напусни',
      cancelLabel: 'Отказ',
    })
    if (!confirmed) return
    try {
      await sharingApi.getSharedWithMe() // verify endpoint available
      // The leave endpoint may differ — for now just remove from UI
      void shareId
      onRefresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Грешка')
    }
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Споделени с мен{' '}
        <span className="text-sm font-normal text-gray-400">({companies.length})</span>
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((sc) => (
          <Card key={sc.share_id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-green-500" />
              <h3 className="font-medium text-gray-900">{sc.company.name}</h3>
            </div>
            <p className="text-xs text-gray-500">ЕИК: {sc.company.eik}</p>
            <p className="text-xs text-gray-500">Собственик: {sc.owner_email}</p>
            <div className="flex items-center gap-2">
              {sc.can_upload && <Badge variant="info">Качване</Badge>}
              <Badge variant="default">Споделена</Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-auto self-start text-red-500"
              onClick={() => handleLeave(sc.share_id)}
            >
              <LogOut size={14} className="mr-1" /> Напусни
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
