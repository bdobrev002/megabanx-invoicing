import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Trash2, Upload } from 'lucide-react'
import type { CompanyShare } from '@/types/company.types'

interface Props {
  shares: CompanyShare[]
  onRemove: (shareId: string) => void
  onToggleUpload: (shareId: string, current: boolean) => void
}

export default function SharePermissions({ shares, onRemove, onToggleUpload }: Props) {
  if (shares.length === 0) {
    return <p className="text-sm text-gray-400">Тази фирма не е споделена с никого.</p>
  }

  return (
    <ul className="divide-y divide-gray-100">
      {shares.map((s) => (
        <li key={s.id} className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-800">{s.shared_with_email}</p>
            <div className="mt-0.5 flex gap-1">
              {s.can_upload && (
                <Badge variant="info">
                  <Upload size={10} className="mr-0.5" /> Качване
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleUpload(s.id, s.can_upload)}
              title={s.can_upload ? 'Забрани качване' : 'Разреши качване'}
            >
              <Upload size={14} className={s.can_upload ? 'text-indigo-500' : 'text-gray-400'} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onRemove(s.id)}>
              <Trash2 size={14} className="text-red-500" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
