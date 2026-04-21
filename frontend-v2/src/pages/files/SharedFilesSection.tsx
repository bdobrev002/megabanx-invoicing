import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Users, Folder } from 'lucide-react'
import type { SharedCompanyInfo } from '@/types/company.types'

interface Props {
  sharedCompanies: SharedCompanyInfo[]
}

export default function SharedFilesSection({ sharedCompanies }: Props) {
  if (sharedCompanies.length === 0) return null

  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <Users size={18} className="text-green-500" />
        Споделени файлове
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sharedCompanies.map((sc) => (
          <Card key={sc.share_id} className="flex items-center gap-3">
            <Folder size={16} className="text-green-500" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {sc.company.name}
              </p>
              <p className="text-xs text-gray-500">от {sc.owner_email}</p>
            </div>
            {sc.can_upload && <Badge variant="info">Качване</Badge>}
          </Card>
        ))}
      </div>
    </div>
  )
}
