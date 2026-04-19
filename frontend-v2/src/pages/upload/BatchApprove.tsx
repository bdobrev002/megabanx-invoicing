import Button from '@/components/ui/Button'
import { CheckCircle } from 'lucide-react'
import type { InvoiceRecord } from '@/types/file.types'

interface Props {
  items: InvoiceRecord[]
  onApproveAll: () => void
  loading?: boolean
}

export default function BatchApprove({ items, onApproveAll, loading }: Props) {
  if (items.length === 0) return null

  return (
    <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
      <p className="text-sm text-green-800">
        {items.length} файла готови за одобрение
      </p>
      <Button size="sm" onClick={onApproveAll} loading={loading}>
        <CheckCircle size={14} className="mr-1" /> Одобри всички
      </Button>
    </div>
  )
}
