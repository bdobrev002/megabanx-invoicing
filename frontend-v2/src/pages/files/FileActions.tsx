import Button from '@/components/ui/Button'
import { Trash2 } from 'lucide-react'

interface Props {
  selectedCount: number
  onDelete: () => void
}

export default function FileActions({ selectedCount, onDelete }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">
        {selectedCount} избрани
      </span>
      <Button size="sm" variant="danger" onClick={onDelete}>
        <Trash2 size={14} className="mr-1" /> Изтрий
      </Button>
    </div>
  )
}
