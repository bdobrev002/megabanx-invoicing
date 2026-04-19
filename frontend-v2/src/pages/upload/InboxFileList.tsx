import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Inbox } from 'lucide-react'
import { filesApi } from '@/api/files.api'
import { useAuthStore } from '@/stores/authStore'
import type { InvoiceRecord } from '@/types/file.types'

export default function InboxFileList() {
  const profileId = useAuthStore((s) => s.user?.profile_id) ?? ''
  const [items, setItems] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) return
    filesApi
      .getInbox(profileId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [profileId])

  if (loading || items.length === 0) return null

  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Inbox size={18} className="text-orange-500" />
        Входяща кутия ({items.length})
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="flex flex-col gap-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {item.original_filename}
            </p>
            <p className="text-xs text-gray-500">{item.invoice_type || 'Неразпознат'}</p>
            <Badge variant="warning" className="self-start">Чака обработка</Badge>
          </Card>
        ))}
      </div>
    </div>
  )
}
