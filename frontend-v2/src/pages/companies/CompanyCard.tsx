import { useState } from 'react'
import { Trash2, Share2 } from 'lucide-react'
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
      {/* Exact classes copied from original megabanx.com */}
      <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
        {/* Header: company name + action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-base text-gray-900">
            &ldquo;{company.name}&rdquo;
          </h3>
          <div className="flex flex-col items-start sm:items-end flex-shrink-0">
            <div className="flex flex-wrap items-center gap-1">
              <button
                className="px-2 md:px-3 py-1 text-xs md:text-sm border border-green-300 text-green-600 rounded-lg hover:bg-green-50 flex items-center gap-1"
                onClick={() => setShowShare(true)}
              >
                <Share2 size={14} />
                <span className="hidden sm:inline">Споделяне</span>
              </button>
              <button
                className="px-2 md:px-3 py-1 text-xs md:text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50"
                onClick={onEdit}
              >
                <span className="hidden sm:inline">Редактирай</span>
                <span className="sm:hidden">Ред.</span>
              </button>
              <button
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                onClick={onDelete}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Details — exact structure from original megabanx.com */}
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex flex-wrap gap-x-8">
            <div>
              <span className="text-gray-500">ЕИК: </span>
              <span className="font-bold text-gray-800">{company.eik}</span>
            </div>
            {company.vat_number && (
              <div>
                <span className="text-gray-500">ДДС: </span>
                {company.vat_number}
              </div>
            )}
          </div>
          {company.address && (
            <div>
              <span className="text-gray-500">Адрес: </span>
              {company.address.split('\n').map((line, i) => (
                <span key={i}>{i > 0 && <><br/><span className="inline-block w-12" /></>}{line}</span>
              ))}
            </div>
          )}
          {company.mol && (
            <div>
              <span className="text-gray-500">Управител/и: </span>
              <span className="text-gray-800">{company.mol}</span>
            </div>
          )}
          {company.partners && company.partners.length > 0 && (
            <div>
              <span className="text-gray-500">Съдружник/ци: </span>
              <span className="text-gray-800">{company.partners.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

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
