import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Pencil, Trash2, Share2, Building2 } from 'lucide-react'
import type { Company } from '@/types/company.types'
import ShareDialog from './ShareDialog'

interface Props {
  company: Company
  onEdit: () => void
  onDelete: () => void
}

export default function CompanyCard({ company, onEdit, onDelete }: Props) {
  const [showShare, setShowShare] = useState(false)

  return (
    <>
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-indigo-500" />
            <h3 className="font-semibold text-gray-900">{company.name}</h3>
          </div>
          <Badge variant="info">ЕИК {company.eik}</Badge>
        </div>

        {company.address && (
          <p className="text-sm text-gray-500">{company.address}</p>
        )}
        {company.mol && (
          <p className="text-sm text-gray-500">МОЛ: {company.mol}</p>
        )}
        {company.vat_number && (
          <p className="text-sm text-gray-500">ДДС: {company.vat_number}</p>
        )}

        <div className="mt-auto flex gap-2 border-t border-gray-100 pt-3">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil size={14} className="mr-1" /> Редакция
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowShare(true)}>
            <Share2 size={14} className="mr-1" /> Споделяне
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto text-red-500" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </Card>

      {showShare && (
        <ShareDialog
          companyId={company.id}
          companyName={company.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  )
}
