import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Pencil, Trash2, Share2 } from 'lucide-react'
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
      <Card className="p-4">
        {/* Header row: company name + action buttons */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">&ldquo;{company.name}&rdquo;</h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={() => setShowShare(true)}>
              <Share2 size={14} className="mr-1" /> Споделяне
            </Button>
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil size={14} className="mr-1" /> Редактирай
            </Button>
            <button onClick={onDelete} className="text-red-400 hover:text-red-600 p-1">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Details — full width, matching original megabanx.com layout */}
        <div className="space-y-1 text-sm text-gray-600">
          <p>
            <span className="font-medium">ЕИК: </span>
            <span className="font-bold">{company.eik}</span>
            {company.vat_number && (
              <>
                {'    '}
                <span className="font-medium">ДДС: </span>
                <span>{company.vat_number}</span>
              </>
            )}
          </p>
          {company.address && (
            <p>
              <span className="font-medium">Адрес: </span>
              {company.address}
            </p>
          )}
          {company.mol && (
            <p>
              <span className="font-medium">Управител/и: </span>
              <span className="font-bold uppercase">{company.mol}</span>
            </p>
          )}
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
