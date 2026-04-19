import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { Shield } from 'lucide-react'
import { verificationApi } from '@/api/verification.api'
import type { PendingVerification } from '@/types/verification.types'

export default function PendingVerifications() {
  const [items, setItems] = useState<PendingVerification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    verificationApi
      .getPending()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner size="sm" />
  if (items.length === 0) return null

  return (
    <div className="mt-8">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Shield size={18} className="text-yellow-500" />
        Чакащи верификации ({items.length})
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((v) => (
          <Card key={v.id} className="flex flex-col gap-2">
            <h3 className="font-medium text-gray-900">{v.company_name}</h3>
            <p className="text-xs text-gray-500">ЕИК: {v.eik}</p>
            <p className="text-xs text-gray-500">Код: {v.verification_code}</p>
            <Badge variant="warning">{v.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  )
}
