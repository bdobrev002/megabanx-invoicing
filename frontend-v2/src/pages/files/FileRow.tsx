import Badge from '@/components/ui/Badge'
import { FileText, Download, Trash2 } from 'lucide-react'
import type { InvoiceRecord } from '@/types/file.types'

interface Props {
  file: InvoiceRecord
  selected: boolean
  onSelect: () => void
  onDownload: () => void
  onDelete: () => void
}

export default function FileRow({ file, selected, onSelect, onDownload, onDelete }: Props) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
        selected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        className="h-4 w-4 rounded border-gray-300"
      />
      <FileText size={16} className="text-gray-400" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">
          {file.new_filename || file.original_filename}
        </p>
        <p className="text-xs text-gray-500">{file.invoice_type} &middot; {file.company_name}</p>
      </div>
      <Badge variant={file.status === 'processed' ? 'success' : 'warning'}>
        {file.status}
      </Badge>
      <button onClick={onDownload} className="p-1 text-gray-400 hover:text-indigo-600">
        <Download size={14} />
      </button>
      <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600">
        <Trash2 size={14} />
      </button>
    </div>
  )
}
