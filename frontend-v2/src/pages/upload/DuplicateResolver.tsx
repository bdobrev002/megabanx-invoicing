import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { AlertTriangle } from 'lucide-react'
import type { InvoiceRecord } from '@/types/file.types'

interface DuplicateGroup {
  original: InvoiceRecord
  duplicate: InvoiceRecord
}

interface Props {
  groups: DuplicateGroup[]
  onReplace: (originalId: string, duplicateId: string) => void
  onSkip: (duplicateId: string) => void
}

export default function DuplicateResolver({ groups, onReplace, onSkip }: Props) {
  if (groups.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-yellow-700">
        <AlertTriangle size={16} /> Открити дубликати ({groups.length})
      </h3>
      <div className="space-y-3">
        {groups.map((g) => (
          <Card key={g.duplicate.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {g.duplicate.original_filename}
              </p>
              <p className="text-xs text-gray-500">
                Съвпада с: {g.original.new_filename}
              </p>
              <Badge variant="warning" className="mt-1">Дубликат</Badge>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSkip(g.duplicate.id)}
              >
                Пропусни
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => onReplace(g.original.id, g.duplicate.id)}
              >
                Замени
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
