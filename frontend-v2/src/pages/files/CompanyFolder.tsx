import { useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { ChevronDown, ChevronRight, Folder } from 'lucide-react'

interface SubFolder {
  name: string
  file_count: number
}

interface Props {
  folder: { name: string; subfolders: SubFolder[] }
}

const typeLabels: Record<string, string> = {
  purchases: 'Покупки',
  sales: 'Продажби',
  proformas: 'Проформи',
  pending: 'Чакащи',
}

export default function CompanyFolder({ folder }: Props) {
  const [expanded, setExpanded] = useState(false)
  const totalFiles = folder.subfolders.reduce((sum, sf) => sum + sf.file_count, 0)

  return (
    <Card padding={false}>
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Folder size={16} className="text-indigo-500" />
        <span className="flex-1 font-medium text-gray-900">{folder.name}</span>
        <Badge variant="default">{totalFiles} файла</Badge>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-2">
          {folder.subfolders.map((sf) => (
            <div
              key={sf.name}
              className="flex items-center justify-between py-1.5 pl-8 text-sm"
            >
              <span className="text-gray-700">
                {typeLabels[sf.name] ?? sf.name}
              </span>
              <Badge variant={sf.file_count > 0 ? 'info' : 'default'}>
                {sf.file_count}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
